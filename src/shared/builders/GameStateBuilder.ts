import type { PlayerTurnState, BoardState } from '../models/GameTurnState';
import type { GameEndedPayload } from '../../controllers/LocalGameEvent';
import type { IGameEngine } from '../models/IGameEngine';
import { globalEventEmitter } from '../../core/EventEmitter';

export class GameStateBuilder {
  constructor(private engine: IGameEngine) {}

  // ═══════════════════════════════════════════════════════════════
  // ÉLÉMENTS DE BASE (briques de construction)
  // ═══════════════════════════════════════════════════════════════

  buildBoardState(): BoardState {
    return {
      trainSequence: this.engine.trainSequence,
      trainOnBoard: this.engine.board.playedDominos.map((domino: any) => ({
        domino,
        line: undefined
      }))
    };
  }

  buildPlayersArray(currentPlayerIndex?: number): PlayerTurnState[] {
    return this.engine.players.map((p: any) => ({
      id: p.id,
      name: p.name,
      dominos: Array(p.dominos.length).fill(null),
      dominoCount: p.dominos.length,
      playables: [],
      placements: [],
      hasPassed: p.hasPassed,
      canPlay: false
    }));
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

  buildLocalPlayerState(playerIndex: number): any {
    const player = this.engine.players[playerIndex];
    const playableResult = this.engine.board.getPlayableDominos(player.dominos);

    const playables = playableResult.playable
      .map(([d]: any) => player.dominos.findIndex((h: any) => h.left === d.left && h.right === d.right))
      .filter((idx: number) => idx !== -1);

    const placements = playableResult.playable.map(([d, sides]: any) => {
      if (sides.length === 2) return 'both' as const;
      return sides[0] === 'left' ? ('left' as const) : ('right' as const);
    });

    const boardState = this.buildBoardState();
    const players = this.buildPlayersArray(playerIndex);
    const opponents = players.filter((p: any) => p.id !== playerIndex);

    return {
      turnNumber: this.engine.turnNumber,
      yourIndex: playerIndex,
      yourName: player.name,
      yourDominos: player.dominos,
      playables,
      placements,
      canPlay: player.canPlay(this.engine.board),
      board: boardState,
      opponents,
      players,
      lastPlayerWhoPassedId: this.engine.lastPlayerWhoPassedId ?? undefined
    };
  }

  buildLocalBroadcastState(): any {
    const nextPlayerIndex = (this.engine.currentPlayerIndex + 1) % this.engine.players.length;
    const boardState = this.buildBoardState();
    const players = this.buildPlayersArray(nextPlayerIndex);

    return {
      turnNumber: this.engine.turnNumber,
      nextPlayerIndex,
      board: boardState,
      players,
      lastPlayerWhoPassedId: this.engine.lastPlayerWhoPassedId ?? undefined
    };
  }

  buildCurrentState(): any {
    const current = this.engine.players[this.engine.currentPlayerIndex];
    const playableResult = this.engine.board.getPlayableDominos(current.dominos);

    const playables = playableResult.playable
      .map(([d]: any) => current.dominos.findIndex((h: any) => h.left === d.left && h.right === d.right))
      .filter((idx: number) => idx !== -1);

    const placements = playableResult.playable.map(([d, sides]: any) => {
      if (sides.length === 2) return 'both' as const;
      return sides[0] === 'left' ? ('left' as const) : ('right' as const);
    });

    const currentPlayerHand: any = {
      id: current.id,
      name: current.name,
      dominoCount: current.dominos.length,
      hasPassed: current.hasPassed,
      dominos: current.dominos,
      playables,
      placements,
      canPlay: current.canPlay(this.engine.board)
    };

    const trainOnBoard = this.engine.board.playedDominos.map((domino: any) => ({
      domino,
      line: undefined as any
    }));

    return {
      turnNumber: this.engine.turnNumber,
      currentPlayerIndex: this.engine.currentPlayerIndex,
      currentPlayerName: current.name,
      phase: this.engine.isOver ? 'ENDED' : this.engine.lastAction === 'passed' ? 'PASSED' : this.engine.lastAction === 'played' ? 'PLACED' : 'STARTED',

      board: {
        trainSequence: this.engine.trainSequence,
        trainOnBoard: trainOnBoard
      },

      players: this.engine.players.map((p: any) => ({
        id: p.id,
        name: p.name,
        dominoCount: p.dominos.length,
        hasPassed: p.hasPassed,
        dominos: p.dominos,
        playables: p.id === current.id ? currentPlayerHand.playables : [],
        placements: p.id === current.id ? currentPlayerHand.placements : [],
        canPlay: p.id === current.id ? currentPlayerHand.canPlay : false
      })),

      playerState: {
        id: current.id,
        playables: currentPlayerHand.playables,
        canPlay: currentPlayerHand.canPlay
      },

      consecutivePasses: this.engine.consecutivePasses,
      gameEnded: this.engine.isOver,
      winner: this.engine.isOver ? this.engine.currentPlayerIndex : undefined,
      lastPlayerWhoPassedId: this.engine.lastPlayerWhoPassedId ?? undefined,

      endData: this.engine.isOver && this.engine.winner ? {
        winner: {
          id: this.engine.winner.id,
          name: this.engine.winner.name
        },
        scores: this.engine.players.map((p: any) => ({
          playerId: p.id,
          playerName: p.name,
          score: p.score
        }))
      } : undefined
    };
  }

  buildEndGame(): GameEndedPayload {
    const winner = this.engine.getWinner();
    const rawScores = {
      p0: this.engine.players[0].getRemainingPips(),
      p1: this.engine.players[1].getRemainingPips(),
      p2: this.engine.players[2].getRemainingPips(),
      p3: this.engine.players[3].getRemainingPips()
    };

    const endGamePayload: GameEndedPayload = {
      winner: {
        id: winner?.id || 0,
        name: winner?.name || ''
      },
      winningType: this.engine.winningType ?? 'EMPTY_HAND',
      rawScores
    };

    console.log(`LOG  [GAME-ENGINE] 🏆 GAME_ENDED {"winner":"${winner?.name}","winnerId":${winner?.id},"scores":${JSON.stringify(this.engine.getPlayers().map((p: any) => ({name: p.name, score: p.score})))},"totalTurnsPlayed":${this.engine.turnNumber}}`);

    globalEventEmitter.emit('GAME_ENDED', endGamePayload);

    return endGamePayload;
  }
}
