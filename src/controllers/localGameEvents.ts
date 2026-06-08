
import type { Domino } from '../shared/Domino';

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Player {
  id: number;
  name: string;
  dominoCount: number;
  hasPassed: boolean;
  score: number;
}

export interface PlayerTurnState {
  id: number;
  name: string;
  dominos: (Domino | null)[];
  dominoCount: number;
  playables: number[];
  placements: ('left' | 'right' | 'both')[];
  hasPassed: boolean;
  canPlay: boolean;
}


// ═══════════════════════════════════════════════════════════════════════════════
// BOARD STATE INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TrackedDomino {
  domino: Domino;
  side: 'left' | 'right';
  turn: number;
  playerId: number;
}

export interface PlacedDomino {
  domino: Domino;
}

export interface BoardState {
  trainSequence: TrackedDomino[];
  trainOnBoard: PlacedDomino[];
}

export interface TurnState {
  turnNumber: number;
  currentPlayerId: number;
  currentPlayerName: string;
  phase: 'STARTED' | 'PLACED' | 'PASSED' | 'ENDED';
  board: BoardState;
  players: PlayerTurnState[];
  playerState: {
    id: number;
    playables: number[];
    canPlay: boolean;
  };
  consecutivePasses: number;
  lastPlayerWhoPassedId?: number;
  gameEnded: boolean;
  winner?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT PAYLOADS
// ═══════════════════════════════════════════════════════════════════════════════

export interface PlayTurnPayload {
  turnNumber: number;
  currentPlayerId: number;
  currentPlayerName: string;
  currentPlayerDominos: Domino[];
  playables: number[];
  placements: ('left' | 'right' | 'both')[];
  canPlay: boolean;
  board: BoardState;
  players: PlayerTurnState[];
  lastPlayerWhoPassedId?: number;
}

export type PlayResponsePayload =
  | {
      type: 'played';
      playerId: number;
      domino: Domino;
      side: 'left' | 'right';
      knocked: boolean;
    }
  | {
      type: 'passed';
      playerId: number;
      playerName: string;
    };

export interface TurnUpdatedPayload {
  turnNumber: number;
  nextPlayerId: number;
  board: BoardState;
  players: PlayerTurnState[];
  lastPlayerWhoPassedId?: number;
}

export interface GameStartedPayload {
  turnNumber: number;
  currentPlayerId: number;
  players: PlayerTurnState[];
  board: BoardState;
}

export interface PlayPassedPayload {
  playerId: number;
}

export interface GameEndedPayload {
  winner: {
    id: number;
    name: string;
  };
  winningType: 'EMPTY_HAND' | 'BLOCKED_GAME';
  rawScores: {
    p0: number;
    p1: number;
    p2: number;
    p3: number;
  };
  scores?: {
    playerId: number;
    playerName: string;
    score: number;
  }[];
}

export interface PassHiddenPayload {
  playerId: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type LocalGameEvent =
  | { type: 'GAME_STARTED'; payload: GameStartedPayload }
  | { type: 'PLAY_TURN'; payload: PlayTurnPayload }
  | { type: 'PLAY_RESPONSE'; payload: PlayResponsePayload }
  | { type: 'PLAY_PASSED'; payload: PlayPassedPayload }
  | { type: 'TURN_UPDATED'; payload: TurnUpdatedPayload }
  | { type: 'GAME_ENDED'; payload: GameEndedPayload }
  | { type: 'PASS_HIDDEN'; payload: PassHiddenPayload }
  | { type: 'RESTART_GAME'; payload: {} };

export type LocalEventListener<E extends LocalGameEvent> = (payload: E['payload']) => void;
