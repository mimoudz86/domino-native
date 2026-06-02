import type { Domino } from '../shared/Domino';

export interface Player {
  id: number;
  dominos: Domino[];
  hasPassed?: boolean;
  score?: number;
}

export class GameCoreLogic {
  static canPlaceDomino(
    domino: Domino,
    side: 'left' | 'right',
    leftEnd: number | null,
    rightEnd: number | null
  ): boolean {
    if (leftEnd === null || rightEnd === null) {
      return true;
    }

    if (side === 'left') {
      return domino.left === leftEnd || domino.right === leftEnd;
    } else {
      return domino.right === rightEnd || domino.left === rightEnd;
    }
  }

  static getPlayableDominos(
    hand: Domino[],
    leftEnd: number | null,
    rightEnd: number | null
  ): Array<[Domino, ('left' | 'right')[]]> {
    if (leftEnd === null || rightEnd === null) {
      return hand.map(d => [d, ['left', 'right']]);
    }

    const playable: Array<[Domino, ('left' | 'right')[]]> = [];

    for (const domino of hand) {
      const sides: ('left' | 'right')[] = [];

      if (domino.left === leftEnd || domino.right === leftEnd) {
        sides.push('left');
      }
      if (domino.right === rightEnd || domino.left === rightEnd) {
        sides.push('right');
      }

      if (sides.length > 0) {
        playable.push([domino, sides]);
      }
    }

    return playable;
  }

  static checkEndConditions(
    players: Player[]
  ): { isEnded: boolean; winnerId?: number; winningType?: 'EMPTY_HAND' | 'BLOCKED_GAME' } {
    for (const player of players) {
      if (player.dominos.length === 0) {
        return {
          isEnded: true,
          winnerId: player.id,
          winningType: 'EMPTY_HAND'
        };
      }
    }

    if (players.every(p => p.hasPassed)) {
      const winner = this.findLowestPips(players);
      return {
        isEnded: true,
        winnerId: winner.id,
        winningType: 'BLOCKED_GAME'
      };
    }

    return { isEnded: false };
  }

  static findLowestPips(players: Player[]): Player {
    return players.reduce((min, current) => {
      const minPips = min.dominos.reduce((sum, d) => sum + d.left + d.right, 0);
      const currentPips = current.dominos.reduce((sum, d) => sum + d.left + d.right, 0);
      return currentPips < minPips ? current : min;
    });
  }

  static calculatePips(hand: Domino[]): number {
    return hand.reduce((sum, d) => sum + d.left + d.right, 0);
  }

  static calculateScores(players: Player[]): void {
    players.forEach(player => {
      const pips = player.dominos.reduce((sum, d) => sum + d.left + d.right, 0);
      player.score = pips;
    });
  }

  static findFirstPlayerWithDoubleSix(players: Player[]): number {
    for (let i = 0; i < players.length; i++) {
      const hasDoubleSix = players[i].dominos.some(d => d.left === 6 && d.right === 6);
      if (hasDoubleSix) {
        return i;
      }
    }
    return -1;
  }

  static getEnds(
    trainOnBoard: Array<{ domino: Domino }>
  ): { leftEnd: number | null; rightEnd: number | null } {
    if (trainOnBoard.length === 0) {
      return { leftEnd: null, rightEnd: null };
    }
    return {
      leftEnd: trainOnBoard[0].domino.left,
      rightEnd: trainOnBoard[trainOnBoard.length - 1].domino.right
    };
  }

  static swapDomino(
    domino: Domino,
    side: 'left' | 'right',
    leftEnd: number | null,
    rightEnd: number | null
  ): Domino {
    if (side === 'left' && leftEnd === domino.left) {
      return domino.swap();
    } else if (side === 'right' && rightEnd === domino.right) {
      return domino.swap();
    }
    return domino;
  }

  static addToTrainOnBoard(
    trainOnBoard: Array<{ domino: Domino }>,
    domino: Domino,
    side: 'left' | 'right'
  ): Array<{ domino: Domino }> {
    const newTrain = [...trainOnBoard];
    if (newTrain.length === 0) {
      newTrain.push({ domino });
    } else if (side === 'left') {
      newTrain.unshift({ domino });
    } else {
      newTrain.push({ domino });
    }
    return newTrain;
  }
}
