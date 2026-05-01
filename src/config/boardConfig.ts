/**
 * Configuration centralisée du Board
 * Modifie ces paramètres pour tester différentes configurations
 * La largeur ET hauteur du wrapper se calculent AUTOMATIQUEMENT
 */

// Tailles de dominos horizontaux (width)
const DOMINO_WIDTHS = {
  small: 64,    // 64×32 horizontal
  medium: 72,   // 72×36 horizontal
  large: 80,    // 80×40 horizontal
} as const;

// Tailles de dominos verticaux (height)
const DOMINO_HEIGHTS = {
  small: 64,    // 32×64 vertical
  medium: 72,   // 36×72 vertical
  large: 80,    // 40×80 vertical
} as const;

const DOMINO_SIZE = 'small' as const; // ← MODIFIE ICI : 'small' | 'medium' | 'large'
const COLUMN_COUNT = 5; // 5 colonnes (upper, pivot-left, main, pivot-right, lower)
const MAIN_LINE_MAX = 9; // Nombre max de dominos en main-line

// Calcule automatiquement width, columnWidth et height
const dominoWidth = DOMINO_WIDTHS[DOMINO_SIZE];
const dominoHeight = DOMINO_HEIGHTS[DOMINO_SIZE];
const wrapperWidth = dominoWidth * COLUMN_COUNT;
const wrapperHeight = dominoHeight * MAIN_LINE_MAX;

/**
 * Calcule la hauteur réelle du wrapper selon les dominos en main-line
 * - Domino normal (vertical) : dominoHeight (80px pour large)
 * - Domino double (horizontal) : dominoHeight / 2 (40px pour large)
 */
export function calculateWrapperHeight(mainLineDominos: { left: number; right: number }[]) {
  const dominoHeight = DOMINO_HEIGHTS[DOMINO_SIZE];

  return mainLineDominos.reduce((total, domino) => {
    const isDouble = domino.left === domino.right;
    const height = isDouble ? dominoHeight / 2 : dominoHeight;
    return total + height;
  }, 0);
}

export const BOARD_CONFIG = {
  // Wrapper & Layout (calculé dynamiquement)
  wrapper: {
    width: wrapperWidth,           // Largeur auto : dominoWidth * 5
    height: wrapperHeight,         // Hauteur auto : dominoHeight * mainLineMax
    columnWidth: dominoWidth,      // Largeur auto : une colonne = un domino horizontal
    alignCenter: true,             // Centrer le wrapper sur l'écran
  },

  // Domino
  domino: {
    size: DOMINO_SIZE,  // ← CHANGE ICI : 'small' | 'medium' | 'large'
    // small : 64×32 (horiz) / 32×64 (vert)
    // medium : 72×36 (horiz) / 36×72 (vert)
    // large : 80×40 (horiz) / 40×80 (vert)
  },

  // Train Distribution
  train: {
    mainLineMax: MAIN_LINE_MAX,  // Nombre max de dominos sur la main-line (avant débordement)
  },

  // Colors (pour les partitions visuelles du test)
  colors: {
    'upper-line': '#E5F2FF',       // Bleu clair
    'left_up-position': '#FFCCCC', // Rose
    'main-line': '#FFE5CC',        // Orange clair
    'right_down-position': '#FFFFCC', // Jaune
    'lower-line': '#E5FFE5',       // Vert clair
    partition: '#000',             // Couleur des bordures (noir)
  },

  // Styles
  styles: {
    borderWidth: 2,  // Largeur des bordures entre colonnes
  },
};

/**
 * CONFIGURATIONS À TESTER
 *
 * CONFIG 1 - Compact (actuellement activée)
 * wrapper: { width: 320, columnWidth: 64 }
 * domino: { size: 'small' }
 *
 * CONFIG 2 - Medium
 * wrapper: { width: 360, columnWidth: 72 }
 * domino: { size: 'medium' }
 *
 * CONFIG 3 - Large
 * wrapper: { width: 400, columnWidth: 80 }
 * domino: { size: 'large' }
 *
 * CONFIG 4 - Main-line + dominos
 * train: { mainLineMax: 8 }  // Plus court
 * ou
 * train: { mainLineMax: 10 }  // Plus long
 */
