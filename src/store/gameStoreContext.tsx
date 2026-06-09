/**
 * GameStoreContext - Contexte pour switcher entre LocalGameStore et SocketStore
 *
 * - GameScreenLocal: mode = 'local' → useActiveGameStore retourne gameStore
 * - GameScreenSocket: mode = 'socket' → useActiveGameStore retourne socketStore
 *
 * Les composants utilisent `useActiveGameStore()` qui retourne le bon store.
 * Complètement transparent pour les composants.
 */

import { createContext, useContext, ReactNode, useState } from 'react';
import type { IGameStore } from './IGameStore';
import { useGameStore } from './gameStore';
import { useSocketStore } from './socketStore';

type GameMode = 'local' | 'socket';

interface GameStoreContextType {
  mode: GameMode;
  setMode: (mode: GameMode) => void;
}

export const GameStoreContext = createContext<GameStoreContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useGameMode()
// Retourne le mode courant
// ═══════════════════════════════════════════════════════════════════════════════

export function useGameMode(): GameMode {
  const context = useContext(GameStoreContext);
  // Défaut 'local': les écrans de menu (hors GameStoreProvider) utilisent le gameStore local.
  // Seul GameScreenSocket force explicitement mode='socket'.
  return context?.mode ?? 'local';
}

export function useIsLocalMode(): boolean {
  return useGameMode() === 'local';
}

export function useIsSocketMode(): boolean {
  return useGameMode() === 'socket';
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useActiveGameStore()
// Retourne le bon store selon le mode
// ═══════════════════════════════════════════════════════════════════════════════

export function useActiveGameStore(): IGameStore;
export function useActiveGameStore<T>(selector: (state: IGameStore) => T): T;
export function useActiveGameStore<T>(selector?: (state: IGameStore) => T): IGameStore | T {
  const mode = useGameMode();
  const localStore = useGameStore();
  const socketStoreState = useSocketStore();

  // Sélectionner le bon store selon le mode
  const activeStore = mode === 'socket'
    ? (socketStoreState as unknown as IGameStore)
    : (localStore as IGameStore);

  if (selector) {
    return selector(activeStore);
  }
  return activeStore;
}

interface GameStoreProviderProps {
  children: ReactNode;
  mode: GameMode;
}

/**
 * GameStoreProvider - À envelopper autour de GameScreenLocal/Socket
 */
export function GameStoreProvider({ children, mode }: GameStoreProviderProps) {
  const [currentMode, setMode] = useState<GameMode>(mode);

  return (
    <GameStoreContext.Provider value={{ mode: currentMode, setMode }}>
      {children}
    </GameStoreContext.Provider>
  );
}
