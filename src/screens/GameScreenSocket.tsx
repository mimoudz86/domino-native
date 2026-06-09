import React, { useEffect } from 'react';
import { StyleSheet, StatusBar, View, Text } from 'react-native';
import { MobileGameBoard } from '../components/Board/MobileGameBoard';
import { GameStoreProvider, useActiveGameStore } from '../store/gameStoreContext';
import { useSocketStore } from '../store/socketStore';

interface GameScreenSocketProps {
  onBackToHome?: () => void;
}

/**
 * GameScreenSocket - Mode jeu SOCKET
 * Wrapper avec GameStoreProvider (mode: 'socket')
 */
function GameScreenSocketContent({ onBackToHome }: GameScreenSocketProps) {
  const gameStartedPayload = useSocketStore(s => s.gameStartedPayload);
  const turnState = useActiveGameStore(s => s.turnState);

  useEffect(() => {
    StatusBar.setHidden(true, 'slide');
    return () => StatusBar.setHidden(false, 'slide');
  }, []);

  // Attendre GAME_STARTED
  if (!gameStartedPayload) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Attente du serveur...</Text>
      </View>
    );
  }

  // Attendre le premier TURN_STATE
  if (!turnState || !turnState.players || turnState.players.length < 4) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Initialisation du jeu...</Text>
      </View>
    );
  }

  return <MobileGameBoard thisPlayerId={0} onBackToHome={onBackToHome} />;
}

export function GameScreenSocket({ onBackToHome }: GameScreenSocketProps) {
  return (
    <GameStoreProvider mode="socket">
      <GameScreenSocketContent onBackToHome={onBackToHome} />
    </GameStoreProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a'
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  }
});
