import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSocketStore } from '@/store/socketStore';

export default function OnlineScreen() {
  const router = useRouter();
  const { isConnected, socketId, error, initAdapter, disconnect } = useSocketStore();

  useEffect(() => {
    // Initialize socket connection with server
    console.log('[ONLINE-SCREEN] Initializing socket connection...');
    initAdapter('http://192.168.1.151:3001');

    return () => {
      // Cleanup on unmount
      disconnect();
    };
  }, []);

  const handleBackPress = () => {
    console.log('[ONLINE-SCREEN] Back pressed');
    disconnect();
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌐 PLAY ONLINE</Text>

      {isConnected ? (
        <View style={styles.connectedContainer}>
          <Text style={styles.statusText}>✅ Connected</Text>
          <Text style={styles.socketIdText}>Socket ID: {socketId}</Text>

          <TouchableOpacity
            style={styles.createRoomButton}
            onPress={() => router.push('/create-room')}
          >
            <Text style={styles.buttonText}>CREATE ROOM</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.joinRoomButton}
            onPress={() => router.push('/join-room')}
          >
            <Text style={styles.buttonText}>JOIN ROOM</Text>
          </TouchableOpacity>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ Connection Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => initAdapter('http://192.168.1.151:3001')}
          >
            <Text style={styles.buttonText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.connectingText}>Connecting to server...</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackPress}
      >
        <Text style={styles.backButtonText}>← BACK</Text>
      </TouchableOpacity>
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
  connectedContainer: {
    alignItems: 'center',
    gap: 30,
  },
  statusText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 10,
  },
  socketIdText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  createRoomButton: {
    paddingHorizontal: 50,
    paddingVertical: 18,
    backgroundColor: '#34C759',
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  joinRoomButton: {
    paddingHorizontal: 50,
    paddingVertical: 18,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 20,
  },
  connectingText: {
    fontSize: 16,
    color: '#999',
    marginTop: 20,
  },
  errorContainer: {
    alignItems: 'center',
    gap: 20,
    padding: 20,
    backgroundColor: '#3a1a1a',
    borderRadius: 12,
    borderColor: '#ff4444',
    borderWidth: 1,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ff6b6b',
  },
  errorMessage: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 40,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    marginTop: 10,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#555',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
