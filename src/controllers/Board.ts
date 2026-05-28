import type { Domino } from '../shared/models/Domino';
import { DominoModel } from '../shared/models/Domino';
import type { GamePlayer } from './GamePlayer';

export type PlacementType = 'left' | 'right' | 'both' | 'none';

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

  getDominoCount(): number {
    return this.playedDominos.length;
  }

  get left(): number | null {
    return this.isEmpty() ? null : this.openEndsValues[0];
  }

  get right(): number | null {
    return this.isEmpty() ? null : this.openEndsValues[1];
  }

  getEnds(): { leftEnd: number | null; rightEnd: number | null } {
    return {
      leftEnd: this.left,
      rightEnd: this.right
    };
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

  static canPlaceDomino(
    domino: Domino,
    leftEnd: number | null,
    rightEnd: number | null
  ): PlacementType {
    if (leftEnd === null || rightEnd === null) {
      return 'both';
    }

    if (domino.left === domino.right) {
      const matchLeft = domino.left === leftEnd;
      const matchRight = domino.left === rightEnd;

      if (matchLeft && matchRight) return 'both';
      if (matchLeft) return 'left';
      if (matchRight) return 'right';
      return 'none';
    }

    const dominoLeftMatchesLeftEnd = domino.left === leftEnd;
    const dominoRightMatchesLeftEnd = domino.right === leftEnd;
    const dominoLeftMatchesRightEnd = domino.left === rightEnd;
    const dominoRightMatchesRightEnd = domino.right === rightEnd;

    const canPlaceLeft = dominoLeftMatchesLeftEnd || dominoRightMatchesLeftEnd;
    const canPlaceRight = dominoLeftMatchesRightEnd || dominoRightMatchesRightEnd;

    if (canPlaceLeft && canPlaceRight) return 'both';
    if (canPlaceLeft) return 'left';
    if (canPlaceRight) return 'right';
    return 'none';
  }

  static getPlayableIndices(
    dominos: Domino[],
    leftEnd: number | null,
    rightEnd: number | null
  ): number[] {
    return dominos
      .map((domino, idx) => ({
        idx,
        placement: this.canPlaceDomino(domino, leftEnd, rightEnd)
      }))
      .filter(({ placement }) => placement !== 'none')
      .map(({ idx }) => idx);
  }

  static calculateNewEnds(
    domino: Domino,
    side: 'left' | 'right',
    currentLeftEnd: number | null,
    currentRightEnd: number | null
  ): { newLeftEnd: number; newRightEnd: number } {
    if (currentLeftEnd === null || currentRightEnd === null) {
      return {
        newLeftEnd: domino.left,
        newRightEnd: domino.right
      };
    }

    if (side === 'left') {
      return {
        newLeftEnd: domino.right,
        newRightEnd: currentRightEnd
      };
    } else {
      return {
        newLeftEnd: currentLeftEnd,
        newRightEnd: domino.left
      };
    }
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
