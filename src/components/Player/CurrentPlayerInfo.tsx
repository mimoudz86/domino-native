import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { PlayerTurnState } from '../../shared/models/GameTurnState';
import { generatePlayerAvatar, getPlayerColor } from '../../utils/avatarGenerator';

interface PlayerInfoProps {
  playerId: number;
  player?: PlayerTurnState;
  isCurrentPlayer?: boolean;
  isLastPlayed?: boolean;
}

/**
 * PlayerInfo Component (React Native)
 *
 * Affiche le nom et l'avatar du joueur
 *
 * @param playerId - ID du joueur (0-3)
 * @param player - Données du joueur
 * @param isCurrentPlayer - Si true, affiche un highlight doré
 * @param isLastPlayed - Si true, affiche un highlight pour dernier joueur ayant joué
 */
export function PlayerInfo({
  playerId,
  player,
  isCurrentPlayer = false,
  isLastPlayed = false,
}: PlayerInfoProps) {
  const playerColor = getPlayerColor(playerId);
  const playerName = player?.name || `Player`;
  const displayName = `${playerName}-${playerId}`;

  // Générer l'avatar SVG localement
  const avatarSvg = useMemo(() => {
    return generatePlayerAvatar({
      playerId,
      playerName: player?.name || `Player${playerId}`,
      size: 48,
    });
  }, [playerId, player?.name]);

  if (!player) {
    return (
      <View style={styles.container}>
        <Text style={[styles.name, { color: playerColor }]}>{displayName}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        isCurrentPlayer && styles.currentPlayerHighlight,
        isLastPlayed && styles.lastPlayedHighlight,
      ]}
    >
      {/* Avatar circulaire */}
      <View
        style={[
          styles.avatarContainer,
          { backgroundColor: playerColor },
          isLastPlayed && styles.avatarLastPlayed,
        ]}
      >
        <Text style={styles.avatarText}>
          {playerName.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Nom du joueur */}
      <View style={styles.nameSection}>
        <Text style={styles.name}>{displayName}</Text>
        {player.hasPassed && <Text style={styles.passed}>Passed</Text>}
      </View>

      {/* Badge "You" si c'est le joueur local */}
      {isCurrentPlayer && <Text style={styles.youBadge}>You</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  currentPlayerHighlight: {
    borderWidth: 2,
    borderColor: '#f59e0b', // amber-500 (western-gold)
    backgroundColor: '#fffbeb', // yellow-50
  },
  lastPlayedHighlight: {
    backgroundColor: '#fef3c7', // amber-100
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#3b82f6',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  avatarLastPlayed: {
    borderWidth: 2,
    borderColor: '#fcd34d', // amber-300
  },
  nameSection: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937', // gray-800
  },
  passed: {
    color: '#fbbf24', // amber-400
    fontSize: 11,
    marginTop: 2,
    fontWeight: 'bold',
  },
  youBadge: {
    color: '#10b981', // emerald-500
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
