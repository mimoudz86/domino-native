import React, { useEffect, useRef } from 'react';
import { useActiveGameStore } from '../store/gameStoreContext';

interface GameProviderProps {
  children: React.ReactNode;
  autoInitialize?: boolean;
}

/**
 * GameProvider - Gère l'initialisation du jeu au niveau global
 *
 * Responsabilités:
 * - Initialiser le jeu quand demandé
 * - Éviter les initialisations doubles
 * - Fournir les fonctions de jeu via le store
 */
export function GameProvider({ children, autoInitialize = false }: GameProviderProps) {
  const { initGame, isInitialized } = useActiveGameStore();
  const initRef = useRef(false);

  useEffect(() => {
    // Initialiser une seule fois au montage si autoInitialize = true
    if (autoInitialize && !initRef.current && !isInitialized) {
      // [COMMENTED-v1] console.log(`[GAME-PROVIDER] Initializing game`);
      initRef.current = true;
      initGame();
    }
  }, [autoInitialize, isInitialized, initGame]);

  return <>{children}</>;
}
