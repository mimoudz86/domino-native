import type { GameResult, MatchState, ScoringMode } from '../controllers/MatchManager';
import type { IMatchStorage } from './IMatchStorage';
import type { RawGame } from '../shared/scoring/scoreCalculator';
import { isMatchFinished, getMatchWinner } from '../shared/scoring/scoreCalculator';
import { globalEventEmitter } from '../core/EventEmitter';

export class MatchService {
  private matchId: string;
  private gameIndex: number = 0;
  private serverUrl = 'http://192.168.1.151:3000'; // Backend server

  constructor(private storage: IMatchStorage, matchId: string, startGameIndex: number = 0) {
    this.matchId = matchId;
    this.gameIndex = startGameIndex;
    console.log(`LOG  [MATCH-SERVICE] 🚀 INITIALIZED {"matchId":"${matchId}","startGameIndex":${startGameIndex}}`);
    this.setupListeners();
  }

  private setupListeners(): void {
    console.log(`LOG  [MATCH-SERVICE] 👂 LISTENER_SETUP for GAME_ENDED`);
    globalEventEmitter.on('GAME_ENDED', async (payload) => {
      console.log(`LOG  [MATCH-SERVICE] 📍 GAME_ENDED_RECEIVED {"player":"${payload.winner?.name}","winningType":"${payload.winningType}"}`);
      await this.recordGameResult(payload);
    });
  }

  async recordGameResult(payload: any): Promise<void> {
    try {
      // Vérifier que matchId existe (le mode legacy est désactivé)
      if (!this.matchId) {
        throw new Error('[MATCH-SERVICE] matchId is required. Call startNewMatch() before initGame().');
      }

      // Obtenir la config et le currentSetNumber AVANT d'enregistrer le game
      const activeMatch = await this.storage.getActiveMatch();
      if (!activeMatch) throw new Error('Match not found');
      const currentSetNumber = (await this.storage.getMatchStateById(this.matchId))?.currentSetNumber || 1;

      // Mode nouveau: utiliser rawScores
      this.gameIndex++;
      const gameId = `LOCAL_G_${this.matchId}_${this.gameIndex}`;

      // Construire RawGame from payload
      const rawGame: RawGame = {
        p0_score: payload.rawScores.p0,
        p1_score: payload.rawScores.p1,
        p2_score: payload.rawScores.p2,
        p3_score: payload.rawScores.p3,
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
        set_number: currentSetNumber
      };

      // Sauvegarder le game avec set_number
      await this.storage.saveGame(gameId, this.matchId, this.gameIndex, rawGame, currentSetNumber);

      // Envoyer au serveur de validation (optionnel, ne bloque pas)
      await this.sendGameToServer(rawGame, gameId);

      // Récupérer SEULEMENT les games du set actuel pour vérifier si le set est terminé
      const allGames = await this.storage.getGamesForMatch(this.matchId);
      const currentSetGames = allGames.filter(g => (g.set_number || 1) === currentSetNumber);

      // Vérifier si le set actuel est fini (basé SEULEMENT sur les games du set)
      const setFinished = isMatchFinished(currentSetGames, activeMatch.config.mode, activeMatch.config.maxPoints);
      const isLastSet = currentSetNumber >= activeMatch.config.numSets;

      if (setFinished) {
        if (isLastSet) {
          const winner = getMatchWinner(currentSetGames, activeMatch.config.mode, activeMatch.config.maxPoints);
          await this.storage.finishMatch(this.matchId, winner);
          console.log(`LOG  [MATCH-SERVICE] 🏆 MATCH_FINISHED {"winner":${JSON.stringify(winner)}}`);
        } else {
          await this.storage.nextSet(this.matchId);
          console.log(`LOG  [MATCH-SERVICE] 📈 SET_COMPLETED {"currentSet":${currentSetNumber},"nextSet":${currentSetNumber + 1}}`);
        }
      }

      console.log(`LOG  [MATCH-SERVICE] ✅ GAME_RECORDED {"gameId":"${gameId}","gameIndex":${this.gameIndex},"setFinished":${setFinished},"isLastSet":${isLastSet}}`)

      // Envoyer la mise à jour du match au serveur
      await this.sendMatchUpdateToServer(activeMatch.config, allGames.length, currentSetNumber, setFinished && isLastSet);

      // Émettre l'événement de mise à jour
      const updatedMatchState = await this.storage.getMatchState();
      await globalEventEmitter.emit('MATCH_UPDATED', updatedMatchState);
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

  async getFullMatchData(): Promise<any> {
    const matchState = await this.storage.getMatchState();
    const games = await this.storage.getAllGames();

    return {
      matchState: {
        mode: matchState.mode,
        maxPoints: matchState.maxPoints,
        scoreIndividual: matchState.scoreIndividual,
        scoreTeams: matchState.scoreTeams,
        matchFinished: matchState.matchFinished,
        winner: matchState.winner,
        currentGameNumber: matchState.currentGameNumber,
      },
      games: games.map(g => ({
        gameNumber: g.gameNumber,
        winnerId: g.winnerId,
        winnerName: g.winnerName,
        winningType: g.winningType,
        individual: g.individual,
        timestamp: new Date(g.timestamp).toISOString(),
      })),
      summary: {
        totalGames: games.length,
        matchWinner: matchState.winner,
        matchFinished: matchState.matchFinished,
        finalScores: matchState.scoreIndividual,
      }
    };
  }

  async resetMatch(mode: ScoringMode): Promise<void> {
    await this.storage.reset(mode);
    const matchState = await this.storage.getMatchState();
    await globalEventEmitter.emit('MATCH_RESET', matchState);
  }

  async debugLogAllData(): Promise<void> {
    const data = await this.getFullMatchData();
    console.log(`LOG  [MATCH-SERVICE] 🔍 DEBUG_FULL_DATA ${JSON.stringify(data, null, 2)}`);
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

  private async sendGameToServer(rawGame: RawGame, gameId: string): Promise<void> {
    try {
      console.log(`[MATCH-SERVICE] 🔵 ENTERING_SEND_GAME_TO_SERVER gameId=${gameId}`);
      console.log(`[MATCH-SERVICE] 🔵 SERVER_URL=${this.serverUrl}`);
      const payload = {
        game_id: gameId,
        match_id: this.matchId,
        ...rawGame
      };
      console.log(`[MATCH-SERVICE] 🔵 PAYLOAD_CREATED, making fetch call to ${this.serverUrl}/api/games`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.serverUrl}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[MATCH-SERVICE] Server responded with ${response.status}`);
        return;
      }

      const data = await response.json();
      console.log(`LOG  [MATCH-SERVICE] 📤 SENT_TO_SERVER {"gameId":"${gameId}","serverResponse":"${data.message}"}`);
    } catch (error) {
      console.warn('[MATCH-SERVICE] Could not reach server (this is ok for testing):', error);
    }
  }

  private async sendMatchUpdateToServer(config: any, gamesCount: number, currentSet: number, matchFinished: boolean): Promise<void> {
    try {
      // Récupérer les scores actuels
      const games = await this.storage.getGamesForMatch(this.matchId);
      const scores = config.mode === 'individual'
        ? Object.entries(await this.storage.getMatchScore(this.matchId, config.mode) || {})
          .reduce((acc: any, [pid, score]: any) => ({ ...acc, [pid]: score }), {})
        : await this.storage.getMatchScore(this.matchId, config.mode);

      const payload = {
        match_id: this.matchId,
        mode: config.mode,
        max_points: config.maxPoints,
        num_sets: config.numSets,
        current_set: currentSet,
        games_count: gamesCount,
        match_finished: matchFinished ? 1 : 0,
        scores: scores || {},
        updated_at: new Date().toISOString()
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.serverUrl}/api/matches/${this.matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[MATCH-SERVICE] Match update failed with ${response.status}`);
        return;
      }

      console.log(`LOG  [MATCH-SERVICE] 📤 MATCH_UPDATED_ON_SERVER {"matchId":"${this.matchId}","current_set":${currentSet},"games_count":${gamesCount}}`);
    } catch (error) {
      console.warn('[MATCH-SERVICE] Could not reach server for match update:', error);
    }
  }
}
