/**
 * LocalGameEvent - Types d'événements pour le jeu local
 *
 * Architecture séquentielle:
 * 1. GameEngine émet PLAY_TURN (à un joueur spécifique)
 * 2. Joueur/IA répond avec PLAY_RESPONSE
 * 3. EventBusAdapter valide et émet TURN_UPDATED (broadcast)
 * 4. Quand partie terminée → GAME_ENDED
 */

import type { Domino, BoardState, PlayerTurnState } from '../shared/models/GameTurnState';

// ═══════════════════════════════════════════════════════════════
// EVENT PAYLOADS
// ═══════════════════════════════════════════════════════════════

export interface PlayTurnPayload {
  turnNumber: number;
  yourIndex: number;
  yourName: string;
  yourDominos: Domino[];
  playables: number[];
  placements: ('left' | 'right' | 'both')[];
  canPlay: boolean;
  board: BoardState;
  opponents: PlayerTurnState[];
  players: PlayerTurnState[];
  lastPlayerWhoPassedId?: number;
}

export type PlayResponsePayload =
  | {
      playerId: number;
      domino: Domino;
      side: 'left' | 'right';
      knocked: boolean;
    }
  | {
      playerId: number;
      passed: true;
    };

export interface TurnUpdatedPayload {
  turnNumber: number;
  nextPlayerIndex: number;
  board: BoardState;
  players: PlayerTurnState[];
  lastPlayerWhoPassedId?: number;
}

export interface GameStartedPayload {
  turnNumber: number;
  currentPlayerIndex: number;
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

// ═══════════════════════════════════════════════════════════════
// EVENT TYPES
// ═══════════════════════════════════════════════════════════════

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
