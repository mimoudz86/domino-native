/**
 * Shared Types & Components - Unified exports
 */

export type { Domino } from './Domino.js';

export type {
  Player,
  PlayerDatas,
  PlayerTurnState,
  TrackedDomino,
  PlacedDomino,
  BoardState,
  StateDatas,
  TurnState,
  PlayTurnPayload,
  TurnPostPayload,
  TurnUpdatedPayload,
  GameStartedPayload,
  PlayPassedPayload,
  GameEndedPayload,
  PassHiddenPayload,
  LocalGameEvent,
  LocalEventListener
} from '../controllers/localGameEvents.js';

// Aliases for socket compatibility
export type {
  LocalGameEvent as GameEvent,
  LocalEventListener as EventListener
} from '../controllers/localGameEvents.js';

export type {
  TurnState as SocketTurnState,
  GameStartedPayload as SocketGameStartedPayload,
  GameEndedPayload as SocketGameEndedPayload
} from './socketGameEvents.js';

export { GameStateBuilder } from './GameStateBuilder.js';
