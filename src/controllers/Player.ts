import type { Domino } from '../shared/Domino';
import { Board } from './Board';

export class Player {
  id: number;
  name: string;
  isAI: boolean;
  dominos: Domino[] = [];
  score: number = 0;
  hasPassed: boolean = false;

  constructor(id: number, name: string, isAI: boolean = false) {
    this.id = id;
    this.name = name;
    this.isAI = isAI;
  }

  reset(): void {
    this.dominos = [];
    this.score = 0;
    this.hasPassed = false;
  }

  resetForNewRound(): void {
    this.dominos = [];
    this.hasPassed = false;
  }

  addDomino(domino: Domino): void {
    this.dominos.push(domino);
  }

  removeDomino(domino: Domino): boolean {
    const idx = this.dominos.findIndex(d => d.left === domino.left && d.right === domino.right);
    if (idx !== -1) {
      this.dominos.splice(idx, 1);
      return true;
    }
    return false;
  }

  getDominoCount(): number {
    return this.dominos.length;
  }

  canPlay(board: Board): boolean {
    const playableResult = board.getPlayableDominos(this.dominos);
    return playableResult.totalChoice > 0 && !this.hasPassed;
  }

  hasPlayableMove(leftEnd: number | null, rightEnd: number | null): boolean {
    return this.dominos.some(domino => {
      const placement = Board.canPlaceDomino(domino, leftEnd, rightEnd);
      return placement !== 'none';
    });
  }

  hasWon(): boolean {
    return this.dominos.length === 0;
  }

  hasEmptyHand(): boolean {
    return this.dominos.length === 0;
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
    return this.dominos.reduce((sum, domino) => sum + domino.left + domino.right, 0);
  }

  calculateRoundScore(): number {
    return this.dominos.reduce((sum, domino) => sum + domino.left + domino.right, 0);
  }
}
