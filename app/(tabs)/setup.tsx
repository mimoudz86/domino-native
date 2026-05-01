import { useRouter } from 'expo-router';
import { MatchSetupScreen } from '@/screens/MatchSetupScreen';
import { useState, useEffect } from 'react';
import { useActiveGameStore } from '@/store/gameStoreContext';
import type { MatchConfig } from '@/types/MatchConfig';
import type { MatchState } from '@/controllers/MatchManager';

export default function MatchSetupScreenWrapper() {
  const router = useRouter();
  const { initGame, resetGame, getMatchState } = useActiveGameStore();
  const [existingMatch, setExistingMatch] = useState<MatchState | null>(null);

  useEffect(() => {
    // Charger l'état du match existant au montage
    const loadExistingMatch = async () => {
      const matchState = await getMatchState();
      if (matchState && matchState.currentGameNumber > 0 && !matchState.matchFinished) {
        setExistingMatch(matchState);
      }
    };
    loadExistingMatch();
  }, [getMatchState]);

  const handleStartNewMatch = async (config: MatchConfig) => {
    console.log(`[MATCH-SETUP] Starting new match:`, config);
    // Réinitialiser et démarrer avec nouvelle config
    resetGame();
    await initGame(undefined, undefined, config);
    router.push('/game');
  };

  const handleContinueMatch = async () => {
    console.log(`[MATCH-SETUP] Continuing match`);
    // Relancer avec la config existante (depuis la BDD)
    await initGame();
    router.push('/game');
  };

  return (
    <MatchSetupScreen
      onStartNewMatch={handleStartNewMatch}
      onContinueMatch={handleContinueMatch}
      existingMatch={existingMatch}
    />
  );
}
