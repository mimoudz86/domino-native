import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSocketStore } from '@/store/socketStore';

const SERVER_URL = 'http://192.168.1.151:3001';

export default function OnlineScreen() {
  const router = useRouter();
  const { error, initAdapter, disconnect } = useSocketStore();

  const handleBackPress = () => {
    console.log('[ONLINE-SCREEN] Back pressed');
    disconnect();
    router.back();
  };

  const handlePrivateRoom = () => {
    console.log('[ONLINE-SCREEN] Private Room selected → /private');
    disconnect();
    initAdapter(SERVER_URL, '/private');
    router.push('/create-room');
  };

  const handleQuickPlay = () => {
    console.log('[ONLINE-SCREEN] Quick Play selected → /public');
    disconnect();
    initAdapter(SERVER_URL, '/public');
    router.push('/quick-play');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌐 PLAY ONLINE</Text>

      <View style={styles.connectedContainer}>
        <Text style={styles.modeLabel}>Choose Game Mode:</Text>

        <TouchableOpacity
          style={styles.privateRoomButton}
          onPress={handlePrivateRoom}
        >
          <Text style={styles.buttonIcon}>🔒</Text>
          <Text style={styles.buttonText}>PRIVATE ROOM</Text>
          <Text style={styles.buttonSubtext}>Invite friends</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickPlayButton}
          onPress={handleQuickPlay}
        >
          <Text style={styles.buttonIcon}>⚡</Text>
          <Text style={styles.buttonText}>QUICK PLAY</Text>
          <Text style={styles.buttonSubtext}>Find players</Text>
        </TouchableOpacity>

        {error && <Text style={styles.errorMessage}>{error}</Text>}
      </View>

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
    gap: 20,
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
    marginBottom: 10,
    fontFamily: 'monospace',
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 20,
  },
  privateRoomButton: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    backgroundColor: '#34C759',
    borderRadius: 12,
    minWidth: 280,
    alignItems: 'center',
    gap: 8,
  },
  quickPlayButton: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    minWidth: 280,
    alignItems: 'center',
    gap: 8,
  },
  buttonIcon: {
    fontSize: 32,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  buttonSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
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
