/**
 * Avatar Generator Utility
 * Génère des avatars SVG colorés localement sans dépendre du serveur
 */

const PLAYER_COLORS = [
  { bg: '#ff6b6b', initials: 'P0', name: 'Red' },
  { bg: '#4ecdc4', initials: 'P1', name: 'Teal' },
  { bg: '#45b7d1', initials: 'P2', name: 'Blue' },
  { bg: '#f9ca24', initials: 'P3', name: 'Yellow' },
];

export interface AvatarConfig {
  playerId: number;
  playerName: string;
  size?: number;
}

/**
 * Génère un avatar SVG basé sur l'ID du joueur et son nom
 * @param config Configuration de l'avatar
 * @returns Data URL du SVG
 */
export function generatePlayerAvatar(config: AvatarConfig): string {
  const { playerId, playerName, size = 100 } = config;

  // Sélectionner la couleur basée sur l'ID
  const colorConfig = PLAYER_COLORS[playerId % PLAYER_COLORS.length];

  // Obtenir les initiales du nom
  const initials = playerName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Créer le SVG
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
      <!-- Fond circulaire -->
      <circle cx="50" cy="50" r="50" fill="${colorConfig.bg}"/>

      <!-- Border -->
      <circle cx="50" cy="50" r="50" fill="none" stroke="#2c1810" stroke-width="2"/>

      <!-- Texte (initiales) -->
      <text
        x="50"
        y="65"
        font-size="40"
        fill="white"
        text-anchor="middle"
        font-weight="bold"
        font-family="Arial, sans-serif"
      >
        ${initials || playerName.charAt(0).toUpperCase()}
      </text>
    </svg>
  `;

  // Convertir en Data URL
  const encoded = encodeURIComponent(svg.trim());
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Retourne la couleur du joueur par équipe
 * Équipe 1 (Alice + Charlie): playerId 0 et 2
 * Équipe 2 (Bob + Diana): playerId 1 et 3
 */
export function getPlayerColor(playerId: number): string {
  // Regrouper par équipe
  const teamColors: { [key: number]: string } = {
    0: '#ff6b6b', // Alice - Red
    1: '#4ecdc4', // Bob - Teal
    2: '#ff6b6b', // Charlie - Red (même que Alice)
    3: '#4ecdc4', // Diana - Teal (même que Bob)
  };

  return teamColors[playerId] || PLAYER_COLORS[playerId % PLAYER_COLORS.length].bg;
}

/**
 * Retourne tous les joueurs avec leurs avatars
 */
export const PLAYER_CONFIG = PLAYER_COLORS.map((color, idx) => ({
  playerId: idx,
  color: color.bg,
  name: color.name,
}));
