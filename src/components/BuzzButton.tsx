import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useDominoFlash } from '../hooks/useDominoFlash';

interface BuzzButtonProps {
  onBuzz?: () => void;
  enabled?: boolean;
}

/**
 * BuzzButton - Bouton flottant indépendant pour flasher un domino
 * Positionné en overlay, ne modifie pas la structure du layout
 */
export function BuzzButton({ onBuzz, enabled = true }: BuzzButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const { triggerFlash } = useDominoFlash();

  const handlePress = () => {
    if (!enabled) return;

    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 200);

    triggerFlash();
    onBuzz?.();
  };

  return (
    <TouchableOpacity
      style={[styles.button, isPressed && styles.buttonPressed]}
      onPress={handlePress}
      disabled={!enabled}
      activeOpacity={0.8}
    >
      <Text style={styles.buttonText}>🔔</Text>
      <Text style={styles.buttonLabel}>BUZZ</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ff0000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  buttonPressed: {
    backgroundColor: '#cc0000',
    transform: [{ scale: 0.95 }],
  },
  buttonText: {
    fontSize: 32,
    marginBottom: 2,
  },
  buttonLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
});
