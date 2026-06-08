import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSocketStore } from '@/store/socketStore';

export default function CreateRoomScreen() {
  const router = useRouter();
  const { adapter, isConnected, playerId } = useSocketStore();
  const [playerName, setPlayerName] = useState('');
  const [aiCount, setAiCount] = useState(3); // Default: 1 human + 3 AI = 4 players
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
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
      console.log(`[CREATE-ROOM] Creating room as: ${playerName} with ${aiCount} AI players`);

      // Call adapter createRoom method with AI count
      const result = await adapter.createRoom(playerName, aiCount);

      if (result) {
        console.log('[CREATE-ROOM] Room created successfully:', result);
        // Navigate to game screen once room is created
        router.push('/game-lobby');
      } else {
        setError('Failed to create room');
      }
    } catch (err: any) {
      console.error('[CREATE-ROOM] Error:', err);
      setError(err.message || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const decrementAi = () => {
    if (aiCount > 0) setAiCount(aiCount - 1);
  };

  const incrementAi = () => {
    if (aiCount < 3) setAiCount(aiCount + 1);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎮 CREATE ROOM</Text>

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
        />

        <Text style={styles.label}>AI Players (0-3)</Text>
        <View style={styles.aiCounterContainer}>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={decrementAi}
            disabled={aiCount === 0 || isLoading}
          >
            <Text style={styles.counterButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.aiCountDisplay}>{aiCount}</Text>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={incrementAi}
            disabled={aiCount === 3 || isLoading}
          >
            <Text style={styles.counterButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.aiInfoText}>Total Players: {aiCount + 1}/4</Text>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <TouchableOpacity
          style={[
            styles.createButton,
            (!isConnected || isLoading) && styles.disabledButton
          ]}
          onPress={handleCreateRoom}
          disabled={!isConnected || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>CREATE ROOM</Text>
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
  aiCounterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  aiCountDisplay: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    minWidth: 40,
    textAlign: 'center',
  },
  aiInfoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#ff6b6b',
    marginBottom: 10,
  },
  createButton: {
    paddingVertical: 16,
    backgroundColor: '#34C759',
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
