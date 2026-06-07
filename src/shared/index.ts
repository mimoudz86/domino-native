/**
 * Shared Types & Components - Unified exports
 */

export type { Domino } from './Domino.js';

export type {
  Player,
  PlayerTurnState,
  TrackedDomino,
  PlacedDomino,
  BoardState,
  TurnState,
  PlayTurnPayload,
  PlayResponsePayload,
  TurnUpdatedPayload,
  GameStartedPayload,
  PlayPassedPayload,
  GameEndedPayload,
  PassHiddenPayload,
  LocalGameEvent,
  LocalEventListener
} from './GameEvent.js';

// Aliases for socket compatibility
export type {
  LocalGameEvent as GameEvent,
  LocalEventListener as EventListener
} from './GameEvent.js';

export type {
  TurnState as SocketTurnState,
  TurnPostPayload,
  GameStartedPayload as SocketGameStartedPayload,
  GameEndedPayload as SocketGameEndedPayload
} from './socketGameEvents.js';

export { GameStateBuilder } from './GameStateBuilder.js';
