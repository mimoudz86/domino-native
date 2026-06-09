import { useMemo } from 'react';
import type { Domino } from '../shared/Domino';
import type { PlayerDatas, PlacedDomino, TurnState } from '../controllers/localGameEvents';
import { useActiveGameStore } from './gameStoreContext';

// ═══════════════════════════════════════════════════════════════
// CORE SELECTORS
//
// Source de vérité UNIQUE: turnState.players[]
// useActiveGameStore() retourne le bon store (local|socket) via GameModeContext.
// Aucune logique conditionnelle ici → identique web/local/socket.
// ═══════════════════════════════════════════════════════════════

export const useTurnState = (): TurnState | null =>
  useActiveGameStore(s => s.turnState ?? null);

export const useCurrentPlayerId = (): number | null =>
  useActiveGameStore(s => s.turnState?.currentPlayerId ?? null);

export const useBoard = () =>
  useActiveGameStore(s => s.turnState?.board ?? null);

export const useTrainOnBoard = (): PlacedDomino[] =>
  useActiveGameStore(s => s.turnState?.board?.trainOnBoard ?? []);

export const useAllPlayers = (): PlayerDatas[] =>
  useActiveGameStore(s => s.turnState?.players ?? []);

export const usePlayerById = (id: number): PlayerDatas | undefined =>
  useActiveGameStore(s => s.turnState?.players?.find(p => p.id === id));

export const useMyPlayer = (myId: number): PlayerDatas | null =>
  useActiveGameStore(s => s.turnState?.players?.find(p => p.id === myId) ?? null);

export const useIsMyTurn = (myId: number): boolean =>
  useActiveGameStore(s => s.turnState?.currentPlayerId === myId);

// ─────────────────────────────────────────────────────────────
// Données du joueur — TOUT depuis players[] (comme le client web)
// ─────────────────────────────────────────────────────────────

export const useCurrentPlayerDominos = (myId: number): Domino[] =>
  useActiveGameStore(s => {
    const player = s.turnState?.players?.find(p => p.id === myId);
    return (player?.dominos ?? []).filter((d): d is Domino => d !== null);
  });

export const useMyDominos = useCurrentPlayerDominos;

export const usePlayables = (myId: number): number[] =>
  useActiveGameStore(s => s.turnState?.players?.find(p => p.id === myId)?.playables ?? []);

export const usePlacements = (myId: number): ('left' | 'right' | 'both')[] =>
  useActiveGameStore(s => s.turnState?.players?.find(p => p.id === myId)?.placements ?? []);

export const useCanPlay = (myId: number): boolean =>
  useActiveGameStore(s => s.turnState?.players?.find(p => p.id === myId)?.canPlay ?? false);

// ─────────────────────────────────────────────────────────────
// État du tour — champs FLAT (alignés serveur + web)
// ─────────────────────────────────────────────────────────────

export const useLastPasserId = (): number | undefined =>
  useActiveGameStore(s => s.turnState?.lastPlayerWhoPassedId);

export const usePasserPlayer = (): PlayerDatas | undefined => {
  const lastId = useLastPasserId();
  const players = useAllPlayers();

  return useMemo(
    () => players.find(p => p.id === lastId),
    [lastId, players]
  );
};

// ═══════════════════════════════════════════════════════════════
// DRAG & GAME-END (local store uniquement)
// ═══════════════════════════════════════════════════════════════

export const useDragState = () =>
  useActiveGameStore(s => s.dragState);

export const useGameEndData = () =>
  useActiveGameStore(state => ({
    gameEnded: state.gameEnded,
    currentGameData: state.currentGameData,
    currentGameId: state.currentGameId,
    currentSetId: state.currentSetId,
    currentSetData: state.currentSetData,
    currentMatchData: state.currentMatchData,
    selectedConfig: state.selectedConfig,
  }));

export const useGameEndActions = () =>
  useActiveGameStore(state => ({
    resetGameEndState: state.resetGameEndState,
    continueOrNewMatch: state.continueOrNewMatch,
    initGame: state.initGame,
    resetGame: state.resetGame,
  }));

// ═══════════════════════════════════════════════════════════════
// GAME ACTIONS — mode-aware via le store actif
// ═══════════════════════════════════════════════════════════════

export const usePlayDominoAction = () =>
  useActiveGameStore(s => s.playDomino);

export const usePassTurnAction = () =>
  useActiveGameStore(s => (s as any).passTurn ?? (() => {}));
