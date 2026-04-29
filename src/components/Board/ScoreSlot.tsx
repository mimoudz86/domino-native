import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ScoreSlotProps {
  setScoreUs?: number;
  setScoreThem?: number;
  matchScoreUs?: number;
  matchScoreThem?: number;
  thisPlayerId?: number;
}

/**
 * ScoreSlot Component - Mini score board (React Native)
 *
 * Displays current set scores in compact format
 * Shows: Team scores + Set points + Sets won
 * Equivalent to domino-vite ScoreSlot component
 */
export function ScoreSlot({
  setScoreUs = 0,
  setScoreThem = 0,
  matchScoreUs = 0,
  matchScoreThem = 0,
  thisPlayerId = 0,
}: ScoreSlotProps) {
  // Déterminer l'équipe du joueur
  const isTeamV = thisPlayerId === 0 || thisPlayerId === 2;

  return (
    <View style={styles.container}>
      <View style={styles.scoreBox}>
        {/* Header: NOUS vs EUX */}
        <View style={styles.headerRow}>
          <Text style={styles.headerText}>NOUS</Text>
          <Text style={styles.headerText}>EUX</Text>
        </View>

        {/* Set score */}
        <View style={styles.scoreRow}>
          <Text style={styles.setScore}>{setScoreUs}</Text>
          <Text style={styles.setScore}>{setScoreThem}</Text>
        </View>

        {/* Match score (sets won) */}
        <View style={styles.matchScoreRow}>
          <Text style={styles.matchScore}>{matchScoreUs}</Text>
          <Text style={styles.matchScore}>{matchScoreThem}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  scoreBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 3,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 191, 36, 0.3)',
  },
  headerText: {
    width: 26,
    textAlign: 'center',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 3,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 191, 36, 0.3)',
  },
  setScore: {
    width: 26,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fcd34d',
  },
  matchScoreRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  matchScore: {
    width: 26,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: '#fbbf24',
  },
});
