import { Domino } from './Domino';
import type { TrainLineType } from '../../types/train.types';

export { Domino };

/**
 * ═══════════════════════════════════════════════════════════════
 * PLAYER TYPES
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Simple player info (no dominos - public data)
 */
export interface Player {
  id: number;
  name: string;
  dominoCount: number;
  hasPassed: boolean;
  score: number;
}

/**
 * Player state for turn (can include dominos for current player or nulls for others)
 */
export interface PlayerTurnState {
  id: number;
  name: string;
  dominos: (Domino | null)[];  // Array of Dominoes for current player, or array of nulls for opponents (privacy)
  dominoCount: number;  // Always present: count of dominoes in hand
  playables: number[];  // Indices of playable dominos
  placements: ('left' | 'right' | 'both')[];  // Placement type for each playable domino
  hasPassed: boolean;
  canPlay: boolean;
}

/**
 * Player with full hand info (private data - only for current player)
 * Used internally by GameEngine
 */
export interface PlayerWithHand extends PlayerTurnState {
  score: number;
}

/**
 * ═══════════════════════════════════════════════════════════════
 * BOARD STATE INTERFACES
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Chronological record of every domino placed
 * Immutable history for replay, audit, validation
 */
export interface TrackedDomino {
  domino: Domino;
  side: 'left' | 'right';   // Direction relative to current endpoints
  turn: number;              // When it was placed
  playerId: number;          // Who placed it
}

/**
 * Logical layout of the train (physical arrangement)
 * Ready for immediate rendering on client
 */
export interface PlacedDomino {
  domino: Domino;
  line?: TrainLineType;  // Optional: line assignment (future-proof for server-provided layout)
}

/**
 * Complete board state
 * SOURCE UNIQUE DE VÉRITÉ: trainOnBoard (contient l'état réel du plateau)
 */
export interface BoardState {
  trainSequence: TrackedDomino[];    // Chronological history
  trainOnBoard: PlacedDomino[];      // Current logical layout
}

export interface GameEndData {
  winner: {
    id: number;
    name: string;
  };
  scores?: Array<{
    playerId: number;
    playerName: string;
    score: number;
  }>;
  // Team-based scoring
  teamV?: {
    teamName: string;
    players: Array<{ id: number; name: string; score: number }>;
    totalScore: number;
  };
  teamH?: {
    teamName: string;
    players: Array<{ id: number; name: string; score: number }>;
    totalScore: number;
  };
  winningTeam?: 'V' | 'H';
  pointsEarned?: number;
}

export interface TurnState {
  turnNumber: number;
  currentPlayerIndex: number;
  currentPlayerName: string;
  phase: 'STARTED' | 'PLACED' | 'PASSED' | 'ENDED';

  // ✅ Board state (complete game board)
  board: BoardState;

  // Players state
  players: PlayerTurnState[];
  playerState: {
    id: number;
    playables: number[];
    canPlay: boolean;
  };

  // Game flow
  consecutivePasses: number;
  lastPlayerWhoPassedId?: number;  // 🎯 NEW: Player who just passed (valid for 1 turn)
  gameEnded: boolean;
  winner?: number;

  // Game end data (populated only when gameEnded === true)
  endData?: GameEndData;

  // 🎯 NEW: Unified game end state (replaces endData)
  gameEndState?: any;
}
