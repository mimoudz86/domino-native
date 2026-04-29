/**
 * AI_STRATEGIES UTILS
 * Fonctions centralisées pour l'analyse IA et les stratégies
 */

// ═════════════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════════════

export interface Domino {
  left: number;
  right: number;
}

export interface PipCount {
  0: number;
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  6: number;
}

export interface BoardStats {
  total: number;
  dominoCount: number;
  average: number;
}

export interface HandStats {
  total: number;
  dominoCount: number;
  average: number;
}

export interface HandClassification {
  total: number;
  weight: 'LIGHT' | 'BASELINE' | 'HEAVY';
  adaptiveStrategy: 'OFFENSIVE' | 'BALANCED' | 'DEFENSIVE';
  thresholds: {
    light: number;
    baseline: number;
    heavy: number;
  };
}

// ═════════════════════════════════════════════════════════════════
// CONSTANTES - HAND WEIGHT THRESHOLDS
// ═════════════════════════════════════════════════════════════════

/**
 * Seuils de poids de la main (points)
 * Basés sur: moyenne par joueur = 42 points ± 25%
 * 42 - 25% = 31.5 (LIGHT)
 * 42 (BASELINE)
 * 42 + 25% = 52.5 (HEAVY)
 */
export const HAND_WEIGHT = {
  LIGHT: 31.5,      // Main légère → stratégie OFFENSIVE
  BASELINE: 42.0,   // Main normale → stratégie BALANCED
  HEAVY: 52.5       // Main lourde → stratégie DEFENSIVE
};

// ═════════════════════════════════════════════════════════════════
// FONCTION 1: calculateHandCount
// ═════════════════════════════════════════════════════════════════

/**
 * Compte la fréquence de chaque pip (0-6) dans une main
 * @param hand - Array de dominos dans la main
 * @returns Compteur {0: count, 1: count, ..., 6: count}
 *
 * @example
 * const hand = [{left: 6, right: 5}, {left: 6, right: 4}];
 * const count = calculateHandCount(hand);
 * // count = {0: 0, 1: 0, 2: 0, 3: 0, 4: 1, 5: 1, 6: 2}
 */
export function calculateHandCount(hand: Domino[]): PipCount {
  const count: PipCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  for (const domino of hand) {
    count[domino.left as keyof PipCount]++;
    count[domino.right as keyof PipCount]++;
  }

  return count;
}

// ═════════════════════════════════════════════════════════════════
// FONCTION 2: calculateBoardCount
// ═════════════════════════════════════════════════════════════════

/**
 * Compte la fréquence de chaque pip (0-6) sur le board
 * @param boardDominos - Array de dominos joués sur le board
 * @returns Compteur {0: count, 1: count, ..., 6: count}
 *
 * @example
 * const board = [{left: 6, right: 5}, {left: 5, right: 1}];
 * const count = calculateBoardCount(board);
 * // count = {0: 0, 1: 1, 2: 0, 3: 0, 4: 0, 5: 2, 6: 1}
 */
export function calculateBoardCount(boardDominos: Domino[]): PipCount {
  const count: PipCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  for (const domino of boardDominos) {
    count[domino.left as keyof PipCount]++;
    count[domino.right as keyof PipCount]++;
  }

  return count;
}

// ═════════════════════════════════════════════════════════════════
// FONCTION 3: calculateBoardStats
// ═════════════════════════════════════════════════════════════════

/**
 * Calcule le total et la moyenne des points sur le board
 * @param boardDominos - Array de dominos joués
 * @returns {total, dominoCount, average}
 *
 * @example
 * const stats = calculateBoardStats([{left: 6, right: 5}]);
 * // returns {total: 11, dominoCount: 1, average: 11.0}
 */
export function calculateBoardStats(boardDominos: Domino[]): BoardStats {
  if (!boardDominos || boardDominos.length === 0) {
    return {
      total: 0,
      dominoCount: 0,
      average: 0
    };
  }

  const total = boardDominos.reduce((sum, domino) => {
    return sum + domino.left + domino.right;
  }, 0);

  const dominoCount = boardDominos.length;
  const average = parseFloat((total / dominoCount).toFixed(2));

  return { total, dominoCount, average };
}

// ═════════════════════════════════════════════════════════════════
// FONCTION 4: calculateHandStats
// ═════════════════════════════════════════════════════════════════

/**
 * Calcule le total et la moyenne des points dans une main
 * @param hand - Array de dominos en main
 * @returns {total, dominoCount, average}
 *
 * @example
 * const stats = calculateHandStats([{left: 6, right: 5}, {left: 6, right: 6}]);
 * // returns {total: 23, dominoCount: 2, average: 11.5}
 */
export function calculateHandStats(hand: Domino[]): HandStats {
  if (!hand || hand.length === 0) {
    return {
      total: 0,
      dominoCount: 0,
      average: 0
    };
  }

  const total = hand.reduce((sum, domino) => {
    return sum + domino.left + domino.right;
  }, 0);

  const dominoCount = hand.length;
  const average = parseFloat((total / dominoCount).toFixed(2));

  return { total, dominoCount, average };
}

// ═════════════════════════════════════════════════════════════════
// FONCTION 5: classifyHandWeight
// ═════════════════════════════════════════════════════════════════

/**
 * Classifie le poids (total des points) d'une main
 * Détermine si la main est légère, normale ou lourde
 * @param handTotal - Total des points dans la main
 * @returns Classification avec stratégie adaptée
 *
 * @example
 * const classification = classifyHandWeight(25);
 * // returns {
 * //   total: 25,
 * //   weight: 'LIGHT',
 * //   adaptiveStrategy: 'OFFENSIVE',
 * //   thresholds: {light: 31.5, baseline: 42, heavy: 52.5}
 * // }
 */
export function classifyHandWeight(handTotal: number): HandClassification {
  let weight: 'LIGHT' | 'BASELINE' | 'HEAVY';
  let adaptiveStrategy: 'OFFENSIVE' | 'BALANCED' | 'DEFENSIVE';

  if (handTotal < HAND_WEIGHT.LIGHT) {
    weight = 'LIGHT';
    adaptiveStrategy = 'OFFENSIVE'; // On gagne → attaquons
  } else if (handTotal <= HAND_WEIGHT.HEAVY) {
    weight = 'BASELINE';
    adaptiveStrategy = 'BALANCED'; // Situation normale
  } else {
    weight = 'HEAVY';
    adaptiveStrategy = 'DEFENSIVE'; // On perd → défendons-nous
  }

  return {
    total: handTotal,
    weight,
    adaptiveStrategy,
    thresholds: {
      light: HAND_WEIGHT.LIGHT,
      baseline: HAND_WEIGHT.BASELINE,
      heavy: HAND_WEIGHT.HEAVY
    }
  };
}

// ═════════════════════════════════════════════════════════════════
// FONCTION 6: evaluateDomino
// ═════════════════════════════════════════════════════════════════

/**
 * Évalue un domino selon la stratégie choisie
 * @param domino - Le domino à évaluer
 * @param hand - La main complète du joueur
 * @param boardDominos - Les dominos actuels sur le board
 * @param strategy - La stratégie ('size', 'hand-frequency', 'doubles', 'board-frequency', etc.)
 * @param boardLeftEnd - La valeur à gauche du board (optionnel, pour SMART)
 * @param boardRightEnd - La valeur à droite du board (optionnel, pour SMART)
 * @returns Le score d'évaluation du domino
 */
export function evaluateDomino(
  domino: Domino,
  hand: Domino[],
  boardDominos: Domino[],
  strategy: string = 'size',
  boardLeftEnd?: number,
  boardRightEnd?: number
): number {
  const handCount = calculateHandCount(hand);
  const boardCount = calculateBoardCount(boardDominos);

  const dominoScore = domino.left + domino.right;
  const isDouble = domino.left === domino.right ? 1 : 0;
  const leftHandFreq = handCount[domino.left as keyof PipCount];
  const rightHandFreq = handCount[domino.right as keyof PipCount];
  const totalHandFreq = leftHandFreq + rightHandFreq;
  const leftBoardFreq = boardCount[domino.left as keyof PipCount];
  const rightBoardFreq = boardCount[domino.right as keyof PipCount];
  const totalBoardFreq = leftBoardFreq + rightBoardFreq;

  // STRATÉGIES SIMPLES
  if (strategy === 'size') {
    return dominoScore;
  } else if (strategy === 'hand-frequency') {
    return totalHandFreq * 25 + dominoScore;
  } else if (strategy === 'doubles') {
    return isDouble * 25 + dominoScore;
  } else if (strategy === 'board-frequency') {
    return totalBoardFreq * 25 + dominoScore;
  }

  // STRATÉGIES MIXTES
  else if (strategy === 'balanced') {
    const size = dominoScore;
    const handFreq = totalHandFreq * 25;
    const doubleBonus = isDouble * 25;
    const boardFreq = totalBoardFreq * 25;
    return (size + handFreq + doubleBonus + boardFreq) / 4;
  } else if (strategy === 'aggressive') {
    const size = dominoScore * 0.4;
    const doubleBonus = isDouble * 25 * 0.4;
    const handFreq = totalHandFreq * 25 * 0.1;
    const boardFreq = totalBoardFreq * 25 * 0.1;
    return size + doubleBonus + handFreq + boardFreq;
  } else if (strategy === 'defensive') {
    const handFreq = totalHandFreq * 25 * 0.4;
    const boardFreq = totalBoardFreq * 25 * 0.4;
    const size = dominoScore * 0.1;
    const doubleBonus = isDouble * 25 * 0.1;
    return handFreq + boardFreq + size + doubleBonus;
  } else if (strategy === 'smart') {
    const size = dominoScore;
    const handFreq = totalHandFreq * 25;
    const doubleBonus = isDouble * 25;
    const boardFreq = totalBoardFreq * 25;

    // Calculer le facteur de blocage (0-1)
    const blockageLeft = boardLeftEnd ? boardCount[boardLeftEnd as keyof PipCount] || 0 : 0;
    const blockageRight = boardRightEnd ? boardCount[boardRightEnd as keyof PipCount] || 0 : 0;
    const blockageFactor = (blockageLeft + blockageRight) / 16;

    if (blockageFactor > 0.5) {
      // Jeu bloqué → Agressif
      return size * 0.5 + doubleBonus * 0.3 + handFreq * 0.1 + boardFreq * 0.1;
    } else {
      // Jeu fluide → Défensif
      return handFreq * 0.4 + boardFreq * 0.4 + size * 0.1 + doubleBonus * 0.1;
    }
  }

  return dominoScore;
}

// ═════════════════════════════════════════════════════════════════
// Export complet
// ═════════════════════════════════════════════════════════════════

export default {
  // Constantes
  HAND_WEIGHT,

  // Fonctions d'analyse
  calculateHandCount,
  calculateBoardCount,
  calculateBoardStats,
  calculateHandStats,

  // Fonctions de classification
  classifyHandWeight,

  // Fonctions d'évaluation
  evaluateDomino
};