import { useRouter } from 'expo-router';
import { HomeScreen } from '@/screens/HomeScreen';
import { GameScreen } from '@/screens/GameScreen';
import { useState } from 'react';
import { useActiveGameStore } from '@/store/gameStoreContext';

export default function HomeScreenWrapper() {
  const [isPlaying, setIsPlaying] = useState(false);
  const router = useRouter();
  const { initGame } = useActiveGameStore();

  const handlePlayPress = () => {
    console.log(`[HOME-SCREEN] Play pressed - navigating to setup`);
    router.push('/setup');
  };

  const handleStatsPress = () => {
    console.log(`[HOME-SCREEN] Stats pressed - navigating to stats`);
    router.push('/stats');
  };

  const handleBackToHome = () => {
    setIsPlaying(false);
    router.back();
  };

  if (isPlaying) {
    return <GameScreen onBackToHome={handleBackToHome} />;
  }

  return <HomeScreen onPlayPress={handlePlayPress} onStatsPress={handleStatsPress} />;
}
