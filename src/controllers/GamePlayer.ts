import type { Domino } from '../shared/models/Domino';

export class GamePlayer {
  id: number;
  name: string;
  isAI: boolean;
  hand: Domino[] = [];
  score: number = 0;
  hasPassed: boolean = false;

  constructor(id: number, name: string, isAI: boolean = false) {
    this.id = id;
    this.name = name;
    this.isAI = isAI;
  }

  reset() {
    this.hand = [];
    this.score = 0;
    this.hasPassed = false;
  }

  removeDomino(domino: Domino): boolean {
    const idx = this.hand.findIndex(d => d.left === domino.left && d.right === domino.right);
    if (idx !== -1) {
      this.hand.splice(idx, 1);
      return true;
    }
    return false;
  }

  calculateHandValue(): number {
    return this.hand.reduce((sum, d) => sum + d.left + d.right, 0);
  }

  updateScore(): void {
    this.score = this.calculateHandValue();
  }
}
