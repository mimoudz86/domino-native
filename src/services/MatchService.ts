import type { IMatchStorage, GameResult, MatchState, ScoringMode } from './IMatchStorage';
import { GameCoreLogic } from '../core/GameCoreLogic';
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

      // Mode nouveau: utiliser recordToGame qui s'occupe de tout
      this.gameIndex++;
      await this.storage.recordToGame(payload, this.matchId, setId, this.gameIndex, activeMatch.config);

      // Construire gameId pour fetcher les données
      const gameId = `LOCAL_G_${setId}_${this.gameIndex}`;

      // Enregistrer le set (scores + gagnant) - appelé pour chaque game
      await this.storage.recordToSet(this.matchId, activeMatch.currentSet);

      // Fetcher les données du game sauvegardé, du set, et du match (APRÈS recordToSet pour avoir les scores à jour)
      const { game: gameData, set: setData, match: matchData } = await this.storage.getGameWithSetAndMatch(gameId) || {};

      // Émettre l'événement GAME_SAVED avec le gameId et les données pour que le frontend puisse les afficher
      console.log(`LOG  [MATCH-SERVICE] 📤 GAME_SAVED {"gameId":"${gameId}"}`);
      await globalEventEmitter.emit('GAME_SAVED', { gameId, matchId: this.matchId, gameData, setData, matchData });

      // Récupérer tous les games pour plus tard
      const allGames = await this.storage.getGamesForMatch(this.matchId);

      let matchFinished = false;
      let currentSetForServer = activeMatch.currentSet;

      // Vérifier si set est fini
      const updatedSetData = setData;
      const setFinished = updatedSetData?.set_finished === 1;
      const isLastSet = activeMatch.currentSet >= activeMatch.config.numSets;

      console.log(`LOG  [MATCH-SERVICE] 🔍 SET_FINISHED_CHECK {"setFinished":${setFinished},"currentSet":${activeMatch.currentSet},"numSets":${activeMatch.config.numSets},"isLastSet":${isLastSet}}`);

      // LOGIQUE: Si le set est fini
      if (setFinished) {
        console.log(`LOG  [MATCH-SERVICE] 🎯 SET_FINISHED {"currentSet":${activeMatch.currentSet}}`);

        // Vérifier si tous les sets du match sont finis
        const numSetsFinished = await this.storage.countFinishedSets(this.matchId);
        const allSetsFini = numSetsFinished >= activeMatch.config.numSets;

        console.log(`LOG  [MATCH-SERVICE] 📊 SETS_FINISHED_COUNT {"numSetsFinished":${numSetsFinished},"numSets":${activeMatch.config.numSets},"allSetsFini":${allSetsFini}}`);

        if (allSetsFini) {
          // Tous les sets sont finis → match est fini
          matchFinished = true;
          console.log(`LOG  [MATCH-SERVICE] 🏆 MATCH_IS_FINISHED {"matchId":"${this.matchId}"}`);

          const winner = GameCoreLogic.getMatchWinner(allGames, activeMatch.config.mode, activeMatch.config.maxPoints);
          await this.storage.recordToMatch(this.matchId, allGames, activeMatch.config);

          // Émettre événement
          console.log(`LOG  [MATCH-SERVICE] 📢 EMITTING_MATCH_COMPLETED {"matchId":"${this.matchId}"}`);
          await globalEventEmitter.emit('MATCH_COMPLETED', {
            matchId: this.matchId,
            winner,
            config: activeMatch.config
          });
        } else if (!isLastSet) {
          // Set fini mais pas le dernier → passer au set suivant
          console.log(`LOG  [MATCH-SERVICE] 🔄 MOVING_TO_NEXT_SET {"currentSet":${activeMatch.currentSet}}`);
          await this.storage.nextSet(this.matchId);
          const updatedMatch = await this.storage.getActiveMatch(this.matchId);
          currentSetForServer = updatedMatch?.currentSet || activeMatch.currentSet;
          console.log(`LOG  [MATCH-SERVICE] 📈 SET_TRANSITION_DONE {"previousSet":${activeMatch.currentSet},"newSet":${currentSetForServer}}`);
        }
      } else {
        console.log(`LOG  [MATCH-SERVICE] ⏸️  SET_NOT_FINISHED_YET {"currentSet":${activeMatch.currentSet}}`);
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
