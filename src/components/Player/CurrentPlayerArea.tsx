import React from 'react';
import { View, StyleSheet } from 'react-native';
import { getPlayerColor } from '../../utils/avatarGenerator';
import { usePlayerById } from '../../store/gameSelectors';
// import { usePlayerFlash } from '../../hooks/usePlayerFlash';
import { PlayerInfo } from './PlayerInfo';
import { PlayerHand } from './PlayerHand';

interface CurrentPlayerAreaProps {
  playerId: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * CurrentPlayerArea Component (React Native)
 *
 * Affiche la main du joueur actuel (local player) avec accès complet aux dominos.
 * Les dominos sont visibles et interactifs.
 *
 * @param playerId - ID du joueur (0-3)
 * @param position - Position du joueur sur l'écran
 */
export function CurrentPlayerArea({
  playerId,
  position = 'bottom',
}: CurrentPlayerAreaProps) {
  const playerInfo = usePlayerById(playerId);

  const playerColor = getPlayerColor(playerId);
  const orientation = position === 'bottom' || position === 'top' ? 'horizontal' : 'vertical';
  const containerStyle = getContainerStyle(position);

  // Flash hook désactivé
  // const { borderColor: flashBorderColor, flashOpacity } = usePlayerFlash(playerId, {
  //   enabled: true,
  //   cycleDuration: 3000,
  // });

  return (
    <View style={[
      styles.container,
      styles.horizontalLayout,
      {
        borderColor: playerColor,
        shadowColor: playerColor,
        opacity: 1,
      },
    ]}>
      {/* PlayerInfo - Avatar + nom du joueur local */}
      <View style={styles.infoSection}>
        <PlayerInfo playerId={playerId} player={playerInfo as any} />
      </View>

      {/* Main du joueur local avec dominos visibles */}
      <View style={styles.handSection}>
        <PlayerHand
          playerId={playerId}
          orientation="vertical"
          position={position}
        />
      </View>
    </View>
  );
}

/**
 * Détermine le style du conteneur selon la position
 */
function getContainerStyle(position: 'top' | 'bottom' | 'left' | 'right') {
  const baseStyle = [styles.baseContainer];

  switch (position) {
    case 'bottom':
      return [...baseStyle, styles.positionBottom];
    case 'top':
      return [...baseStyle, styles.positionTop];
    case 'left':
      return [...baseStyle, styles.positionLeft];
    case 'right':
      return [...baseStyle, styles.positionRight];
    default:
      return baseStyle;
  }
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderColor: '#fbbf24',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#2a8055',
    flex: 1,
    width: '100%',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  horizontalLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  baseContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  positionBottom: {
    flexDirection: 'column',
    width: '100%',
    height: 'auto',
  },
  positionTop: {
    flexDirection: 'column-reverse',
    width: '100%',
    height: 'auto',
  },
  positionLeft: {
    flexDirection: 'row-reverse',
    height: '100%',
    width: 'auto',
  },
  positionRight: {
    flexDirection: 'row',
    height: '100%',
    width: 'auto',
  },
  infoSection: {
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRightWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handSection: {
    flex: 1,
    padding: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
