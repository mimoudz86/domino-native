import React from 'react';
import { useSocketStore } from '../store/socketStore';
import { GameScreenLocal } from './GameScreenLocal';
import { GameScreenSocket } from './GameScreenSocket';

interface GameScreenProps {
  onBackToHome?: () => void;
}

/**
 * GameScreen - Router pour LOCAL vs SOCKET mode
 * Choisit automatiquement le bon screen selon le mode
 */
export function GameScreen({ onBackToHome }: GameScreenProps) {
  const gameStartedPayload = useSocketStore(s => s.gameStartedPayload);

  // Mode LOCAL
  if (!gameStartedPayload) {
    return <GameScreenLocal onBackToHome={onBackToHome} />;
  }

  // Mode SOCKET
  return <GameScreenSocket onBackToHome={onBackToHome} />;
}
