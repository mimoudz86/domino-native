import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSocketStore } from '@/store/socketStore';

export default function GameLobbyScreen() {
  const router = useRouter();
  const { adapter, roomId, playerId, gameStarted, gameEndedPayload } = useSocketStore();
  const [players, setPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (gameStarted) {
      console.log('[LOBBY] Game started - navigating to game screen');
      router.push('/game');
    }
  }, [gameStarted]);

  useEffect(() => {
    if (!adapter || !roomId) {
      setError('Not connected to room');
      setIsLoading(false);
      return;
    }

    console.log('[LOBBY] Fetching room info...');
    // TODO: Implement getRoomInfo in adapter to get players list
    setIsLoading(false);
  }, [adapter, roomId]);

  const handleBackPress = () => {
    console.log('[LOBBY] Back pressed');
    router.back();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading room info...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>← BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎮 GAME LOBBY</Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Room ID: <Text style={styles.infoValue}>{roomId}</Text></Text>
        <Text style={styles.infoLabel}>Your ID: <Text style={styles.infoValue}>{playerId}</Text></Text>
      </View>

      <Text style={styles.playersLabel}>Players ({players.length}/4)</Text>

      <ScrollView style={styles.playersList}>
        {players.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Waiting for players to join...</Text>
            <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 20 }} />
          </View>
        ) : (
          players.map((player, index) => (
            <View key={index} style={styles.playerCard}>
              <View style={styles.playerAvatar}>
                <Text style={styles.avatarText}>{player.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerStatus}>
                  {player.id === playerId ? '(You)' : 'Ready'}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.statusContainer}>
        {gameStarted ? (
          <View style={styles.startingText}>
            <Text style={styles.startingLabel}>🎮 Game Starting...</Text>
            <ActivityIndicator color="#34C759" />
          </View>
        ) : (
          <Text style={styles.waitingLabel}>⏳ Waiting for game to start...</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackPress}
      >
        <Text style={styles.backButtonText}>← LEAVE ROOM</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
  },
  infoBox: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    width: '100%',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#aaa',
    fontWeight: '600',
  },
  infoValue: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  playersLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  playersList: {
    width: '100%',
    maxHeight: 300,
    marginBottom: 30,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  playerStatus: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  waitingLabel: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  startingText: {
    alignItems: 'center',
    gap: 12,
  },
  startingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34C759',
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: '#555',
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
