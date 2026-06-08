import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { SoloTable } from './SoloTable';
import type { MatchConfig } from '../../services/IMatchStorage';
import type { PlayerTurnState } from '../../shared/localGameEvents';

interface GameEndModalProps {
  visible: boolean;
  selectedConfig?: MatchConfig;
  lastGameData?: any;
  currentSetData?: any;
  currentMatchData?: any;
  players?: PlayerTurnState[];
  onContinue: () => void;
  onLeave: () => void;
}

function SoloModeView({ selectedConfig, lastGameData, currentSetData, currentMatchData, players, onContinue, onLeave }: any) {
  const displayPlayers = players || [];

  return (
    <View style={styles.container}>
      {selectedConfig && (
        <View style={styles.configSection}>
          <Text style={styles.configText}>
            Mode: <Text style={styles.configValue}>{selectedConfig.mode}</Text>
            {' '} | Points: <Text style={styles.configValue}>{selectedConfig.maxPoints}</Text>
            {' '} | Sets: <Text style={styles.configValue}>{selectedConfig.numSets}</Text>
          </Text>
        </View>
      )}

      <View style={styles.headerSection}>
        <Text style={styles.title}>🏆 FIN DU JEU</Text>
      </View>

      <SoloTable lastGameData={lastGameData} currentSetData={currentSetData} currentMatchData={currentMatchData} players={displayPlayers} />

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={onContinue}>
          <Text style={styles.buttonText}>▶️ Continuer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={onLeave}>
          <Text style={styles.secondaryButtonText}>🏠 Quitter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function GameEndModal({
  visible,
  selectedConfig,
  lastGameData,
  currentSetData,
  currentMatchData,
  players,
  onContinue,
  onLeave,
}: GameEndModalProps) {
  // Fix race condition: only show modal after lastGameData arrives (after GAME_SAVED event)
  const isReady = visible && lastGameData !== null && lastGameData !== undefined;

  return (
    <Modal visible={isReady} transparent animationType="fade">
      <View style={styles.overlay}>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <SoloModeView
            selectedConfig={selectedConfig}
            lastGameData={lastGameData}
            currentSetData={currentSetData}
            currentMatchData={currentMatchData}
            players={players}
            onContinue={onContinue}
            onLeave={onLeave}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  container: {
    backgroundColor: '#FAEBD7',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#D4AF37',
    width: '90%',
    maxWidth: 400,
  },
  configSection: {
    backgroundColor: '#E8D7C3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  configText: {
    fontSize: 12,
    color: '#3D2817',
    textAlign: 'center',
    fontWeight: '500',
  },
  configValue: {
    fontWeight: 'bold',
    color: '#8B4513',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3D2817',
    marginBottom: 8,
  },
  winner: {
    fontSize: 18,
    color: '#D4AF37',
    fontWeight: '600',
  },
  vsText: {
    fontSize: 12,
    color: '#3D2817',
    textAlign: 'center',
    marginBottom: 16,
  },
  matchProgressSection: {
    backgroundColor: '#FFF8DC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#D4AF37',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3D2817',
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'center',
    gap: 8,
  },
  playerName: {
    flex: 1,
    fontSize: 11,
    color: '#3D2817',
    fontWeight: '500',
  },
  progressScore: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#D4AF37',
    minWidth: 50,
  },
  progressPercent: {
    fontSize: 10,
    color: '#8B6F47',
  },
  matchWonText: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#D4AF37',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D4AF37',
    textAlign: 'center',
  },
  scoreTable: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B6F47',
    marginBottom: 20,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#D4AF37',
    borderBottomWidth: 1,
    borderBottomColor: '#8B6F47',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#8B6F47',
  },
  tableCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableLabelCell: {
    fontWeight: '500',
    color: '#3D2817',
    fontSize: 12,
  },
  tableHeaderCell: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#3D2817',
    fontSize: 12,
  },
  tableValueCell: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
    color: '#3D2817',
  },
  setScore: {
    color: '#D4AF37',
  },
  earnedScore: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  matchScore: {
    color: '#8B6F47',
  },
  winnerRow: {
    backgroundColor: '#FFF8DC',
    fontWeight: 'bold',
  },
  winnerScore: {
    backgroundColor: '#FFF8DC',
  },
  buttonContainer: {
    gap: 10,
  },
  button: {
    backgroundColor: '#D4AF37',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#8B6F47',
  },
  buttonText: {
    color: '#3D2817',
    fontSize: 14,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#FAEBD7',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
