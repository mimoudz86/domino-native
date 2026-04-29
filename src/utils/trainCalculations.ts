import type { Domino } from '../shared/models/Domino';
import type { TrainLineType, TrainSlot } from '../types/train.types';
import { BOARD_CONFIG } from '../config/boardConfig';

// Constante d'ajustement pour alignement des pivots (16, 18, 20)
const ADJUSTMENT = (() => {
  const DOMINO_HEIGHTS = {
    small: 64,    // 64 / 4 = 16
    medium: 72,   // 72 / 4 = 18
    large: 80,    // 80 / 4 = 20
  } as const;
  return DOMINO_HEIGHTS[BOARD_CONFIG.domino.size] / 4;
})();

/**
 * Distribue les dominos aux lignes en préservant l'ordre du train
 *
 * Ordre du train: [upper..., pivot-gauche, main-line(MAIN_MAX), pivot-droit, lower...]
 *
 * Exemples avec MAIN_MAX=9:
 * - 8 dominos: [main-0 à 7]
 * - 9 dominos: [pivot-gauche(0), main-0 à 7(1-8)]
 * - 10 dominos: [pivot-gauche(0), main-0 à 7(1-8), pivot-droit(9)]
 * - 11 dominos: [upper(0), pivot-gauche(1), main-0 à 7(2-9), pivot-droit(10)]
 * - 12 dominos: [upper(0), pivot-gauche(1), main-0 à 7(2-9), pivot-droit(10), lower(11)]
 */
export function distributeToLines(totalDominos: number): TrainLineType[] {
  const lines = new Array(totalDominos).fill('main-line');
  const MAIN_MAX = BOARD_CONFIG.train.mainLineMax;

  if (totalDominos <= MAIN_MAX) {
    return lines;
  }

  let remaining = totalDominos - MAIN_MAX;

  let hasPivotLeft = false;
  let hasPivotRight = false;
  let upperCount = 0;
  let lowerCount = 0;

  if (remaining >= 1) {
    hasPivotLeft = true;
    remaining--;
  }
  if (remaining >= 1) {
    hasPivotRight = true;
    remaining--;
  }

  upperCount = Math.ceil(remaining / 2);
  lowerCount = Math.floor(remaining / 2);

  let idx = 0;

  for (let i = 0; i < upperCount; i++) {
    lines[idx++] = 'upper-line';
  }

  if (hasPivotLeft) {
    lines[idx++] = 'left_up-position';
  }

  for (let i = 0; i < MAIN_MAX; i++) {
    lines[idx++] = 'main-line';
  }

  if (hasPivotRight) {
    lines[idx++] = 'right_down-position';
  }

  for (let i = 0; i < lowerCount; i++) {
    lines[idx++] = 'lower-line';
  }

  return lines;
}

export function buildTrainSlots(
  placedDominos: { domino: Domino }[]
): TrainSlot[] {
  const lines = distributeToLines(placedDominos.length);
  return placedDominos.map((pd, index) => ({
    domino: pd.domino,
    line: lines[index],
    index,
  }));
}

/**
 * Détecte les doubles dans une ligne
 */
function getLineDoubleStatus(slots: TrainSlot[]): boolean[] {
  return slots.map(slot => slot.domino.left === slot.domino.right);
}

/**
 * Détecte le pattern de doubles dans une ligne
 */
function detectDoubleCase(
  doubles: boolean[]
): 'NoDouble' | 'FirstAndLastAreDoubles' | 'FirstDouble' | 'LastDouble' | 'SomeDoubleSomewhereElse' {
  if (doubles.length === 0) return 'NoDouble';

  const hasAnyDouble = doubles.some(d => d);
  if (!hasAnyDouble) return 'NoDouble';

  const firstIsDouble = doubles[0];
  const lastIsDouble = doubles[doubles.length - 1];

  if (firstIsDouble && lastIsDouble) return 'FirstAndLastAreDoubles';
  if (firstIsDouble) return 'FirstDouble';
  if (lastIsDouble) return 'LastDouble';

  return 'SomeDoubleSomewhereElse';
}

/**
 * Calcule les ajustements entre main-line et pivots
 * selon les patterns de doubles dans la main-line
 */
export function calculateLineAdjustments(slots: TrainSlot[] | null | undefined): {
  left: number;
  right: number;
} {
  if (!slots || !Array.isArray(slots)) {
    return { left: 0, right: 0 };
  }

  const mainLineSlots = slots.filter(s => s.line === 'main-line');
  const mainDoubles = getLineDoubleStatus(mainLineSlots);
  const mainCase = detectDoubleCase(mainDoubles);

  let result = { left: 0, right: 0 };

  switch (mainCase) {
    case 'NoDouble':
      result = { left: 0, right: 0 };
      break;
    case 'FirstAndLastAreDoubles':
      result = { left: 0, right: 0 };
      break;
    case 'FirstDouble':
      result = { left: 0, right: -ADJUSTMENT };
      break;
    case 'LastDouble':
      result = { left: ADJUSTMENT, right: 0 };
      break;
    case 'SomeDoubleSomewhereElse':
      result = { left: ADJUSTMENT, right: -ADJUSTMENT };
      break;
  }

  return result;
}

/**
 * Calcule les ajustements entre pivots et upper/lower lines
 * selon les patterns de doubles dans ces lignes
 */
export function calculateExtraLineAdjustments(slots: TrainSlot[] | null | undefined): {
  upper: number;
  lower: number;
} {
  if (!slots || !Array.isArray(slots)) {
    return { upper: 0, lower: 0 };
  }

  const upperLineSlots = slots.filter(s => s.line === 'upper-line');
  const lowerLineSlots = slots.filter(s => s.line === 'lower-line');

  const upperDoubles = getLineDoubleStatus(upperLineSlots);
  const lowerDoubles = getLineDoubleStatus(lowerLineSlots);

  const upperCase = detectDoubleCase(upperDoubles);
  const lowerCase = detectDoubleCase(lowerDoubles);

  // NoDouble doit avoir le même effet que SomeDoubleSomewhereElse
  // Seul LastDouble n'a pas besoin d'ajustement
  let upper = 0;
  // if (!(upperCase === 'NoDouble' || upperCase === 'LastDouble')) {
  if (upperCase !== 'LastDouble') {
    upper = ADJUSTMENT;
  }

  let lower = 0;
  // if (!(lowerCase === 'NoDouble' || lowerCase === 'LastDouble')) {
  if (lowerCase !== 'FirstDouble') {
    lower = -ADJUSTMENT;
  }

  return { upper, lower };
}
