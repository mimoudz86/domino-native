/**
 * AIPlayer - Entité indépendante pour décisions IA
 *
 * Architecture asynchrone:
 * - Écoute TURN_STATE_GET via EventBusAdapter
 * - Décide asynchrone (attend 1s)
 * - Émet TURN_POST (joueur/domino)
 * - EventBusAdapter traite et émet nouvel état
 *
 * AIPlayer est une API autonome - ne connaît pas GameLogic
 */

import { ILocalEventDispatcher } from '../../core/ILocalEventDispatcher';
import type { PlayTurnPayload } from '../localGameEvents';
import { evaluateDomino } from './Utils';

export class AIPlayer {
  private playerId: number;
  private strategy: string;
  private bus: ILocalEventDispatcher;
  private isDeciding: boolean = false;

  constructor(playerId: number, strategy: string, bus: ILocalEventDispatcher) {
    this.playerId = playerId;
    this.strategy = strategy; // 'random', 'doubles', 'aggressive', etc.
    this.bus = bus;

    // console.log(`[AIPlayer] Created - ID: ${this.playerId}, Strategy: ${this.strategy}`);

    // S'abonner à son appel de jeu
    this.bus.on('PLAY_TURN', (state: PlayTurnPayload) => {
      this.onPlayTurn(state);
    });
  }

  /**
   * Appelé quand c'est notre tour de jouer
   * Reçoit SEULEMENT notre état personnel (pas celui des autres)
   */
  private onPlayTurn(state: PlayTurnPayload): void {
    // Vérifier que c'est bien notre tour
    if (state.currentPlayerId !== this.playerId) {
      return;
    }

    // Ignorer si on est déjà en train de décider
    if (this.isDeciding) {
      // console.log(`[AIPlayer ${this.playerId}] Already deciding - ignoring`);
      return;
    }

    // Marquer que on décide
    this.isDeciding = true;
    // console.log(`[AIPlayer ${this.playerId}] My turn - starting decision (${this.strategy})`);

    // ⏱️ Simuler la réflexion (2000ms)
    setTimeout(() => this.decideAndPlay(state), 300);
  }

  /**
   * Réinitialise le flag de décision
   */
  private resetDecision(): void {
    this.isDeciding = false;
  }

  /**
   * Prend la décision et émet PLAY_RESPONSE
   */
  private decideAndPlay(state: PlayTurnPayload): void {
    this.resetDecision();

    // Si pas de coup jouable, ne rien faire (proceedWithCurrentPlayer auto-passera)
    if (!state.canPlay) {
      // console.log(`[AIPlayer ${this.playerId}] No playable domino`);
      return;
    }

    // Filtrer les dominos jouables
    const playableDominos = state.currentPlayerDominos.filter((_, i) => state.playables.includes(i));

    // console.log(
    //   `[AIPlayer ${this.playerId}] Playable dominos: ${playableDominos.map(d => `${d.left}|${d.right}`).join(', ')}`
    // );

    // Extraire le board state
    const trainOnBoard = state.board.trainOnBoard;
    const boardLeftEnd = trainOnBoard.length > 0 ? trainOnBoard[0].domino.left : null;
    const boardRightEnd = trainOnBoard.length > 0 ? trainOnBoard[trainOnBoard.length - 1].domino.right : null;

    // Choisir le meilleur domino selon la stratégie
    const [bestDomino, bestSide] = this._chooseDomino(
      playableDominos,
      state.currentPlayerDominos,
      trainOnBoard.map(d => d.domino),
      boardLeftEnd,
      boardRightEnd
    );

    // console.log(`[AIPlayer ${this.playerId}] Chose ${bestDomino.left}|${bestDomino.right} on ${bestSide}`);

    // Émettre la décision via PLAY_RESPONSE
    this.bus.emit({
      type: 'PLAY_RESPONSE',
      payload: {
        type: 'played',
        playerId: this.playerId,
        domino: bestDomino,
        side: bestSide,
        knocked: false
      }
    });
  }

  /**
   * Choisir le meilleur domino selon la stratégie
   * IMPORTANT: Choisir le BON côté en fonction du board state!
   */
  private _chooseDomino(
    playableDominos: any[],
    hand: any[],
    boardDominos: any[],
    boardLeftEnd: number | null,
    boardRightEnd: number | null
  ): [any, 'left' | 'right'] {
    let bestDomino = playableDominos[0];
    let bestScore = -Infinity;
    let bestSide: 'left' | 'right' = this._getSideForDomino(playableDominos[0], boardLeftEnd, boardRightEnd);

    // Évaluer chaque domino selon la stratégie
    for (const domino of playableDominos) {
      const score = evaluateDomino(
        domino,
        hand,
        boardDominos,
        this.strategy,
        boardLeftEnd ?? undefined,
        boardRightEnd ?? undefined
      );

      if (score > bestScore) {
        bestScore = score;
        bestDomino = domino;
        // Choisir le BON côté en fonction du domino et du board
        bestSide = this._getSideForDomino(domino, boardLeftEnd, boardRightEnd);
      }
    }

    return [bestDomino, bestSide];
  }

  /**
   * Détermine quel côté (left/right) peut accueillir ce domino
   */
  private _getSideForDomino(
    domino: any,
    boardLeftEnd: number | null,
    boardRightEnd: number | null
  ): 'left' | 'right' {
    // Si c'est le premier domino (board vide), préférer 'left'
    if (boardLeftEnd === null && boardRightEnd === null) {
      return 'left';
    }

    // Vérifier LEFT
    const canPlayLeft =
      domino.right === boardLeftEnd ||
      domino.left === boardLeftEnd;

    // Vérifier RIGHT
    const canPlayRight =
      domino.left === boardRightEnd ||
      domino.right === boardRightEnd;

    // Préférer left si possible, sinon right
    if (canPlayLeft) {
      return 'left';
    } else if (canPlayRight) {
      return 'right';
    }

    // Fallback (ne devrait pas arriver là si playable est correct)
    return 'left';
  }
}
