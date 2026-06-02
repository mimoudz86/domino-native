import { useMemo } from 'react';
import type { Domino } from '../shared/Domino';
import type { PlayerTurnState, PlacedDomino } from '../shared/GameEvent';
import type { MatchConfig } from '../types/MatchConfig';
import { useActiveGameStore } from './gameStoreContext';

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

export const useDragState = () =>
  useActiveGameStore(s => s.dragState);

export const useGameEndData = () =>
  useActiveGameStore(state => ({
    gameEnded: state.gameEnded,
    lastGameData: state.lastGameData,
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

export const useLastPasserId = (): number | undefined =>
  useActiveGameStore(s => s.turnState?.lastPlayerWhoPassedId);

export const usePasserPlayer = (): PlayerTurnState | undefined => {
  const lastId = useLastPasserId();
  const players = useAllPlayers();

  return useMemo(
    () => players.find(p => p.id === lastId),
    [lastId, players]
  );
};
