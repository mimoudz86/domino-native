import { useRouter } from 'expo-router';
import { MatchSetupScreen } from '@/screens/MatchSetupScreen';
import { useState, useEffect } from 'react';
import { useActiveGameStore } from '@/store/gameStoreContext';
import type { MatchConfig } from '@/types/MatchConfig';
import type { MatchState } from '@/controllers/Score';
import { DEFAULT_MATCH_CONFIG } from '@/types/MatchConfig';

export default function MatchSetupScreenWrapper() {
  const router = useRouter();
  const { startNewMatch, continueOrNewMatch, initGame, resetGame, getMatchState, setSelectedConfig, selectedConfig } = useActiveGameStore();
  const [existingMatch, setExistingMatch] = useState<MatchState | null>(null);

  useEffect(() => {
    const loadExistingMatch = async () => {
      const matchState = await getMatchState();
      if (matchState && matchState.currentGameNumber > 0 && !matchState.matchFinished) {
        setExistingMatch(matchState);
        setSelectedConfig({
          mode: matchState.mode,
          maxPoints: matchState.maxPoints,
          numSets: matchState.numSets
        });
      }
    };
    loadExistingMatch();
  }, [getMatchState, setSelectedConfig]);

  const handleStartNewMatch = async (config: MatchConfig) => {
    console.log(`[MATCH-SETUP] Starting new match:`, config);
    setSelectedConfig(config);
    resetGame();
    await startNewMatch(config);
    await initGame(['AI 1', 'AI 2', 'AI 3', 'AI 4'], [true, true, true, true], config);
    router.push('/game');
  };

  const handleContinueMatch = async () => {
    console.log(`[MATCH-SETUP] Continuing match with selectedConfig`, selectedConfig);
    resetGame();
    await continueOrNewMatch();
    await initGame(['AI 1', 'AI 2', 'AI 3', 'AI 4'], [true, true, true, true], selectedConfig);
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
