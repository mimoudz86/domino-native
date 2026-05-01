/**
 * LocalGameEvent - Types d'événements pour le jeu local
 *
 * Architecture séquentielle:
 * 1. GameEngine émet PLAY_TURN (à un joueur spécifique)
 * 2. Joueur/IA répond avec PLAY_RESPONSE
 * 3. EventBusAdapter valide et émet TURN_UPDATED (broadcast)
 * 4. Quand partie terminée → GAME_ENDED
 */

import type { Domino } from '../shared/models/GameTurnState';

// ═══════════════════════════════════════════════════════════════
// STATE TYPES FOR EVENTS
// ═══════════════════════════════════════════════════════════════

export interface PlayerPublicState {
  id: number;
  name: string;
  dominoCount: number;
  hasPassed: boolean;
  isCurrentPlayer: boolean;
}

export interface PlayerPrivateState extends PlayerPublicState {
  dominos: Domino[];
  playables: number[];
  placements: ('left' | 'right' | 'both')[];
  canPlay: boolean;
}

export interface BoardUpdateState {
  trainOnBoard: {
    domino: Domino;
    line?: any;
  }[];
}

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
  board: BoardUpdateState;
  opponents: PlayerPublicState[];
  players: PlayerPublicState[];
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
  board: BoardUpdateState;
  players: PlayerPublicState[];
  lastPlayerWhoPassedId?: number;
}

export interface GameStartedPayload {
  turnNumber: number;
  currentPlayerIndex: number;
  players: PlayerPublicState[];
  board: BoardUpdateState;
}

export interface PlayPassedPayload {
  playerId: number;
}

export interface GameEndedPayload {
  winner: {
    id: number;
    name: string;
  };
  scores: {
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
