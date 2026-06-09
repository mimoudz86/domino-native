import type { PlayerDatas, PlayerTurnState, BoardState } from '../controllers/localGameEvents';
import type { GameEndedPayload } from '../controllers/localGameEvents';

export class GameStateBuilder {
  constructor(private engine: any) {}

  // ═══════════════════════════════════════════════════════════════
  // ÉLÉMENTS DE BASE (briques de construction)
  // ═══════════════════════════════════════════════════════════════

  buildBoardState(): BoardState {
    return {
      trainSequence: this.engine.trainSequence,
      trainOnBoard: this.engine.board.playedDominos.map((domino: any) => ({
        domino
      }))
    };
  }

  buildPlayersArray(currentPlayerId?: number): PlayerTurnState[] {
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

  buildPlayersDatas(isAI: boolean = false): PlayerDatas[] {
    return this.engine.players.map((p: any) => ({
      id: p.id,
      name: p.name,
      isAI,
      dominos: p.dominos,
      dominoCount: p.dominos.length,
      hasPassed: p.hasPassed
    }));
  }

  // ═══════════════════════════════════════════════════════════════
  // ÉTATS COMPLETS
  // ═══════════════════════════════════════════════════════════════

  buildStartGame(): { turnNumber: number; currentPlayerId: number; players: PlayerDatas[]; board: BoardState } {
    const players = this.buildPlayersDatas(false);
    const board = this.buildBoardState();

    const state = {
      turnNumber: this.engine.turnNumber,
      currentPlayerId: this.engine.currentPlayerId,
      players,
      board
    };

    console.log(`LOG  [GAME-ENGINE] 🚀 GAME_STARTED {"players":${players.length},"startingPlayer":"${this.engine.getPlayers()[this.engine.currentPlayerId]?.name}"}`);

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
    const canPlay = player.canPlay(this.engine.board);

    // players[] = SOURCE DE VÉRITÉ (comme le serveur/web)
    // Vrais dominos pour tous (local = info complète), playables/placements/canPlay sur le joueur courant
    const players = this.engine.players.map((p: any) => ({
      id: p.id,
      name: p.name,
      isAI: p.isAI ?? false,
      dominos: p.dominos,
      dominoCount: p.dominos.length,
      hasPassed: p.hasPassed,
      playables: p.id === playerIndex ? playables : [],
      placements: p.id === playerIndex ? placements : [],
      canPlay: p.id === playerIndex ? canPlay : false
    }));

    return {
      turnNumber: this.engine.turnNumber,
      currentPlayerId: playerIndex,
      currentPlayerName: player.name,
      actionType: this.engine.lastAction === 'passed' ? 'PASSED' : 'PLACED',

      // Top-level: consommé par AIPlayer (PlayTurnPayload), PAS par l'UI
      currentPlayerDominos: player.dominos,
      playables,
      placements,
      canPlay,

      board: boardState,
      players,

      // Champs FLAT (alignés serveur + web)
      consecutivePasses: this.engine.consecutivePasses,
      lastPlayedDomino: undefined,
      lastPlayedPlayerId: undefined,
      lastPlayerWhoPassedId: this.engine.lastPlayerWhoPassedId ?? undefined
    };
  }

  buildLocalBroadcastState(): any {
    const nextPlayerIndex = (this.engine.currentPlayerId + 1) % this.engine.players.length;
    const boardState = this.buildBoardState();

    const players = this.engine.players.map((p: any) => ({
      id: p.id,
      name: p.name,
      isAI: p.isAI ?? false,
      dominos: p.dominos,
      dominoCount: p.dominos.length,
      hasPassed: p.hasPassed,
      playables: [],
      placements: [],
      canPlay: false
    }));

    return {
      turnNumber: this.engine.turnNumber,
      nextPlayerId: nextPlayerIndex,
      board: boardState,
      players,
      // Champs FLAT (alignés serveur + web)
      consecutivePasses: this.engine.consecutivePasses,
      lastPlayerWhoPassedId: this.engine.lastPlayerWhoPassedId ?? undefined
    };
  }

  buildCurrentState(): any {
    const current = this.engine.players[this.engine.currentPlayerId];
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
      domino
    }));

    return {
      turnNumber: this.engine.turnNumber,
      actionType: this.engine.lastAction === 'passed' ? 'PASSED' : 'PLACED',

      currentPlayerName: current.name,
      currentPlayerDominos: current.dominos,
      playables: currentPlayerHand.playables,
      placements: currentPlayerHand.placements,
      canPlay: currentPlayerHand.canPlay,

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

      currentPlayerId: this.engine.currentPlayerId,
      consecutivePasses: this.engine.consecutivePasses,

      lastPlayedDomino: undefined,
      lastPlayedPlayerId: undefined,
      lastPlayerWhoPassedId: this.engine.lastPlayerWhoPassedId ?? undefined
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

    return endGamePayload;
  }
}
