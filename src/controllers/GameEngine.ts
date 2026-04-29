
import type { Domino, TurnState, PlayerTurnState, TrackedDomino} from '../shared/models/GameTurnState';
import { DominoModel } from '../shared/models/Domino';
import type { PlayTurnPayload, PlayResponsePayload, TurnUpdatedPayload, PlayerPublicState } from '../controllers/LocalGameEvent';
import type { ILocalEventDispatcher } from '../core/ILocalEventDispatcher';
import { Board } from './Board';
import { GamePlayer } from './GamePlayer';

interface GameEngineConfig {
  playerNames: string[];
  aiPlayers: boolean[];
}

export class GameEngine {
  private players: GamePlayer[] = [];
  private board: Board = new Board();
  private currentPlayerIndex: number = 0;
  private _isOver: boolean = false;
  private winner: GamePlayer | null = null;
  private turnNumber: number = 0;
  private consecutivePasses: number = 0;
  private config: GameEngineConfig;
  private trainSequence: TrackedDomino[] = [];
  private lastAction: 'played' | 'passed' | null = null;
  private lastPlayerWhoPassedId: number | null = null;
  private pendingResponse: Promise<PlayResponsePayload> | null = null;
  private resolveResponse: ((payload: PlayResponsePayload) => void) | null = null;
  private passHiddenPromise: Promise<void> | null = null;
  private resolvePassHidden: (() => void) | null = null;

  constructor(config: GameEngineConfig) {
    this.config = config;
    this.players = config.playerNames.map(
      (name, idx) => new GamePlayer(idx, name, config.aiPlayers[idx] || false)
    );
  }

  async initGame(): Promise<void> {
    this.reset();
    Board.distribute(this.players);
    this.findStartingPlayer();
    this.turnNumber = 1;

    console.log(`LOG  [GAME-ENGINE] 🎮 INIT_GAME {"players":${this.players.length},"aiPlayers":${this.players.filter(p => p.isAI).length},"startingPlayer":"${this.players[this.currentPlayerIndex].name}"}`);
  }

  async startGameLoop(adapter: ILocalEventDispatcher): Promise<void> {
    const firstPlayer = this.players[this.currentPlayerIndex];

    while (!this.isOver) {
      const currentPlayer = this.players[this.currentPlayerIndex];
      const playableResult = this.board.getPlayableDominos(currentPlayer.hand);
      const canPlay = playableResult.totalChoice > 0 && !currentPlayer.hasPassed;

      if (!canPlay) {
        await this.handleAutoPass(this.currentPlayerIndex, adapter);
        continue;
      }

      adapter.emit({
        type: 'PLAY_TURN',
        payload: this.getPlayTurnState(this.currentPlayerIndex)
      });

      const response = await this.waitForPlayResponse();
      this.handlePlayResponse(response, adapter);
    }
  }

  async waitForPlayResponse(): Promise<PlayResponsePayload> {
    this.pendingResponse = new Promise(resolve => {
      this.resolveResponse = resolve;
    });
    return this.pendingResponse;
  }

  resolvePlayResponse(payload: PlayResponsePayload): void {
    if (this.resolveResponse) {
      this.resolveResponse(payload);
      this.resolveResponse = null;
      this.pendingResponse = null;
    }
  }

  onPassHidden(): void {
    // [COMMENTED-v1] console.log(`[AUTO-PASS] 📡 onPassHidden called, resolving Promise`);
    if (this.resolvePassHidden) {
      this.resolvePassHidden();
      this.resolvePassHidden = null;
      this.passHiddenPromise = null;
    } else {
      // [COMMENTED-v1] console.log(`[AUTO-PASS] ⚠️ WARNING: No resolver found for PASS_HIDDEN!`);
    }
  }


  /**
   * Handle player passing their turn
   * - Record pass
   * - Move to next player
   */


  // ═══════════════════════════════════════════════════════════════════════════════
  // STATE GETTERS & QUERIES
  // ═══════════════════════════════════════════════════════════════════════════════

  getCurrentPlayerIndex(): number {
    return this.currentPlayerIndex;
  }

  getTurnNumber(): number {
    return this.turnNumber;
  }

  get isOver(): boolean {
    return this._isOver;
  }

  private set isOver(value: boolean) {
    this._isOver = value;
  }

  /**
   * 🎯 NOUVEAU: Retourne l'état initial du jeu
   * Utilisé pour émettre GAME_STARTED au démarrage
   */
  getGameStartedState(): { turnNumber: number; currentPlayerIndex: number; players: any[]; board: any } {
    const players: any[] = this.players.map(p => ({
      id: p.id,
      name: p.name,
      dominoCount: p.hand.length,
      hasPassed: p.hasPassed,
      isCurrentPlayer: p.id === this.currentPlayerIndex
    }));

    const state = {
      turnNumber: this.turnNumber,
      currentPlayerIndex: this.currentPlayerIndex,
      players,
      board: {
        trainOnBoard: this.board.playedDominos.map(domino => ({
          domino,
          line: undefined
        }))
      }
    };

    console.log(`LOG  [GAME-ENGINE] 🚀 GAME_STARTED {"players":${players.length},"startingPlayer":"${this.players[this.currentPlayerIndex].name}"}`);

    return state;
  }

  /**
   * 🎯 NOUVEAU: Retourne l'état personnel pour un joueur
   * Utilisé pour émettre PLAY_TURN
   */
  getPlayTurnState(playerIndex: number): PlayTurnPayload {
    const player = this.players[playerIndex];
    const playableResult = this.board.getPlayableDominos(player.hand);

    const playables = playableResult.playable
      .map(([d]) => player.hand.findIndex(h => h.left === d.left && h.right === d.right))
      .filter(idx => idx !== -1);

    const placements = playableResult.playable.map(([d, sides]) => {
      if (sides.length === 2) return 'both' as const;
      return sides[0] === 'left' ? ('left' as const) : ('right' as const);
    });

    const opponents: PlayerPublicState[] = this.players
      .filter(p => p.id !== playerIndex)
      .map(p => ({
        id: p.id,
        name: p.name,
        dominoCount: p.hand.length,
        hasPassed: p.hasPassed,
        isCurrentPlayer: false
      }));

    const players: PlayerPublicState[] = this.players.map(p => ({
      id: p.id,
      name: p.name,
      dominoCount: p.hand.length,
      hasPassed: p.hasPassed,
      isCurrentPlayer: p.id === playerIndex
    }));

    const payload = {
      turnNumber: this.turnNumber,
      yourIndex: playerIndex,
      yourName: player.name,
      yourDominos: player.hand,
      playables,
      placements,
      canPlay: playableResult.totalChoice > 0 && !player.hasPassed,
      board: {
        trainOnBoard: this.board.playedDominos.map(domino => ({
          domino,
          line: undefined
        }))
      },
      opponents,
      players,
      lastPlayerWhoPassedId: this.lastPlayerWhoPassedId ?? undefined
    };

    const boardStr = payload.board.trainOnBoard.map(d => `${d.domino.left}|${d.domino.right}`).join(' ← → ');
    console.log(`LOG  [GAME-ENGINE] ⏸️  PLAY_TURN {"turn":${payload.turnNumber},"player":"${player.name}","hand":${player.hand.length},"playable":${playables.length},"board":"${boardStr || 'empty'}"}`);

    return payload;
  }

  /**
   * 🎯 NOUVEAU: Retourne l'état public pour le broadcast TURN_UPDATED
   */
  getTurnUpdatedState(): TurnUpdatedPayload {
    const nextPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;

    const players: PlayerPublicState[] = this.players.map(p => ({
      id: p.id,
      name: p.name,
      dominoCount: p.hand.length,
      hasPassed: p.hasPassed,
      isCurrentPlayer: p.id === nextPlayerIndex
    }));

    const payload = {
      turnNumber: this.turnNumber,
      nextPlayerIndex,
      board: {
        trainOnBoard: this.board.playedDominos.map(domino => ({
          domino,
          line: undefined
        }))
      },
      players,
      lastPlayerWhoPassedId: this.lastPlayerWhoPassedId ?? undefined
    };

    const boardStr2 = payload.board.trainOnBoard.map(d => `${d.domino.left}|${d.domino.right}`).join(' ← → ');
    console.log(`LOG  [GAME-ENGINE] 📊 TURN_UPDATED {"turn":${payload.turnNumber},"nextPlayer":"${this.players[nextPlayerIndex].name}","board":"${boardStr2 || 'empty'}","playerCounts":"${players.map(p => p.name.charAt(0) + ':' + p.dominoCount).join(' ')}"}`);

    return payload;
  }

  async handleAutoPass(playerId: number, adapter?: ILocalEventDispatcher): Promise<boolean> {
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      return false;
    }

    const boardStr3 = this.board.playedDominos.map(d => `${d.left}|${d.right}`).join(' ← → ');
    console.log(`LOG  [GAME-ENGINE] 🔄 AUTO_PASS {"player":"${player.name}","board":"${boardStr3 || 'empty'}","passes":${this.consecutivePasses + 1}}`);

    player.hasPassed = true;
    this.lastPlayerWhoPassedId = playerId;
    this.consecutivePasses++;

    // Notifier l'UI du pass AVANT d'attendre
    if (adapter) {
      // [COMMENTED-v1] console.log(`[AUTO-PASS] 📢 Emitting TURN_UPDATED to show badge...`);
      adapter.emit({
        type: 'TURN_UPDATED',
        payload: this.getTurnUpdatedState()
      });
    }

    // Attendre que le badge UI se cache
    // [COMMENTED-v1] console.log(`[AUTO-PASS] ⏳ Waiting for PASS_HIDDEN event...`);
    this.passHiddenPromise = new Promise(resolve => {
      this.resolvePassHidden = resolve;
    });

    await this.passHiddenPromise;
    // [COMMENTED-v1] console.log(`[AUTO-PASS] ✅ PASS_HIDDEN received, continuing...`);
    this.nextTurn(adapter);
    return true;
  }

  handlePlayResponse(payload: PlayResponsePayload, adapter?: ILocalEventDispatcher): boolean {
    if (this.isOver) {
      return false;
    }

    const player = this.players.find(p => p.id === payload.playerId);
    if (!player) {
      console.log(`[GAME-ENGINE] ❌ PLAY_RESPONSE_INVALID player_not_found`, { playerId: payload.playerId });
      return false;
    }

    // Joueur joue un domino (le pass est géré automatiquement via handleAutoPass())
    const move = payload as { domino: Domino; side: 'left' | 'right'; knocked: boolean };

    const dominoInHand = player.hand.find(
      d => d.left === move.domino.left && d.right === move.domino.right
    );
    if (!dominoInHand) {
      console.log(`[GAME-ENGINE] ❌ PLAY_RESPONSE_INVALID domino_not_in_hand`, {
        playerId: payload.playerId,
        domino: `${move.domino.left}|${move.domino.right}`
      });
      return false;
    }

    const canPlace = this.board.playDomino(move.domino, move.side);
    if (!canPlace) {
      console.log(`[GAME-ENGINE] ❌ PLAY_RESPONSE_INVALID invalid_placement`, {
        playerId: payload.playerId,
        domino: `${move.domino.left}|${move.domino.right}`,
        side: move.side
      });
      return false;
    }

    player.removeDomino(move.domino);

    this.trainSequence.push({
      domino: move.domino,
      side: move.side,
      turn: this.turnNumber,
      playerId: payload.playerId
    });

    const boardStr = this.board.playedDominos.map(d => `${d.left}|${d.right}`).join(' ← → ');
    console.log(`LOG  [GAME-ENGINE] 🎯 PLAY_RESPONSE {"player":"${player.name}","domino":"${move.domino.left}|${move.domino.right}","choice":"${move.side}","handAfter":${player.hand.length},"board":"${boardStr}","validation":"SUCCESS"}`);

    for (const p of this.players) {
      p.hasPassed = false;
    }
    this.consecutivePasses = 0;
    this.lastPlayerWhoPassedId = null;

    this.nextTurn(adapter);
    return true;
  }


  getCurrentState(): TurnState {
    const current = this.players[this.currentPlayerIndex];
    const playableResult = this.board.getPlayableDominos(current.hand);

    // 🎯 Calculate playables (indices of playable dominos in hand)
    const playables = playableResult.playable
      .map(([d]) => current.hand.findIndex(h => h.left === d.left && h.right === d.right))
      .filter(idx => idx !== -1);

    // 🎯 Calculate placements: PARALLEL to playables, not to hand
    // Each element in placements corresponds to each element in playables
    const placements = playableResult.playable.map(([d, sides]) => {
      if (sides.length === 2) return 'both' as const;
      return sides[0] === 'left' ? ('left' as const) : ('right' as const);
    });

    const currentPlayerHand: PlayerTurnState = {
      id: current.id,
      name: current.name,
      dominoCount: current.hand.length,
      hasPassed: current.hasPassed,
      dominos: current.hand,
      playables,        // ✅ Indices of playable dominos
      placements,       // ✅ Placements parallel to playables
      canPlay: playableResult.totalChoice > 0 && !current.hasPassed
    };

    // 🎯 Build TrainOnBoard from playedDominos
    const trainOnBoard = this.board.playedDominos.map(domino => ({
      domino,
      line: undefined as any  // Future: server-provided layout
    }));

    // 🎯 Build complete TurnState matching SharedGameTurnState format
    return {
      turnNumber: this.turnNumber,
      currentPlayerIndex: this.currentPlayerIndex,
      currentPlayerName: current.name,
      phase: this.isOver ? 'ENDED' : this.lastAction === 'passed' ? 'PASSED' : this.lastAction === 'played' ? 'PLACED' : 'STARTED',

      // 🎯 Board state (new structure)
      board: {
        trainSequence: this.trainSequence,
        trainOnBoard: trainOnBoard
      },

      // Players state
      // 🎯 CHANGEMENT: dominos toujours visibles, mais playables/canPlay gelés si pas le tour
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        dominoCount: p.hand.length,
        hasPassed: p.hasPassed,
        dominos: p.hand,  // ✅ TOUJOURS visible (jamais null)
        playables: p.id === current.id ? currentPlayerHand.playables : [],  // Gelés si pas le tour
        placements: p.id === current.id ? currentPlayerHand.placements : [],  // Gelés si pas le tour
        canPlay: p.id === current.id ? currentPlayerHand.canPlay : false  // Gelés si pas le tour
      })),

      // Current player state
      playerState: {
        id: current.id,
        playables: currentPlayerHand.playables,
        canPlay: currentPlayerHand.canPlay
      },

      // Game flow
      consecutivePasses: this.consecutivePasses,
      gameEnded: this.isOver,
      winner: this.isOver ? this.currentPlayerIndex : undefined,
      lastPlayerWhoPassedId: this.lastPlayerWhoPassedId ?? undefined,

      // Game end data (if ended)
      endData: this.isOver && this.winner ? {
        winner: {
          id: this.winner.id,
          name: this.winner.name
        },
        scores: this.players.map(p => ({
          playerId: p.id,
          playerName: p.name,
          score: p.score
        }))
      } : undefined
    } as TurnState;
  }

  getPlayers(): GamePlayer[] {
    return this.players;
  }

  getWinner(): GamePlayer | null {
    return this.winner;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private distribute(): void {
    const dominoes = DominoModel.createStandardSet();
    Board.shuffle(dominoes);

    for (let i = 0; i < this.players.length; i++) {
      this.players[i].hand = dominoes.slice(i * 7, (i + 1) * 7);
    }
  }

  nextTurn(adapter?: ILocalEventDispatcher): void {
    this.checkEndConditions();

    if (this.isOver) {
      const winner = this.getWinner();
      console.log(`LOG  [GAME-ENGINE] 🏆 GAME_ENDED {"winner":"${winner?.name}","winnerId":${winner?.id},"scores":${JSON.stringify(this.getPlayers().map(p => ({name: p.name, score: p.score})))},"totalTurnsPlayed":${this.turnNumber}}`);

      // Afficher les hands finales après la fin du game
      console.log(`LOG  ════════════════════════════════════════════════════════════════════════════ GAME ENDED - FINAL HANDS ════════════════════════════════════════════════════════════════════════════`);
      this.players.forEach(p => {
        const dominoStr = p.hand.map(d => `${d.left}|${d.right}`).join(', ');
        console.log(`LOG  [HANDS] ${p.name}: [${dominoStr}]`);
      });

      if (adapter) {
        adapter.emit({
          type: 'GAME_ENDED',
          payload: {
            winner: {
              id: winner?.id || 0,
              name: winner?.name || ''
            },
            scores: this.getPlayers().map(p => ({
              playerId: p.id,
              playerName: p.name,
              score: p.score
            }))
          }
        });
      }
      return;
    }

    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.turnNumber++;
    const currentPlayer = this.players[this.currentPlayerIndex];

    // Séparateur visuel de tour
    const boardStr = this.board.playedDominos.map(d => `${d.left}|${d.right}`).join(' ← → ');
    console.log(`LOG  ════════════════════════════════════════════════════════════════════════════ TURN ${this.turnNumber} ════════════════════════════════════════════════════════════════════════════`);

    // Log les dominos de tous les joueurs
    this.players.forEach(p => {
      const dominoStr = p.hand.map(d => `${d.left}|${d.right}`).join(', ');
      console.log(`LOG  [HANDS] ${p.name}: [${dominoStr}]`);
    });

    console.log(`LOG  [GAME-ENGINE] 📋 NEXT_TURN {"nextPlayer":"${currentPlayer.name}","turnNumber":${this.turnNumber},"board":"${boardStr || 'empty'}","boardSize":${this.board.playedDominos.length},"consecutivePasses":${this.consecutivePasses}}`);

    if (adapter) {
      adapter.emit({
        type: 'TURN_UPDATED',
        payload: this.getTurnUpdatedState()
      });
    }
  }


  checkEndConditions(): boolean {
    const emptyHand = this.players.find(p => p.hand.length === 0);
    if (emptyHand) {
      console.log(`[GAME-ENGINE] ✅ END_CONDITIONS_MET reason=empty_hand`, {
        winnerPlayerId: emptyHand.id,
        winnerName: emptyHand.name
      });
      this.endGame(emptyHand);
      return true;
    }

    if (this.players.every(p => p.hasPassed)) {
      const winner = this.players.reduce((min, p) =>
        p.calculateHandValue() < min.calculateHandValue() ? p : min
      );
      console.log(`[GAME-ENGINE] ✅ END_CONDITIONS_MET reason=all_passed`, {
        winnerPlayerId: winner.id,
        winnerName: winner.name,
        winnerHandValue: winner.calculateHandValue(),
        allHandValues: this.players.map(p => ({
          playerName: p.name,
          handValue: p.calculateHandValue()
        }))
      });
      this.endGame(winner);
      return true;
    }

    return false;
  }

  private endGame(winner: GamePlayer): void {
    this.isOver = true;
    this.winner = winner;
    this.calculateScores();
  }

  private calculateScores(): void {
    this.players.forEach(p => p.updateScore());
  }

  private findStartingPlayer(): void {
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].hand.some(d => d.left === 6 && d.right === 6)) {
        this.currentPlayerIndex = i;
        return;
      }
    }
  }

  private reset(): void {
    this.isOver = false;
    this.winner = null;
    this.turnNumber = 0;
    this.consecutivePasses = 0;
    this.currentPlayerIndex = 0;
    this.trainSequence = [];  // 🎯 Reset train history
    this.lastAction = null;   // 🎯 Reset last action
    this.lastPlayerWhoPassedId = null;  // 🎯 Reset last player who passed

    this.board.reset();
    this.players.forEach(p => p.reset());
  }
}
