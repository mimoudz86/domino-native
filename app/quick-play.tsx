import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSocketStore } from '@/store/socketStore';

export default function QuickPlayScreen() {
  const router = useRouter();
  const { adapter, isConnected, roomId, gameStarted } = useSocketStore();
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If game started, redirect to game screen
    if (gameStarted) {
      console.log('[QUICK-PLAY] Game started - navigating to game');
      router.replace('/game');
    }
  }, [gameStarted]);

  useEffect(() => {
    // If room joined, go to lobby
    if (roomId) {
      console.log('[QUICK-PLAY] Room joined - navigating to lobby');
      router.replace('/game-lobby');
    }
  }, [roomId]);

  const handleQuickPlay = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!adapter || !isConnected) {
      setError('Not connected to server');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`[QUICK-PLAY] Starting quick play as: ${playerName}`);
      
      // Emit QUICK_PLAY to server
      adapter.quickPlay(playerName);
      
      // Note: The server will emit ROOM_JOINED which socketStore will handle
      // and redirect us to the lobby/game
    } catch (err: any) {
      console.error('[QUICK-PLAY] Error:', err);
      setError(err.message || 'Failed to start quick play');
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚡ QUICK PLAY</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Your Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          placeholderTextColor="#666"
          value={playerName}
          onChangeText={setPlayerName}
          editable={!isLoading}
          maxLength={20}
          autoFocus
        />

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <TouchableOpacity
          style={[
            styles.playButton,
            (!isConnected || isLoading) && styles.disabledButton
          ]}
          onPress={handleQuickPlay}
          disabled={!isConnected || isLoading}
        >
          {isLoading ? (
            <>
              <ActivityIndicator color="white" />
              <Text style={styles.buttonText}>Finding players...</Text>
            </>
          ) : (
            <Text style={styles.buttonText}>START QUICK PLAY</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={isLoading}
        >
          <Text style={styles.backButtonText}>← BACK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 60,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    gap: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#2a2a2a',
  },
  errorText: {
    fontSize: 14,
    color: '#ff6b6b',
    marginBottom: 10,
  },
  playButton: {
    paddingVertical: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#888',
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  backButton: {
    paddingVertical: 12,
    backgroundColor: '#555',
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
