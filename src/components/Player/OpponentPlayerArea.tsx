import React from 'react';
import { View, StyleSheet } from 'react-native';
import { getPlayerColor } from '../../utils/avatarGenerator';
import { usePlayerById } from '../../store/gameSelectors';
// import { usePlayerFlash } from '../../hooks/usePlayerFlash';
import { PlayerInfo } from './PlayerInfo';
import { OpponentPlayerHand } from './OpponentPlayerHand';

interface OpponentPlayerAreaProps {
  playerId: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * OpponentPlayerArea Component (React Native)
 *
 * Affiche les autres joueurs avec:
 * - Avatar + nom
 * - Main cachée (petits carrés gris)
 *
 * Écoute TURN_UPDATED pour mettre à jour les données des adversaires
 *
 * @param playerId - ID du joueur (0-3)
 * @param position - Position du joueur sur l'écran
 */
export function OpponentPlayerArea({
  playerId,
  position = 'bottom',
}: OpponentPlayerAreaProps) {
  const playerState = usePlayerById(playerId);

  const playerColor = getPlayerColor(playerId);
  const orientation = position === 'bottom' || position === 'top' ? 'horizontal' : 'vertical';
  const layoutStyle = position === 'top' ? styles.topLayout : styles.columnLayout;

  return (
    <View style={[
      styles.container,
      layoutStyle,
      {
        borderColor: playerColor,
        opacity: 1,
      },
    ]}>
      {/* PlayerInfo - Avatar + nom (toujours en haut) */}
      <View style={styles.infoSection}>
        <PlayerInfo playerId={playerId} player={playerState} />
      </View>

      {/* Main cachée avec petits carrés gris */}
      <View style={styles.handSection}>
        <OpponentPlayerHand
          playerId={playerId}
          orientation={orientation}
          position={position}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 0.5,
    borderColor: '#fbbf24',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(107, 68, 35, 0.6)',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  columnLayout: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    alignSelf: 'center',
  },
  topLayout: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    alignSelf: 'center',
  },
  infoSection: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handSection: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 1,
  },
});
