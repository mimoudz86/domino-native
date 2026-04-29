import React, { useEffect } from 'react';
import { StyleSheet, StatusBar } from 'react-native';
import { MobileGameBoard } from '../components/Board/MobileGameBoard';
import { useActiveGameStore } from '../store/gameStoreContext';

interface GameScreenProps {
  onBackToHome?: () => void;
}

export function GameScreen({ onBackToHome }: GameScreenProps) {
  const { turnState } = useActiveGameStore();

  useEffect(() => {
    StatusBar.setHidden(true, 'slide');
    return () => StatusBar.setHidden(false, 'slide');
  }, []);

  // ✅ Re-render quand turnState change dans le store
  useEffect(() => {
    // Simple effect to ensure re-render when turnState updates
    // This makes GameScreen react to game state changes
  }, [turnState]);

  if (!turnState) {
    return null;
  }

  return <MobileGameBoard thisPlayerId={0} gameState={turnState} onBackToHome={onBackToHome} />;
}

const styles = StyleSheet.create({});
