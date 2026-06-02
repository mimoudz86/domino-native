import type { Domino } from '../shared/Domino';
import type { PlayerTurnState, BoardState, PlacedDomino } from '../shared/GameEvent';
import { useActiveGameStore } from './gameStoreContext';

export const useBoard = (): BoardState | null =>
  useActiveGameStore(s => s.turnState?.board ?? null);

export const useTrainOnBoard = (): PlacedDomino[] =>
  useActiveGameStore(s => s.turnState?.board?.trainOnBoard ?? []);

export const useAllPlayers = (): PlayerTurnState[] =>
  useActiveGameStore(s => s.turnState?.players ?? []);

export const usePlayerById = (id: number): PlayerTurnState | undefined =>
  useActiveGameStore(s => s.turnState?.players?.find(p => p.id === id));

export const useMyPlayer = (myId: number): PlayerTurnState | null =>
  useActiveGameStore(s => s.turnState?.players?.find(p => p.id === myId) ?? null);

export const useMyDominos = (myId: number): Domino[] =>
  useActiveGameStore(s => {
    const player = s.turnState?.players?.find(p => p.id === myId);
    return (player?.dominos ?? []).filter((d): d is Domino => d !== null);
  });

export const useIsMyTurn = (myId: number): boolean =>
  useActiveGameStore(s => s.turnState?.currentPlayerIndex === myId);

export const useLastPasser = (): PlayerTurnState | null =>
  useActiveGameStore(s => {
    const ts = s.turnState;
    if (!ts?.lastPlayerWhoPassedId) return null;
    return ts.players?.find(p => p.id === ts.lastPlayerWhoPassedId) ?? null;
  });

export const useDragState = () =>
  useActiveGameStore(s => s.dragState);
