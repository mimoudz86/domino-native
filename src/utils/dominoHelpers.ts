import type { Domino } from '../shared/Domino';

export function canDominoMatch(domino: Domino, value: number): boolean {
  return domino.left === value || domino.right === value;
}

export function getMatchingSide(domino: Domino, value: number): 'left' | 'right' | null {
  if (domino.left === value) return 'left';
  if (domino.right === value) return 'right';
  return null;
}

export function getDominoString(domino: Domino): string {
  return `${domino.left}|${domino.right}`;
}

export function areDominosEqual(domino1: Domino, domino2: Domino): boolean {
  return domino1.left === domino2.left && domino1.right === domino2.right;
}

export function rotateDomino(domino: Domino, degrees: number): { rotation: number; transform: string } {
  const rotation = degrees % 360;
  const transform = `rotate(${rotation}deg)`;
  return { rotation, transform };
}

export function getPlayableStatus(
  domino: Domino,
  leftEnd: number | null,
  rightEnd: number | null
): 'left' | 'right' | 'both' | 'none' {
  if (leftEnd === null || rightEnd === null) {
    return 'both';
  }

  const matchesLeft = domino.left === leftEnd || domino.right === leftEnd;
  const matchesRight = domino.left === rightEnd || domino.right === rightEnd;

  if (matchesLeft && matchesRight) {
    return 'both';
  }
  if (matchesLeft) {
    return 'left';
  }
  if (matchesRight) {
    return 'right';
  }
  return 'none';
}

export function isDouble(domino: Domino): boolean {
  return domino.left === domino.right;
}
