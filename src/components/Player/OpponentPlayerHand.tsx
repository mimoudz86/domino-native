import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import type { TurnUpdatedPayload } from '../../shared/GameEvent';
import { useActiveGameStore } from '../../store/gameStoreContext';

interface OpponentPlayerHandProps {
  playerId: number;
  orientation?: 'vertical' | 'horizontal';
  position?: 'bottom' | 'right' | 'top' | 'left';
}

/**
 * OpponentPlayerHand Component (React Native)
 *
 * Affiche la main d'un adversaire avec de petits carrés gris (dominos cachés)
 * Écoute TURN_UPDATED pour mettre à jour le dominoCount
 *
 * @param playerId - ID du joueur (0-3)
 * @param orientation - Orientation (horizontal/vertical)
 * @param position - Position du joueur
 */
export function OpponentPlayerHand({
  playerId,
  orientation = 'horizontal',
  position = 'bottom',
}: OpponentPlayerHandProps) {
  const { dispatcher } = useActiveGameStore();
  const [dominoCount, setDominoCount] = useState<number>(7); // Par défaut 7 dominos

  // 🎯 Écouter TURN_UPDATED pour mettre à jour le dominoCount
  useEffect(() => {
    if (!dispatcher) return;

    const unsubscribe = dispatcher.on('TURN_UPDATED', (state: TurnUpdatedPayload) => {
      // Trouver ce joueur dans la liste des joueurs
      const player = state.players.find(p => p.id === playerId);
      if (player) {
        setDominoCount(player.dominoCount);
      }
    });

    return () => unsubscribe();
  }, [dispatcher, playerId]);

  const isHorizontal =
    orientation === 'horizontal' || position === 'bottom' || position === 'top';

  const dominoBoxSize = isHorizontal
    ? { width: 14, height: 24 }
    : { width: 24, height: 14 };

  return (
    <View
      style={[
        styles.handContainer,
        isHorizontal ? styles.rowLayout : styles.colLayout,
      ]}
    >
      {Array.from({ length: dominoCount }).map((_, index) => (
        <View
          key={`opponent-domino-${playerId}-${index}`}
          style={[
            styles.dominoBox,
            {
              width: dominoBoxSize.width,
              height: dominoBoxSize.height,
            },
          ]}
        >
          <View style={styles.dominoBackDot} />
        </View>
      ))}

      {dominoCount === 0 && (
        <View style={styles.emptyState}>
          {/* Empty - no label needed */}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  handContainer: {
    gap: 2,
    alignItems: 'center',
  },
  rowLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colLayout: {
    flexDirection: 'column',
    flexWrap: 'wrap',
  },
  dominoBox: {
    backgroundColor: '#fbbf24',
    borderWidth: 1.5,
    borderColor: '#d97706',
    borderRadius: 3,
    opacity: 0.95,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 2,
  },
  dominoBackDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d97706',
  },
  emptyState: {
    width: '100%',
    height: 14,
  },
});
