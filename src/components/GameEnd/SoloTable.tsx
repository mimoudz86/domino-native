import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SoloTableProps {
  lastGameData?: any;
  currentSetData?: any;
  players?: any[];
}

export function SoloTable({ lastGameData, currentSetData, players = [] }: SoloTableProps) {
  console.log('[SOLO-TABLE] lastGameData:', lastGameData);
  console.log('[SOLO-TABLE] currentSetData:', currentSetData);
  console.log('[SOLO-TABLE] players param:', players?.length, players);
  console.log('[SOLO-TABLE] players[0]?.name:', players[0]?.name);

  const getPlayerGameScore = (playerId: number) => {
    const scoreKey = `p${playerId}_score`;
    return lastGameData?.[scoreKey] ?? 0;
  };

  const getPlayerName = (playerId: number) => {
    const nameKey = `p${playerId}_name`;
    return lastGameData?.[nameKey] ?? players?.[playerId]?.name ?? `P${playerId}`;
  };

  const getSetScore = (playerId: number) => {
    const scoreKey = `p${playerId}_score`;
    return currentSetData?.[scoreKey] ?? 0;
  };

  return (
    <View style={styles.container}>
      {currentSetData && (
        <View style={styles.setScoresSection}>
          <Text style={styles.setSectionTitle}>📊 Scores du Set</Text>
          <View style={styles.setScoresRow}>
            {[0, 1, 2, 3].map((playerId) => (
              <View key={playerId} style={styles.setScoreItem}>
                <Text style={styles.setPlayerName}>{getPlayerName(playerId)}</Text>
                <Text style={styles.setScoreValue}>{getSetScore(playerId)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.scoreTable}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableCell, { flex: 1.2 }, styles.tableLabelCell]}>
            Joueur
          </Text>
          <Text style={[styles.tableCell, styles.tableHeaderCell]}>Game</Text>
          <Text style={[styles.tableCell, styles.tableHeaderCell]}>Set</Text>
          <Text style={[styles.tableCell, styles.tableHeaderCell]}>Match</Text>
        </View>

        {[0, 1, 2, 3].map((playerId) => {
          const player = players.find((p: any) => p.id === playerId);
          const isWinner = lastGameData?.winner_id === playerId;

          return (
            <View key={playerId} style={styles.tableRow}>
              <Text
                style={[
                  styles.tableCell,
                  { flex: 1.2 },
                  styles.tableLabelCell,
                  isWinner && styles.winnerRow
                ]}
              >
                {getPlayerName(playerId)}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  isWinner ? styles.winnerScore : styles.tableValueCell,
                ]}
              >
                {getPlayerGameScore(playerId)}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  isWinner ? styles.winnerScore : styles.tableValueCell,
                ]}
              >
                0
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  isWinner ? styles.winnerScore : styles.tableValueCell,
                ]}
              >
                0
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
    color: '#999',
    fontWeight: '600',
  },
  winnerRow: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    fontWeight: '700',
    color: '#D4AF37',
  },
  winnerScore: {
    color: '#D4AF37',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
