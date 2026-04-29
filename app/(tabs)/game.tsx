import { useRouter } from 'expo-router';
import { GameScreen } from '@/screens/GameScreen';

export default function GameScreenWrapper() {
  const router = useRouter();

  const handleBackToHome = () => {
    router.back();
  };

  return <GameScreen onBackToHome={handleBackToHome} />;
}
