import type { PlayerTurnState, BoardState } from '../models/GameTurnState';
import type { PlayTurnPayload, GameEndedPayload } from '../../controllers/LocalGameEvent';

export class GameStateBuilder {
  constructor(private engine: any) {}

  buildStartGame(): { turnNumber: number; currentPlayerIndex: number; players: PlayerTurnState[]; board: BoardState } {
    const players = this.engine.buildPlayersArray(this.engine.currentPlayerIndex);

    const state = {
      turnNumber: this.engine.turnNumber,
      currentPlayerIndex: this.engine.currentPlayerIndex,
      players,
      board: this.engine.buildBoardState()
    };

    console.log(`LOG  [GAME-ENGINE] 🚀 GAME_STARTED {"players":${players.length},"startingPlayer":"${this.engine.getPlayers()[this.engine.currentPlayerIndex]?.name}"}`);

    return state;
  }

  buildPlayTurn(playerIndex: number): PlayTurnPayload {
    return this.engine.getPlayTurnState(playerIndex);
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

