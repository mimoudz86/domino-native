import type { Domino } from '../shared/models/Domino';
import type { Board } from './Board';

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

  canPlay(board: Board): boolean {
    const playableResult = board.getPlayableDominos(this.hand);
    return playableResult.totalChoice > 0 && !this.hasPassed;
  }

  getRemainingPips(): number {
    return this.hand.reduce((sum, domino) => sum + domino.left + domino.right, 0);
  }
}
