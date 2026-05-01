import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import type { MatchConfig } from '../types/MatchConfig';
import type { MatchState } from '../controllers/MatchManager';

interface MatchSetupScreenProps {
  onStartNewMatch: (config: MatchConfig) => void;
  onContinueMatch: () => void;
  existingMatch: MatchState | null;
}

export function MatchSetupScreen({ onStartNewMatch, onContinueMatch, existingMatch }: MatchSetupScreenProps) {
  const [mode, setMode] = useState<'individual' | 'teams'>('individual');
  const [maxPoints, setMaxPoints] = useState<50 | 100>(50);
  const [numSets, setNumSets] = useState<1 | 2 | 3>(1);

  const canContinue = existingMatch && !existingMatch.matchFinished;

  const handleStartNewMatch = () => {
    onStartNewMatch({ mode, maxPoints, numSets });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.centerContainer}>
        <Text style={styles.title}>🎮 DOMINOS</Text>
        <Text style={styles.subtitle}>Configure your match</Text>

        {/* MODE SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MODE</Text>
          <View style={styles.toggleGroup}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                mode === 'individual' && styles.toggleButtonActive,
              ]}
              onPress={() => setMode('individual')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  mode === 'individual' && styles.toggleButtonTextActive,
                ]}
              >
                Individual
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                mode === 'teams' && styles.toggleButtonActive,
              ]}
              onPress={() => setMode('teams')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  mode === 'teams' && styles.toggleButtonTextActive,
                ]}
              >
                Teams
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* POINTS SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>POINTS TO WIN</Text>
          <View style={styles.toggleGroup}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                maxPoints === 50 && styles.toggleButtonActive,
              ]}
              onPress={() => setMaxPoints(50)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  maxPoints === 50 && styles.toggleButtonTextActive,
                ]}
              >
                50 pts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                maxPoints === 100 && styles.toggleButtonActive,
              ]}
              onPress={() => setMaxPoints(100)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  maxPoints === 100 && styles.toggleButtonTextActive,
                ]}
              >
                100 pts
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SETS SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SETS</Text>
          <View style={styles.toggleGroup}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                numSets === 1 && styles.toggleButtonActive,
              ]}
              onPress={() => setNumSets(1)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  numSets === 1 && styles.toggleButtonTextActive,
                ]}
              >
                1
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                numSets === 2 && styles.toggleButtonActive,
              ]}
              onPress={() => setNumSets(2)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  numSets === 2 && styles.toggleButtonTextActive,
                ]}
              >
                2
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                numSets === 3 && styles.toggleButtonActive,
              ]}
              onPress={() => setNumSets(3)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  numSets === 3 && styles.toggleButtonTextActive,
                ]}
              >
                3
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CONTINUE MATCH SECTION */}
        {canContinue && (
          <View style={styles.existingMatchSection}>
            <Text style={styles.existingMatchTitle}>⚡ Match in progress</Text>
            <Text style={styles.existingMatchInfo}>
              Mode: {existingMatch.mode} • {existingMatch.maxPoints} pts • Game #{existingMatch.currentGameNumber}
            </Text>
            <View style={styles.existingMatchScores}>
              {Object.entries(existingMatch.scoreIndividual).map(([id, score]) => (
                <Text key={id} style={styles.scoreText}>
                  P{id}: {score}
                </Text>
              ))}
            </View>

            <View style={styles.existingMatchButtons}>
              <TouchableOpacity
                style={[styles.button, styles.continueButton]}
                onPress={onContinueMatch}
                activeOpacity={0.7}
              >
                <Text style={styles.continueButtonText}>CONTINUE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.newMatchButton]}
                onPress={handleStartNewMatch}
                activeOpacity={0.7}
              >
                <Text style={styles.newMatchButtonText}>NEW MATCH</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* START BUTTON */}
        {!canContinue && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartNewMatch}
            activeOpacity={0.7}
          >
            <Text style={styles.startButtonText}>START MATCH</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 40,
  },
  section: {
    width: '100%',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 12,
    letterSpacing: 1,
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  toggleButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  existingMatchSection: {
    width: '100%',
    marginBottom: 30,
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  existingMatchTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 8,
  },
  existingMatchInfo: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  existingMatchScores: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  scoreText: {
    fontSize: 12,
    color: '#0ff',
    fontWeight: '600',
  },
  existingMatchButtons: {
    gap: 10,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: '#00aa44',
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  newMatchButton: {
    borderWidth: 2,
    borderColor: '#ff4444',
    backgroundColor: 'transparent',
  },
  newMatchButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ff4444',
  },
  startButton: {
    width: '100%',
    paddingHorizontal: 60,
    paddingVertical: 16,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    marginTop: 20,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
});
