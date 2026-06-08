import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSocketStore } from '@/store/socketStore';
import { GameScreen } from '@/screens/GameScreen';

export default function SocketGameScreen() {
  const router = useRouter();
  const { gameStarted, gameEnded, turnState, adapter, roomId } = useSocketStore();

  useEffect(() => {
    // Set a timeout to navigate back only if no game data arrives
    const timeout = setTimeout(() => {
      if (!roomId && !gameStarted) {
        console.log('[SOCKET-GAME] Timeout: No data received, navigating back');
        router.back();
      }
    }, 3000); // 3 second timeout

    return () => clearTimeout(timeout);
  }, []);

  const handleBackPress = () => {
    console.log('[SOCKET-GAME] Back pressed - leaving game');
    adapter?.disconnect();
    router.replace('/');
  };

  // Loading: waiting for GAME_STARTED
  if (!gameStarted || !turnState) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing game...</Text>
        <Text style={styles.roomIdText}>Room: {roomId}</Text>
      </View>
    );
  }

  // Game ended
  if (gameEnded) {
    return (
      <View style={styles.endGameContainer}>
        <Text style={styles.endGameTitle}>🏁 GAME ENDED</Text>
        <TouchableOpacity style={styles.backToHomeButton} onPress={handleBackPress}>
          <Text style={styles.backToHomeText}>← BACK TO HOME</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Game in progress
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌐 PLAYING ONLINE</Text>
        <TouchableOpacity style={styles.leaveButton} onPress={handleBackPress}>
          <Text style={styles.leaveButtonText}>LEAVE</Text>
        </TouchableOpacity>
      </View>

      <GameScreen onBackToHome={handleBackPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34C759',
  },
  leaveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ff4444',
    borderRadius: 6,
  },
  leaveButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    color: '#999',
    fontWeight: '500',
  },
  roomIdText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  endGameContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  endGameTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#34C759',
  },
  backToHomeButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backToHomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
