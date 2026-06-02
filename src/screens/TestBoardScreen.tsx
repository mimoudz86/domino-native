import React from 'react';
import { View, StyleSheet, SafeAreaView, Text, TouchableOpacity } from 'react-native';
import { DominoModel } from '../shared/Domino';
import { RNTrainWrapper } from '../components/Board/RNTrainWrapper';
import { buildTrainSlots } from '../utils/trainCalculations';

export function TestBoardScreen({ onBackToHome }: { onBackToHome?: () => void }) {
  const testDominos = [
    new DominoModel(5, 2), new DominoModel(3, 1), new DominoModel(4, 6), new DominoModel(2, 2), new DominoModel(1, 0), new DominoModel(3, 4), new DominoModel(3, 3),
    new DominoModel(4, 6),
    new DominoModel(3, 3), new DominoModel(2, 4), new DominoModel(5, 6), new DominoModel(1, 1), new DominoModel(2, 3), new DominoModel(0, 5), new DominoModel(4, 1), new DominoModel(5, 6), new DominoModel(2, 5),
    new DominoModel(0, 3),
    new DominoModel(4, 2), new DominoModel(6, 1), new DominoModel(3, 3), new DominoModel(1, 2), new DominoModel(5, 0), new DominoModel(6, 2), new DominoModel(4, 4),
  ];

  const placedDominos = testDominos.map(domino => ({ domino }));
  const slots = buildTrainSlots(placedDominos);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Test Board - Serpentin</Text>
        <Text style={styles.subtitle}>25 dominos</Text>
      </View>

      <View style={styles.boardContainer}>
        <RNTrainWrapper slots={slots} />
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>Dominos: {slots.length}</Text>
        {onBackToHome && (
          <TouchableOpacity style={styles.backButton} onPress={onBackToHome}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  boardContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
    margin: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  info: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#f0f0f0',
  },
  infoText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 6,
  },
  backButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
