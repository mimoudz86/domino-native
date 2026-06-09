import React, { useEffect } from 'react';
import { StyleSheet, StatusBar } from 'react-native';
import { MobileGameBoard } from '../components/Board/MobileGameBoard';
import { GameStoreProvider, useActiveGameStore } from '../store/gameStoreContext';

interface GameScreenLocalProps {
  onBackToHome?: () => void;
}

/**
 * GameScreenLocal - Mode jeu LOCAL
 * Wrapper avec GameStoreProvider (mode: 'local')
 */
function GameScreenLocalContent({ onBackToHome }: GameScreenLocalProps) {
  const turnState = useActiveGameStore(s => s.turnState);

  useEffect(() => {
    StatusBar.setHidden(true, 'slide');
    return () => StatusBar.setHidden(false, 'slide');
  }, []);

  // Attendre que le jeu soit initialisé
  if (!turnState || turnState.players.length < 4) {
    return null;
  }

  return <MobileGameBoard thisPlayerId={0} onBackToHome={onBackToHome} />;
}

export function GameScreenLocal({ onBackToHome }: GameScreenLocalProps) {
  return (
    <GameStoreProvider mode="local">
      <GameScreenLocalContent onBackToHome={onBackToHome} />
    </GameStoreProvider>
  );
}

const styles = StyleSheet.create({});
