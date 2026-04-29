/**
 * Utilitaires pour calculer les positions relatives des joueurs
 * dans l'interface multi-joueur.
 *
 * Principe: Chaque joueur se voit toujours en position BOTTOM,
 * et les autres joueurs sont positionnés relativement à lui.
 */

/**
 * Calcule la position UI d'un joueur relativement au joueur local
 *
 * @param playerId - ID du joueur à positionner (0-3)
 * @param thisPlayerId - ID du joueur local (0-3)
 * @returns Position UI: 'bottom' | 'right' | 'top' | 'left'
 *
 * @example
 * // Alice (thisPlayerId=0) regarde Bob (playerId=1)
 * getRelativePosition(1, 0) // → 'right'
 *
 * // Bob (thisPlayerId=1) regarde Alice (playerId=0)
 * getRelativePosition(0, 1) // → 'left'
 */
export function getRelativePosition(
  playerId: number,
  thisPlayerId: number
): 'bottom' | 'right' | 'top' | 'left' {
  const relativeIndex = (playerId - thisPlayerId + 4) % 4;
  const positionMap: ('bottom' | 'right' | 'top' | 'left')[] = [
    'bottom',  // 0: moi-même (toujours en bas)
    'right',   // 1: joueur suivant (à droite)
    'top',     // 2: en face (en haut)
    'left'     // 3: à gauche
  ];
  return positionMap[relativeIndex];
}

/**
 * Retourne quel playerId doit être affiché à une position UI donnée
 *
 * @param position - Position UI cible ('bottom' | 'right' | 'top' | 'left')
 * @param thisPlayerId - ID du joueur local (0-3)
 * @returns playerId (0-3) qui doit être affiché à cette position
 *
 * @example
 * // Alice (thisPlayerId=0) veut savoir qui afficher en position RIGHT
 * getPlayerIdAtPosition('right', 0) // → 1 (Bob)
 *
 * // Bob (thisPlayerId=1) veut savoir qui afficher en position BOTTOM
 * getPlayerIdAtPosition('bottom', 1) // → 1 (lui-même)
 */
export function getPlayerIdAtPosition(
  position: 'bottom' | 'right' | 'top' | 'left',
  thisPlayerId: number
): number {
  const positionToOffset = {
    bottom: 0,  // Moi-même
    right: 1,   // thisPlayerId + 1
    top: 2,     // thisPlayerId + 2
    left: 3     // thisPlayerId + 3
  };
  const offset = positionToOffset[position];
  return (thisPlayerId + offset) % 4;
}