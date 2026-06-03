import React, { useEffect, useRef } from 'react';
import { useActiveGameStore } from '../store/gameStoreContext';
import { DEFAULT_MATCH_CONFIG } from '../services/IMatchStorage';

interface GameProviderProps {
  children: React.ReactNode;
  autoInitialize?: boolean;
}

/**
 * GameProvider - Gère l'initialisation du jeu au niveau global
 *
 * Responsabilités:
 * - Créer un nouveau match (startNewMatch)
 * - Initialiser le jeu (initGame)
 * - Éviter les initialisations doubles
 * - Fournir les fonctions de jeu via le store
 */
export function GameProvider({ children, autoInitialize = false }: GameProviderProps) {
  const { startNewMatch, initGame, isInitialized } = useActiveGameStore();
  const initRef = useRef(false);

  useEffect(() => {
    // Initialiser une seule fois au montage si autoInitialize = true
    if (autoInitialize && !initRef.current && !isInitialized) {
      initRef.current = true;
      (async () => {
        await startNewMatch(DEFAULT_MATCH_CONFIG);
        await initGame(['AI 1', 'AI 2', 'AI 3', 'AI 4'], [true, true, true, true]);
      })();
    }
  }, [autoInitialize, isInitialized, startNewMatch, initGame]);

  return <>{children}</>;
}
