import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLastPasser } from '../../store/gameSelectors';
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

  const passer = useLastPasser();
  const dispatcher = useActiveGameStore(state => state.dispatcher);

  useEffect(() => {
    // Si c'est un nouveau pass (joueur avec hasPassed = true et pas encore affiché)
    if (passer?.hasPassed === true && lastPassedIdRef.current !== passer?.id) {
      console.log(`LOG  [PASS-BADGE] ✅ SHOW_BADGE {"player":"${passer.name}"}`);
      lastPassedIdRef.current = passer.id;

      // Annuler le timer précédent si existant
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setDisplayName(passer.name);
      setIsVisible(true);

      // Timer 1500ms
      timerRef.current = setTimeout(() => {
        console.log(`LOG  [PASS-BADGE] ⏱️  HIDE_BADGE {"player":"${passer.name}"}`);
        setIsVisible(false);
        setDisplayName(null);
        lastPassedIdRef.current = null;

        // Notifier l'engine que le badge est caché
        console.log(`LOG  [PASS-BADGE] 📡 EMIT_PASS_HIDDEN {"player":"${passer.name}"}`);
        if (dispatcher) {
          dispatcher.emit({
            type: 'PASS_HIDDEN',
            payload: { playerId: passer.id }
          });
        }
      }, 1500);
    }
  }, [passer?.id]);

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
