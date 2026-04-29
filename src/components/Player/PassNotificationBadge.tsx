import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useActiveGameStore } from '../../store/gameStoreContext';

/**
 * PassNotificationBadge - Composant CENTRALISÉ pour React Native
 *
 * Logique:
 * 1. Si le joueur avec lastPlayerWhoPassedId a hasPassed = true
 * 2. → Affiche le badge 3000ms
 * 3. Sinon → n'affiche rien (après le timeout)
 */
export function PassNotificationBadge() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPassedIdRef = useRef<number | null>(null);

  const turnState = useActiveGameStore(state => state.turnState);
  const dispatcher = useActiveGameStore(state => state.dispatcher);

  useEffect(() => {
    // Trouver le joueur avec lastPlayerWhoPassedId
    const player = turnState?.players?.find(p => p.id === turnState?.lastPlayerWhoPassedId);

    // Si c'est un nouveau pass (lastPlayerWhoPassedId a changé)
    if (player?.hasPassed === true && lastPassedIdRef.current !== turnState?.lastPlayerWhoPassedId) {
      // [COMMENTED-v1] console.log(`[PASS-BADGE] ✅ Showing badge for ${player.name}`);
      lastPassedIdRef.current = turnState?.lastPlayerWhoPassedId ?? null;

      // Annuler le timer précédent si existant
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setDisplayName(player.name);
      setIsVisible(true);

      // Timer 1500ms
      timerRef.current = setTimeout(() => {
        // [COMMENTED-v1] console.log(`[PASS-BADGE] ⏱️ Hiding badge after 1500ms`);
        setIsVisible(false);
        setDisplayName(null);
        lastPassedIdRef.current = null;

        // Notifier l'engine que le badge est caché
        // [COMMENTED-v1] console.log(`[PASS-BADGE] 📡 Emitting PASS_HIDDEN event`, player.id);
        if (dispatcher) {
          dispatcher.emit({
            type: 'PASS_HIDDEN',
            payload: { playerId: player.id }
          });
        } else {
          // [COMMENTED-v1] console.log(`[PASS-BADGE] ⚠️ WARNING: Dispatcher not available!`);
        }
      }, 1500);
    }
  }, [turnState?.lastPlayerWhoPassedId]);

  if (!isVisible || !displayName) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.text}>{displayName} passe ⏭️</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  badge: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
