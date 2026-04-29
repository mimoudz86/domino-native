import { useRouter } from 'expo-router';
import { HomeScreen } from '@/screens/HomeScreen';
import { GameScreen } from '@/screens/GameScreen';
import { useState } from 'react';
import { useActiveGameStore } from '@/store/gameStoreContext';

export default function HomeScreenWrapper() {
  const [isPlaying, setIsPlaying] = useState(false);
  const router = useRouter();
  const { initGame } = useActiveGameStore();

  const handlePlayPress = async () => {
    console.log(`[HOME-SCREEN] Play pressed - initializing game`);
    await initGame();
    setIsPlaying(true);
    router.push('/game');
  };

  const handleBackToHome = () => {
    setIsPlaying(false);
    router.back();
  };

  if (isPlaying) {
    return <GameScreen onBackToHome={handleBackToHome} />;
  }

  return <HomeScreen onPlayPress={handlePlayPress} />;
}
