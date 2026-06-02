import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { PlayerTurnState } from '../../shared/GameEvent';
import { getPlayerColor } from '../../utils/avatarGenerator';

interface MobilePlayerAreaProps {
  playerId: number;
  position: 'top' | 'bottom' | 'left' | 'right';
  player?: PlayerTurnState;
}

export function MobilePlayerArea({
  playerId,
  position,
  player,
}: MobilePlayerAreaProps) {
  const playerColor = getPlayerColor(playerId);

  if (!player) {
    return (
      <View style={[styles.container, { backgroundColor: playerColor }]}>
        <Text style={styles.text}>P{playerId}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: playerColor },
        position === 'bottom' && styles.bottomOrientation,
      ]}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {player.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name}>{player.name}</Text>
        <Text style={styles.count}>🎴 {player.dominoCount}</Text>
        {player.hasPassed && <Text style={styles.passed}>Passed</Text>}
      </View>

      {/* Status */}
      {player.canPlay && (
        <View style={styles.status}>
          <Text style={styles.statusText}>▶️</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    margin: 5,
  },
  bottomOrientation: {
    width: '90%',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  count: {
    color: '#fff',
    fontSize: 12,
    marginTop: 2,
  },
  passed: {
    color: '#ffd700',
    fontSize: 10,
    marginTop: 2,
    fontWeight: 'bold',
  },
  status: {
    marginLeft: 10,
  },
  statusText: {
    fontSize: 16,
  },
  text: {
    color: '#fff',
  },
});
