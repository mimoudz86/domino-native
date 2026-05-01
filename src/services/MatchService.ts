import type { GameResult, MatchState, ScoringMode } from '../controllers/MatchManager';
import type { IMatchStorage } from './IMatchStorage';
import { globalEventEmitter } from '../core/EventEmitter';

export class MatchService {
  constructor(private storage: IMatchStorage) {
    console.log(`LOG  [MATCH-SERVICE] 🚀 INITIALIZED`);
    this.setupListeners();
  }

  private setupListeners(): void {
    console.log(`LOG  [MATCH-SERVICE] 👂 LISTENER_SETUP for GAME_ENDED`);
    // Écouter l'événement GAME_ENDED du GameEngine
    globalEventEmitter.on('GAME_ENDED', async (payload) => {
      console.log(`LOG  [MATCH-SERVICE] 📍 GAME_ENDED_RECEIVED {"player":"${payload.winner?.name}","winningType":"${payload.winningType}"}`);

      await this.recordGameResult(payload);
    });
  }

  async recordGameResult(payload: any): Promise<void> {
    try {
      // Récupérer les jeux existants pour calculer le numéro du jeu
      const existingGames = await this.storage.getAllGames();
      const gameNumber = existingGames.length + 1;

      // Créer l'objet GameResult
      const gameResult: GameResult = {
        gameNumber,
        winnerId: payload.winner.id,
        winnerName: payload.winner.name,
        winningType: payload.winningType,
        individual: payload.gameEnd?.individual,
        teams: payload.gameEnd?.teams,
        timestamp: Date.now(),
      };

      // Persister le game
      await this.storage.saveGame(gameResult);

      // Récupérer l'état mis à jour
      const matchState = await this.storage.getMatchState();

      // Log détaillé de l'état du match
      console.log(`LOG  [MATCH-SERVICE] 📊 MATCH_STATE_UPDATED ${JSON.stringify({
        gameNumber: gameResult.gameNumber,
        matchFinished: matchState.matchFinished,
        scoreIndividual: matchState.scoreIndividual,
        currentGameNumber: matchState.currentGameNumber,
        winner: matchState.winner,
        games: matchState.games.length
      })}`);

      // Émettre l'événement de mise à jour
      await globalEventEmitter.emit('MATCH_UPDATED', matchState);

      console.log(`LOG  [MATCH-SERVICE] ✅ GAME_RECORDED {"gameNumber":${gameResult.gameNumber},"matchFinished":${matchState.matchFinished}}`);
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
}
