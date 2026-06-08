
import type { Domino } from '../shared/Domino';
import type { TrackedDomino,PlayResponsePayload } from './localGameEvents';
import type { ILocalEventDispatcher } from '../core/ILocalEventDispatcher';
import { Board } from './Board';
import { Player } from './Player';
import { globalEventEmitter } from '../core/EventEmitter';
import { GameStateBuilder } from '../shared/GameStateBuilder';
import { GameCoreLogic } from '../core/GameCoreLogic';

interface GameEngineConfig {
  playerNames: string[];
  aiPlayers: boolean[];
}

export class GameEngine {
  public players: Player[] = [];
  public board: Board = new Board();
  public currentPlayerId: number = 0;
  private _isOver: boolean = false;
  public winner: Player | null = null;
  public turnNumber: number = 0;
  public consecutivePasses: number = 0;
  public trainSequence: TrackedDomino[] = [];
  public lastAction: 'played' | 'passed' | null = null;
  public lastPlayerWhoPassedId: number | null = null;
  private pendingResponse: Promise<PlayResponsePayload> | null = null;
  private resolveResponse: ((payload: PlayResponsePayload) => void) | null = null;
  private passHiddenPromise: Promise<void> | null = null;
  private resolvePassHidden: (() => void) | null = null;
  public winningType: 'EMPTY_HAND' | 'BLOCKED_GAME' = 'EMPTY_HAND';
  public stateBuilder: GameStateBuilder;

  constructor(config: GameEngineConfig) {
    this.players = config.playerNames.map(
      (name, idx) => new Player(idx, name, config.aiPlayers[idx] || false)
    );
    this.stateBuilder = new GameStateBuilder(this);
  }

  async initGame(): Promise<void> {
    this.reset();
    Board.distribute(this.players);
    this.currentPlayerId = GameCoreLogic.findFirstPlayerWithDoubleSix(this.players);
    this.turnNumber = 1;

    console.log(`LOG  [GAME-ENGINE] 🎮 INIT_GAME {"players":${this.players.length},"aiPlayers":${this.players.filter(p => p.isAI).length},"startingPlayer":"${this.players[this.currentPlayerId].name}"}`);
  }

  async startGameLoop(adapter: ILocalEventDispatcher): Promise<void> {
    // Séparateur visuel du TURN 1
    console.log(`LOG  ════════════════════════════════════════════════════════════════════════════ TURN ${this.turnNumber} ════════════════════════════════════════════════════════════════════════════`);

    // Log les dominos de tous les joueurs pour TURN 1
    this.players.forEach(p => {
      const dominoStr = p.dominos.map(d => `${d.left}|${d.right}`).join(', ');
      console.log(`LOG  [HANDS] ${p.name}: [${dominoStr}]`);
    });

    while (!this.isOver) {
      const currentPlayer = this.players[this.currentPlayerId];

      if (!currentPlayer.canPlay(this.board)) {
        await this.handleAutoPass(this.currentPlayerId, adapter);
        continue;
      }

      adapter.emit({
        type: 'PLAY_TURN',
        payload: this.stateBuilder.buildLocalPlayerState(this.currentPlayerId)
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
    console.log(`[GAME-ENGINE] 📡 onPassHidden called, lastPlayerWhoPassedId BEFORE: ${this.lastPlayerWhoPassedId}`);
    this.lastPlayerWhoPassedId = null;
    console.log(`[GAME-ENGINE] ✅ onPassHidden RESET lastPlayerWhoPassedId to: ${this.lastPlayerWhoPassedId}`);
    if (this.resolvePassHidden) {
      this.resolvePassHidden();
      this.resolvePassHidden = null;
      this.passHiddenPromise = null;
    } else {
      console.log(`[AUTO-PASS] ⚠️ WARNING: No resolver found for PASS_HIDDEN!`);
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
    return this.currentPlayerId;
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

  get trainOnBoard(): any[] {
    return this.board.playedDominos.map(d => ({
      domino: d
    }));
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
        payload: this.stateBuilder.buildLocalBroadcastState()
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

    const dominoInHand = player.dominos.find(
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
    console.log(`LOG  [GAME-ENGINE] 🎯 PLAY_RESPONSE {"player":"${player.name}","domino":"${move.domino.left}|${move.domino.right}","choice":"${move.side}","handAfter":${player.dominos.length},"board":"${boardStr}","validation":"SUCCESS"}`);

    for (const p of this.players) {
      p.hasPassed = false;
    }
    this.consecutivePasses = 0;
    this.lastPlayerWhoPassedId = null;

    this.nextTurn(adapter);
    return true;
  }

  getPlayers(): Player[] {
    return this.players;
  }

  getWinner(): Player | null {
    return this.winner;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  nextTurn(adapter?: ILocalEventDispatcher): void {
    this.checkEndConditions();

    if (this.isOver) {
      console.log(`LOG  ════════════════════════════════════════════════════════════════════════════ GAME ENDED - FINAL HANDS ════════════════════════════════════════════════════════════════════════════`);
      this.players.forEach(p => {
        const dominoStr = p.dominos.map(d => `${d.left}|${d.right}`).join(', ');
        console.log(`LOG  [HANDS] ${p.name}: [${dominoStr}]`);
      });

      if (adapter) {
        const endGamePayload = this.stateBuilder.buildEndGame();
        globalEventEmitter.emit("GAME_ENDED", endGamePayload);
        adapter.emit({
          type: "GAME_ENDED",
          payload: endGamePayload
        });
      }
      return;
    }

    this.currentPlayerId = (this.currentPlayerId + 1) % this.players.length;
    this.turnNumber++;
    const currentPlayer = this.players[this.currentPlayerId];

    // Séparateur visuel de tour
    const boardStr = this.board.playedDominos.map(d => `${d.left}|${d.right}`).join(' ← → ');
    console.log(`LOG  ════════════════════════════════════════════════════════════════════════════ TURN ${this.turnNumber} ════════════════════════════════════════════════════════════════════════════`);

    // Log les dominos de tous les joueurs
    this.players.forEach(p => {
      const dominoStr = p.dominos.map(d => `${d.left}|${d.right}`).join(', ');
      console.log(`LOG  [HANDS] ${p.name}: [${dominoStr}]`);
    });

    console.log(`LOG  [GAME-ENGINE] 📋 NEXT_TURN {"nextPlayer":"${currentPlayer.name}","turnNumber":${this.turnNumber},"board":"${boardStr || 'empty'}","boardSize":${this.board.playedDominos.length},"consecutivePasses":${this.consecutivePasses}}`);

    if (adapter) {
      adapter.emit({
        type: 'TURN_UPDATED',
        payload: this.stateBuilder.buildLocalBroadcastState()
      });
    }
  }


  checkEndConditions(): boolean {
    const emptyHand = this.players.find(p => p.dominos.length === 0);
    if (emptyHand) {
      console.log(`[GAME-ENGINE] ✅ END_CONDITIONS_MET reason=empty_hand`, {
        winnerPlayerId: emptyHand.id,
        winnerName: emptyHand.name
      });
      this.winningType = 'EMPTY_HAND';
      this.endGame(emptyHand);
      return true;
    }

    if (this.players.every(p => p.hasPassed)) {
      const calculateHandValue = (p: Player) => p.dominos.reduce((sum, d) => sum + d.left + d.right, 0);
      const winner = this.players.reduce((min, p) =>
        calculateHandValue(p) < calculateHandValue(min) ? p : min
      );
      console.log(`[GAME-ENGINE] ✅ END_CONDITIONS_MET reason=all_passed`, {
        winnerPlayerId: winner.id,
        winnerName: winner.name,
        winnerHandValue: calculateHandValue(winner),
        allHandValues: this.players.map(p => ({
          playerName: p.name,
          handValue: calculateHandValue(p)
        }))
      });
      this.winningType = 'BLOCKED_GAME';
      this.endGame(winner);
      return true;
    }

    return false;
  }

  private endGame(winner: Player): void {
    this.isOver = true;
    this.winner = winner;
    GameCoreLogic.calculateScores(this.players);
  }

  private reset(): void {
    this.isOver = false;
    this.winner = null;
    this.turnNumber = 0;
    this.consecutivePasses = 0;
    this.currentPlayerId = 0;
    this.trainSequence = [];  // 🎯 Reset train history
    this.lastAction = null;   // 🎯 Reset last action
    this.lastPlayerWhoPassedId = null;  // 🎯 Reset last player who passed

    this.board.reset();
    this.players.forEach(p => p.reset());
  }
}
