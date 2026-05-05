import { useRouter } from 'expo-router';
import { StatsScreen } from '@/screens/StatsScreen';
import { useActiveGameStore } from '@/store/gameStoreContext';

export default function StatsScreenWrapper() {
  const router = useRouter();
  const { getStatsData, removeAllData } = useActiveGameStore();

  const handleShowStats = async (): Promise<string> => {
    try {
      const data = await getStatsData();
      return data;
    } catch (error) {
      console.error('[STATS-SCREEN] Error getting stats:', error);
      throw error;
    }
  };

  const handleRemoveData = async (): Promise<void> => {
    try {
      await removeAllData();
    } catch (error) {
      console.error('[STATS-SCREEN] Error removing data:', error);
      throw error;
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  return (
    <StatsScreen
      onShowStats={handleShowStats}
      onRemoveData={handleRemoveData}
      onBackPress={handleBackPress}
    />
  );
}
