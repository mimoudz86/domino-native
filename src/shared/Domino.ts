export interface Domino {
  left: number;
  right: number;
  swap(): Domino;
  isDouble(): boolean;
  matches(value: number): boolean;
  getOtherEnd(knownEnd: number): number;
  toString(): string;
  equals(other: Domino): boolean;
}

export class DominoModel implements Domino {
  left: number;
  right: number;

  constructor(left: number, right: number) {
    this.left = left;
    this.right = right;
  }

  isDouble(): boolean {
    return this.left === this.right;
  }

  matches(value: number): boolean {
    return this.left === value || this.right === value;
  }

  getOtherEnd(knownEnd: number): number {
    if (this.left === knownEnd) return this.right;
    if (this.right === knownEnd) return this.left;
    throw new Error(`Domino ${this.left}|${this.right} does not match ${knownEnd}`);
  }

  toString(): string {
    return `${this.left}|${this.right}`;
  }

  equals(other: Domino): boolean {
    return this.left === other.left && this.right === other.right;
  }

  swap(): DominoModel {
    return new DominoModel(this.right, this.left);
  }

  // Alias for UI compatibility
  swapForDisplay(): DominoModel {
    return this.swap();
  }

  static createStandardSet(): DominoModel[] {
    const dominoes: DominoModel[] = [];
    for (let left = 0; left < 7; left++) {
      for (let right = left; right < 7; right++) {
        dominoes.push(new DominoModel(left, right));
      }
    }
    return dominoes;
  }
}

// Helper: Convert server data to DominoModel
export function createDominoPresentation(data: any): DominoModel {
  return new DominoModel(data.left, data.right);
}
