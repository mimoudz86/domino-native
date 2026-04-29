/**
 * GameStoreContext - Contexte pour switcher entre LocalGameStore et ServerGameStore
 *
 * Les composants utilisent `useActiveGameStore()` qui retourne le bon store.
 * Complètement transparent pour les composants.
 *
 * Futur: Ajouter ServerGameStore, configurer via context.
 */

import { createContext, useContext } from 'react';
import type { IGameStore } from './IGameStore';
import { useGameStore } from './gameStore';

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT (sera utilisé pour switcher à l'avenir)
// ═══════════════════════════════════════════════════════════════════════════════

interface GameStoreContextType {
  mode: 'local' | 'server';
  setMode: (mode: 'local' | 'server') => void;
}

export const GameStoreContext = createContext<GameStoreContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useActiveGameStore()
// Retourne le bon store selon le mode
// ═══════════════════════════════════════════════════════════════════════════════

export function useActiveGameStore(): IGameStore;
export function useActiveGameStore<T>(selector: (state: IGameStore) => T): T;
export function useActiveGameStore<T>(selector?: (state: IGameStore) => T): IGameStore | T {
  const context = useContext(GameStoreContext);

  // Pour maintenant, on retourne toujours LocalGameStore
  // À l'avenir: retourner ServerGameStore si mode === 'server'
  if (selector) {
    return useGameStore(selector as any);
  }
  return useGameStore() as IGameStore;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER: GameStoreProvider
// À ajouter au niveau de l'App
// ═══════════════════════════════════════════════════════════════════════════════

import { ReactNode, useState } from 'react';

interface GameStoreProviderProps {
  children: ReactNode;
  initialMode?: 'local' | 'server';
}

export function GameStoreProvider({ children, initialMode = 'local' }: GameStoreProviderProps) {
  const [mode, setMode] = useState<'local' | 'server'>(initialMode);

  return (
    <GameStoreContext.Provider value={{ mode, setMode }}>
      {children}
    </GameStoreContext.Provider>
  );
}
