/**
 * HomeScreen - Écran d'accueil simple
 * Bouton "Play" centré pour lancer une partie
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface HomeScreenProps {
  onPlayPress: () => void;
  onTestBoard?: () => void;
  onStatsPress?: () => void;
}

export function HomeScreen({ onPlayPress, onTestBoard, onStatsPress }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.centerContainer}>
        <Text style={styles.title}>🎮 DOMINOS</Text>

        <TouchableOpacity
          style={styles.playButton}
          onPress={onPlayPress}
          activeOpacity={0.7}
        >
          <Text style={styles.playButtonText}>PLAY</Text>
        </TouchableOpacity>

        <Text style={styles.subtitle}>4 Players • Local Game</Text>

        {onTestBoard && (
          <TouchableOpacity
            style={styles.testButton}
            onPress={onTestBoard}
            activeOpacity={0.7}
          >
            <Text style={styles.testButtonText}>Test Board</Text>
          </TouchableOpacity>
        )}

        {onStatsPress && (
          <TouchableOpacity
            style={styles.statsButton}
            onPress={onStatsPress}
            activeOpacity={0.7}
          >
            <Text style={styles.statsButtonText}>📊 Stats</Text>
          </TouchableOpacity>
        )}
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
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  title: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  playButton: {
    paddingHorizontal: 60,
    paddingVertical: 20,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    marginBottom: 20,
  },
  playButtonText: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 20,
  },
  testButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#666',
    borderRadius: 8,
    marginTop: 20,
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  statsButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: '#555',
    borderRadius: 8,
    marginTop: 12,
  },
  statsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
