import type { GameResult, MatchState, ScoringMode } from '../controllers/MatchManager';
import type { IMatchStorage } from './IMatchStorage';
import type { RawGame } from '../shared/scoring/scoreCalculator';
import { isSetFinished, isMatchFinished, getMatchWinner, calcIndividualScores, calcTeamScores } from '../shared/scoring/scoreCalculator';
import { globalEventEmitter } from '../core/EventEmitter';

export class MatchService {
  private matchId: string;
  private gameIndex: number = 0;
  private gameEndedListener: ((payload: any) => Promise<void>) | null = null;

  constructor(private storage: IMatchStorage, matchId: string, startGameIndex: number = 0) {
    this.matchId = matchId;
    this.gameIndex = startGameIndex;
    console.log(`LOG  [MATCH-SERVICE] 🚀 INITIALIZED {"matchId":"${matchId}","startGameIndex":${startGameIndex}}`);
    this.setupListeners();
  }

  private setupListeners(): void {
    this.gameEndedListener = async (payload: any) => {
      await this.recordGameResult(payload);
    };
    globalEventEmitter.on('GAME_ENDED', this.gameEndedListener);
  }

  cleanup(): void {
    if (this.gameEndedListener) {
      console.log(`LOG  [MATCH-SERVICE] 🧹 CLEANUP - removing GAME_ENDED listener`);
      globalEventEmitter.off('GAME_ENDED', this.gameEndedListener);
      this.gameEndedListener = null;
    }
  }

  resetGameIndex(newGameIndex: number): void {
    this.gameIndex = newGameIndex;
    console.log(`LOG  [MATCH-SERVICE] 🔄 RESET_GAME_INDEX {"newGameIndex":${newGameIndex}}`);
  }

  async recordGameResult(payload: any): Promise<void> {
    try {
      // Vérifier que matchId existe (le mode legacy est désactivé)
      if (!this.matchId) {
        throw new Error('[MATCH-SERVICE] matchId is required. Call startNewMatch() before initGame().');
      }

      // Obtenir le match actif et le setId
      const activeMatch = await this.storage.getActiveMatch();
      if (!activeMatch) throw new Error('Match not found');

      // ⚠️ VÉRIFIER SI C'EST LE BON MATCH
      const matchIdMismatch = activeMatch.matchId !== this.matchId;
      console.log(`LOG  [MATCH-SERVICE] 🔎 ACTIVE_MATCH_STATE {"expectedMatchId":"${this.matchId}","returnedMatchId":"${activeMatch.matchId}","MISMATCH":${matchIdMismatch},"currentSet":${activeMatch.currentSet},"numSets":${activeMatch.config.numSets}}`);

      const setId = await this.storage.getActiveSetId(this.matchId);
      if (!setId) throw new Error('Active set not found');

      // Mode nouveau: utiliser rawScores
      this.gameIndex++;
      const gameId = `LOCAL_G_${setId}_${this.gameIndex}`;

      // Construire RawGame from payload
      const rawGame: RawGame = {
        p0_pips_remaining: payload.rawScores.p0,
        p1_pips_remaining: payload.rawScores.p1,
        p2_pips_remaining: payload.rawScores.p2,
        p3_pips_remaining: payload.rawScores.p3,
        p0_name: payload.gameEnd?.individual?.players?.[0]?.name || 'Player 0',
        p1_name: payload.gameEnd?.individual?.players?.[1]?.name || 'Player 1',
        p2_name: payload.gameEnd?.individual?.players?.[2]?.name || 'Player 2',
        p3_name: payload.gameEnd?.individual?.players?.[3]?.name || 'Player 3',
        p0_type: 'human', // TODO: from config
        p1_type: 'human',
        p2_type: 'human',
        p3_type: 'human',
        winner_id: payload.winner.id,
        winner_name: payload.winner.name,
        winning_type: payload.winningType,
        set_number: activeMatch.currentSet
      };

      // Valider que les rawScores ne sont pas vides
      const totalPips = rawGame.p0_pips_remaining + rawGame.p1_pips_remaining + rawGame.p2_pips_remaining + rawGame.p3_pips_remaining;
      if (totalPips === 0) {
        console.warn(`LOG  [MATCH-SERVICE] ⚠️ WARNING: All remaining pips are 0 - game may be invalid`);
      }

      // Calculer les points gagnés (UNE SEULE FOIS ici - selon le mode)
      let earnedPoints: any;
      if (activeMatch.config.mode === 'individual') {
        earnedPoints = calcIndividualScores([rawGame]);
        console.log(`LOG  [MATCH-SERVICE] 🎯 EARNED_POINTS_INDIVIDUAL {"p0":${earnedPoints[0] || 0},"p1":${earnedPoints[1] || 0},"p2":${earnedPoints[2] || 0},"p3":${earnedPoints[3] || 0}}`);
      } else {
        const teamScores = calcTeamScores([rawGame]);
        earnedPoints = teamScores;
        console.log(`LOG  [MATCH-SERVICE] 🎯 EARNED_POINTS_TEAMS {"teamV":${earnedPoints.teamV},"teamH":${earnedPoints.teamH}}`);
      }

      // Sauvegarder le game avec pips restants ET points gagnés
      await this.storage.saveGame(gameId, this.matchId, this.gameIndex, rawGame, setId, earnedPoints);

      // Fetcher les données du game sauvegardé et du set
      const { game: gameData, set: setData } = await this.storage.getGameWithSetAndMatch(gameId) || {};

      // Émettre l'événement GAME_SAVED avec le gameId et les données pour que le frontend puisse les afficher
      console.log(`LOG  [MATCH-SERVICE] 📤 GAME_SAVED {"gameId":"${gameId}"}`);
      await globalEventEmitter.emit('GAME_SAVED', { gameId, matchId: this.matchId, gameData, setData });

      // Mettre à jour les totaux de points du match
      await this.storage.updateMatchScoreTotals(this.matchId, activeMatch.config.mode);

      // Récupérer SEULEMENT les games du set actuel pour vérifier si le set est terminé
      const allGames = await this.storage.getGamesForMatch(this.matchId);
      const currentSetGames = allGames.filter(g => (g.set_number || 1) === activeMatch.currentSet);

      // Vérifier si le set actuel est fini (basé SEULEMENT sur les games du set)
      const setFinished = isSetFinished(currentSetGames, activeMatch.config.mode, activeMatch.config.maxPoints);
      const isLastSet = activeMatch.currentSet >= activeMatch.config.numSets;

      console.log(`LOG  [MATCH-SERVICE] 🔍 SET_FINISHED_CHECK {"setFinished":${setFinished},"currentSet":${activeMatch.currentSet},"numSets":${activeMatch.config.numSets},"isLastSet":${isLastSet},"gamesInSet":${currentSetGames.length}}`);
      console.log(`LOG  [MATCH-SERVICE] 📐 IS_LAST_SET_CALC {"formula":"${activeMatch.currentSet} >= ${activeMatch.config.numSets}","result":${isLastSet}}`);

      let matchFinished = false;
      let currentSetForServer = activeMatch.currentSet;

      // LOGIQUE: Vérifier si le set courant est fini
      if (setFinished) {
        console.log(`LOG  [MATCH-SERVICE] 🎯 SET_FINISHED {"currentSet":${activeMatch.currentSet}}`);

        // Marquer le set comme fini dans la DB
        await this.storage.finishSet(activeMatch.currentSet, this.matchId);

        if (isLastSet) {
          // Dernier set fini → vérifier si match est fini
          console.log(`LOG  [MATCH-SERVICE] 🌟 LAST_SET_FINISHED {"currentSet":${activeMatch.currentSet}}`);
          const numSetsFinished = await this.storage.countFinishedSets(this.matchId);
          matchFinished = isMatchFinished(numSetsFinished, activeMatch.config.numSets);
          console.log(`LOG  [MATCH-SERVICE] 📊 MATCH_FINISHED_CHECK {"numSetsFinished":${numSetsFinished},"numSets":${activeMatch.config.numSets},"matchFinished":${matchFinished}}`);

          if (matchFinished) {
            const winner = getMatchWinner(allGames, activeMatch.config.mode, activeMatch.config.maxPoints);
            await this.storage.finishMatch(this.matchId, winner);
            console.log(`LOG  [MATCH-SERVICE] 🏆 MATCH_FINISHED {"winner":${JSON.stringify(winner)}}`);

            // Émettre événement pour que le store crée automatiquement un nouveau match
            console.log(`LOG  [MATCH-SERVICE] 📢 EMITTING_MATCH_COMPLETED {"matchId":"${this.matchId}"}`);
            await globalEventEmitter.emit('MATCH_COMPLETED', {
              matchId: this.matchId,
              winner,
              config: activeMatch.config
            });
          }
        } else {
          // Set intermédiaire fini → passer au suivant
          console.log(`LOG  [MATCH-SERVICE] 🔄 INTERMEDIATE_SET_FINISHED_TRANSITIONING {"currentSet":${activeMatch.currentSet}}`);
          await this.storage.nextSet(this.matchId);
          // Récupérer le nouveau currentSet après activation du set suivant
          const updatedMatch = await this.storage.getActiveMatch(this.matchId);
          currentSetForServer = updatedMatch?.currentSet || activeMatch.currentSet;
          console.log(`LOG  [MATCH-SERVICE] 📈 SET_TRANSITION_DONE {"previousSet":${activeMatch.currentSet},"newSet":${currentSetForServer}}`);
        }
      } else {
        console.log(`LOG  [MATCH-SERVICE] ⏸️  SET_NOT_FINISHED_YET {"currentSet":${activeMatch.currentSet},"gamesInSet":${currentSetGames.length}}`);
      }

      console.log(`LOG  [MATCH-SERVICE] ✅ GAME_RECORDED {"gameId":"${gameId}","gameIndex":${this.gameIndex},"setFinished":${setFinished},"matchFinished":${matchFinished}}`)

      // Émettre l'événement de mise à jour avec gameId
      const updatedMatchState = await this.storage.getMatchState();
      console.log(`LOG  [MATCH-SERVICE] 📢 EMITTING_MATCH_UPDATED {"matchId":"${this.matchId}","gameId":"${gameId}"}`);
      await globalEventEmitter.emit('MATCH_UPDATED', { ...updatedMatchState, gameId });
    } catch (error) {
      console.error('[MATCH-SERVICE] Error recording game:', error);
    }
  }

  async getMatchState(): Promise<MatchState> {
    return this.storage.getMatchState();
  }

  async getAllGames(): Promise<GameResult[]> {
    return this.storage.getAllGames();
  }

  async resetMatch(mode: ScoringMode): Promise<void> {
    await this.storage.reset(mode);
    const matchState = await this.storage.getMatchState();
    await globalEventEmitter.emit('MATCH_RESET', matchState);
  }

  async exportDatabase(): Promise<string> {
    try {
      const matchId = this.matchId || 'LEGACY_MATCH';
      const games = await this.storage.getGamesForMatch(matchId);
      const data = {
        matchId,
        gamesCount: games.length,
        games,
        timestamp: new Date().toISOString()
      };

      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('[MATCH-SERVICE] Error exporting database:', error);
      return '{}';
    }
  }


}
