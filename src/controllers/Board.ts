import type { Domino } from '../shared/models/Domino';
import { DominoModel } from '../shared/models/Domino';
import type { GamePlayer } from './GamePlayer';

export class Board {
  playedDominos: Domino[] = [];
  openEndsValues: number[] = [];

  reset() {
    this.playedDominos = [];
    this.openEndsValues = [];
  }

  isEmpty(): boolean {
    return this.playedDominos.length === 0;
  }

  getDominoesCount(): number {
    return this.playedDominos.length;
  }

  get left(): number | null {
    return this.isEmpty() ? null : this.openEndsValues[0];
  }

  get right(): number | null {
    return this.isEmpty() ? null : this.openEndsValues[1];
  }

  playDomino(domino: Domino, side: 'left' | 'right'): boolean {
    if (this.isEmpty()) {
      this.playedDominos.push(domino);
      this.openEndsValues = [domino.left, domino.right];
      return true;
    }

    if (side === 'left') {
      if (domino.right === this.left) {
        this.playedDominos.unshift(domino);
        this.openEndsValues[0] = domino.left;
        return true;
      }
      if (domino.left === this.left) {
        const swapped = domino.swap();
        this.playedDominos.unshift(swapped);
        this.openEndsValues[0] = swapped.left;
        return true;
      }
    } else if (side === 'right') {
      if (domino.left === this.right) {
        this.playedDominos.push(domino);
        this.openEndsValues[1] = domino.right;
        return true;
      }
      if (domino.right === this.right) {
        const swapped = domino.swap();
        this.playedDominos.push(swapped);
        this.openEndsValues[1] = swapped.right;
        return true;
      }
    }

    return false;
  }

  getPlayableDominos(hand: Domino[]): { playable: [Domino, string[]][]; notPlayable: Domino[]; totalChoice: number } {
    const result = {
      playable: [] as [Domino, string[]][],
      notPlayable: [] as Domino[],
      totalChoice: 0
    };

    if (this.isEmpty()) {
      result.playable = hand.map(d => [d, ['left', 'right']]);
      result.totalChoice = hand.length;
      return result;
    }

    for (const domino of hand) {
      const sides: string[] = [];

      if (domino.left === this.left || domino.right === this.left) {
        sides.push('left');
      }

      if (domino.left === this.right || domino.right === this.right) {
        sides.push('right');
      }

      if (sides.length > 0) {
        result.playable.push([domino, sides]);
        result.totalChoice++;
      } else {
        result.notPlayable.push(domino);
      }
    }

    return result;
  }

  static shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  static distribute(players: GamePlayer[]): void {
    const dominoes = DominoModel.createStandardSet();
    Board.shuffle(dominoes);
    for (let i = 0; i < players.length; i++) {
      players[i].hand = dominoes.slice(i * 7, (i + 1) * 7);
    }
  }
}
