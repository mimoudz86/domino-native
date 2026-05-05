import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TeamsTableProps {
  viewData: any;
}

export function TeamsTable({ viewData }: TeamsTableProps) {
  // Données fictives pour l'instant - à remplacer par des vraies données de matchState
  const mockTeamData = {
    V: { game: 8, set: 37, match: 2 },
    H: { game: 7, set: 35, match: 1 },
  };

  return (
    <View style={styles.container}>
      <View style={styles.scoreTable}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableCell, styles.tableLabelCell, { flex: 1.5 }]}>Équipe</Text>
          <Text style={[styles.tableCell, styles.tableHeaderCell]}>Game</Text>
          <Text style={[styles.tableCell, styles.tableHeaderCell]}>Set</Text>
          <Text style={[styles.tableCell, styles.tableHeaderCell]}>Match</Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableLabelCell, { flex: 1.5 }]}>
            NOUS
          </Text>
          <Text style={[styles.tableCell, styles.tableValueCell]}>
            {mockTeamData.V.game}
          </Text>
          <Text style={[styles.tableCell, styles.tableValueCell, styles.setScore]}>
            {mockTeamData.V.set}
          </Text>
          <Text style={[styles.tableCell, styles.tableValueCell, styles.matchScore]}>
            {mockTeamData.V.match}
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableLabelCell, { flex: 1.5 }]}>
            EUX
          </Text>
          <Text style={[styles.tableCell, styles.tableValueCell]}>
            {mockTeamData.H.game}
          </Text>
          <Text style={[styles.tableCell, styles.tableValueCell, styles.setScore]}>
            {mockTeamData.H.set}
          </Text>
          <Text style={[styles.tableCell, styles.tableValueCell, styles.matchScore]}>
            {mockTeamData.H.match}
          </Text>
        </View>
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
});
