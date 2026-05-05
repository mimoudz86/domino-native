import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SoloTableProps {
  viewData: any;
}

export function SoloTable({ viewData }: SoloTableProps) {
  // Données fictives pour l'instant - à remplacer par des vraies données de matchState
  const mockGameData = [
    { playerId: 0, game: 3, set: 15, match: 1 },
    { playerId: 1, game: 5, set: 22, match: 0 },
    { playerId: 2, game: 0, set: 18, match: 0 },
    { playerId: 3, game: 2, set: 20, match: 2 },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.scoreTable}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableCell, { flex: 1.2 }, styles.tableLabelCell]}>
            Joueur
          </Text>
          <Text style={[styles.tableCell, styles.tableHeaderCell]}>Game</Text>
          <Text style={[styles.tableCell, styles.tableHeaderCell]}>Set</Text>
          <Text style={[styles.tableCell, styles.tableHeaderCell]}>Match</Text>
        </View>

        {viewData.players.map((player: any) => {
          const gameData = mockGameData.find(d => d.playerId === player.id) || mockGameData[player.id];
          return (
            <View key={player.id} style={styles.tableRow}>
              <Text
                style={[
                  styles.tableCell,
                  { flex: 1.2 },
                  styles.tableLabelCell,
                  player.id === viewData.winner.id && styles.winnerRow
                ]}
              >
                {player.name}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableValueCell,
                  player.id === viewData.winner.id && styles.winnerScore
                ]}
              >
                {gameData?.game || 0}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableValueCell,
                  styles.setScore,
                  player.id === viewData.winner.id && styles.winnerScore
                ]}
              >
                {gameData?.set || 0}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableValueCell,
                  styles.matchScore,
                  player.id === viewData.winner.id && styles.winnerScore
                ]}
              >
                {gameData?.match || 0}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  scoreTable: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#333',
    paddingVertical: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
  },
  tableLabelCell: {
    color: '#999',
    fontWeight: '500',
    textAlign: 'left',
    paddingLeft: 10,
  },
  tableHeaderCell: {
    color: '#fff',
    fontWeight: '600',
  },
  tableValueCell: {
    color: '#4ade80',
    fontWeight: '600',
  },
  setScore: {
    color: '#60a5fa',
  },
  matchScore: {
    color: '#f59e0b',
  },
  winnerRow: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    fontWeight: '700',
    color: '#4ade80',
  },
  winnerScore: {
    color: '#fbbf24',
    fontWeight: '700',
  },
});
