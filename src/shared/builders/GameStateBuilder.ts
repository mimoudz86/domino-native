import type { PlayerTurnState, BoardState } from '../models/GameTurnState';
import type { GameEndedPayload } from '../../controllers/LocalGameEvent';

export class GameStateBuilder {
  constructor(private engine: any) {}

  // ═══════════════════════════════════════════════════════════════
  // ÉLÉMENTS DE BASE (briques de construction)
  // ═══════════════════════════════════════════════════════════════

  buildBoardState(): BoardState {
    return this.engine.buildBoardState();
  }

  buildPlayersArray(currentPlayerIndex?: number): PlayerTurnState[] {
    return this.engine.buildPlayersArray(currentPlayerIndex);
  }

  // ═══════════════════════════════════════════════════════════════
  // ÉTATS COMPLETS
  // ═══════════════════════════════════════════════════════════════

  buildStartGame(): { turnNumber: number; currentPlayerIndex: number; players: PlayerTurnState[]; board: BoardState } {
    const players = this.buildPlayersArray(this.engine.currentPlayerIndex);
    const board = this.buildBoardState();

    const state = {
      turnNumber: this.engine.turnNumber,
      currentPlayerIndex: this.engine.currentPlayerIndex,
      players,
      board
    };

    console.log(`LOG  [GAME-ENGINE] 🚀 GAME_STARTED {"players":${players.length},"startingPlayer":"${this.engine.getPlayers()[this.engine.currentPlayerIndex]?.name}"}`);

    return state;
  }

  buildPlayerTurnState(playerIndex: number): any {
    return this.engine.buildPlayerTurnState(playerIndex);
  }

  buildEndGame(): GameEndedPayload {
    const winner = this.engine.getWinner();

    const endGamePayload: GameEndedPayload = {
      winner: {
        id: winner?.id || 0,
        name: winner?.name || ''
      },
      winningType: this.engine.winningType,
      rawScores: this.engine.getRawScores()
    };

    console.log(`LOG  [GAME-ENGINE] 🏆 GAME_ENDED {"winner":"${winner?.name}","winnerId":${winner?.id},"scores":${JSON.stringify(this.engine.getPlayers().map((p: any) => ({name: p.name, score: p.score})))},"totalTurnsPlayed":${this.engine.turnNumber}}`);

    return endGamePayload;
  }
}
