import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSocketStore } from '@/store/socketStore';

export default function JoinRoomScreen() {
  const router = useRouter();
  const { adapter, isConnected } = useSocketStore();
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      setError('Please enter room ID');
      return;
    }

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
      console.log(`[JOIN-ROOM] Joining room: ${roomId} as: ${playerName}`);
      
      const result = await adapter.joinRoom(roomId, playerName);
      
      if (result) {
        console.log('[JOIN-ROOM] Room joined successfully:', result);
        router.push('/game-lobby');
      } else {
        setError('Failed to join room');
      }
    } catch (err: any) {
      console.error('[JOIN-ROOM] Error:', err);
      setError(err.message || 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎮 JOIN ROOM</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Room ID</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter room ID"
          placeholderTextColor="#666"
          value={roomId}
          onChangeText={setRoomId}
          editable={!isLoading}
          maxLength={20}
        />

        <Text style={styles.label}>Your Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          placeholderTextColor="#666"
          value={playerName}
          onChangeText={setPlayerName}
          editable={!isLoading}
          maxLength={20}
        />

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <TouchableOpacity
          style={[
            styles.joinButton,
            (!isConnected || isLoading) && styles.disabledButton
          ]}
          onPress={handleJoinRoom}
          disabled={!isConnected || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>JOIN ROOM</Text>
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
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    marginTop: 8,
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
  joinButton: {
    paddingVertical: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
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
