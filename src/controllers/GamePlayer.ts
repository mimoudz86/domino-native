import type { Domino } from '../shared/models/Domino';
import { Board } from './Board';

export class GamePlayer {
  id: number;
  name: string;
  isAI: boolean;
  hand: Domino[] = [];
  dominos: Domino[] = [];
  score: number = 0;
  hasPassed: boolean = false;

  constructor(id: number, name: string, isAI: boolean = false) {
    this.id = id;
    this.name = name;
    this.isAI = isAI;
  }

  reset(): void {
    this.hand = [];
    this.dominos = this.hand;
    this.score = 0;
    this.hasPassed = false;
  }

  resetForNewRound(): void {
    this.hand = [];
    this.dominos = this.hand;
    this.hasPassed = false;
  }

  addDomino(domino: Domino): void {
    this.hand.push(domino);
    this.dominos = this.hand;
  }

  removeDomino(domino: Domino): boolean {
    const idx = this.hand.findIndex(d => d.left === domino.left && d.right === domino.right);
    if (idx !== -1) {
      this.hand.splice(idx, 1);
      this.dominos = this.hand;
      return true;
    }
    return false;
  }

  getDominoCount(): number {
    return this.hand.length;
  }

  canPlay(board: Board): boolean {
    const playableResult = board.getPlayableDominos(this.hand);
    return playableResult.totalChoice > 0 && !this.hasPassed;
  }

  hasPlayableMove(leftEnd: number | null, rightEnd: number | null): boolean {
    return this.hand.some(domino => {
      const placement = Board.canPlaceDomino(domino, leftEnd, rightEnd);
      return placement !== 'none';
    });
  }

  hasWon(): boolean {
    return this.hand.length === 0;
  }

  hasEmptyHand(): boolean {
    return this.hand.length === 0;
  }

  setHasPassed(value: boolean): void {
    this.hasPassed = value;
  }

  getHasPassed(): boolean {
    return this.hasPassed;
  }

  resetHasPassed(): void {
    this.hasPassed = false;
  }

  getRemainingPips(): number {
    return this.hand.reduce((sum, domino) => sum + domino.left + domino.right, 0);
  }

  calculateRoundScore(): number {
    return this.hand.reduce((sum, domino) => sum + domino.left + domino.right, 0);
  }
}
