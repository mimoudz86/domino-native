import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import type { PlayerDatas } from '../../controllers/localGameEvents';
import { getPlayerColor } from '../../utils/avatarGenerator';

// Import des images d'avatars
const AVATAR_IMAGES: { [key: number]: any } = {
  0: require('../../assets/avatars/cowgirl1png.png'), // Alice
  // 1: require('../../assets/avatars/cowboy.png'), // Bob
  // 2: require('../../assets/avatars/charlie.png'), // Charlie
  // 3: require('../../assets/avatars/diana.png'), // Diana
};

interface PlayerInfoProps {
  playerId: number;
  player?: PlayerDatas;
  isCurrentPlayer?: boolean;
  isLastPlayed?: boolean;
}

/**
 * PlayerInfo Component (React Native) - STATELESS
 *
 * Affiche le nom et l'avatar du joueur
 * Reçoit toutes ses données via les props
 *
 * @param playerId - ID du joueur (0-3)
 * @param player - État du joueur (PlayerTurnState)
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
  const playerName = player?.name || `Player ${playerId}`;
  const displayName = playerName;
  const hasPassed = player?.hasPassed ?? false;

  // Récupérer l'image d'avatar si disponible
  const avatarImage = AVATAR_IMAGES[playerId];

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
      {/* Avatar Image ou Placeholder */}
      {avatarImage ? (
        <Image
          source={avatarImage}
          style={[
            styles.avatarContainer,
            isLastPlayed && styles.avatarLastPlayed,
          ]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.avatarContainer,
            styles.avatarPlaceholder,
            { backgroundColor: playerColor },
            isLastPlayed && styles.avatarLastPlayed,
          ]}
        >
          <Text style={styles.initials}>
            {playerName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* Nom du joueur en dessous */}
      <View style={styles.nameSection}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        {hasPassed && <Text style={styles.passed}>✓</Text>}
      </View>

      {/* Badge "You" si c'est le joueur local */}
      {isCurrentPlayer && <Text style={styles.youBadge}>📍</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  currentPlayerHighlight: {
    borderWidth: 1,
    borderColor: '#f59e0b', // amber-500 (western-gold)
    backgroundColor: '#fffbeb', // yellow-50
  },
  lastPlayedHighlight: {
    backgroundColor: '#fef3c7', // amber-100
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 4,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarLastPlayed: {
    borderWidth: 1,
    borderColor: '#fcd34d', // amber-300
  },
  nameSection: {
    alignItems: 'center',
    gap: 1,
  },
  name: {
    fontSize: 8,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  passed: {
    color: '#fbbf24', // amber-400
    fontSize: 8,
    fontWeight: 'bold',
  },
  youBadge: {
    fontSize: 10,
  },
});
