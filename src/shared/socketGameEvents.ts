/**
 * Socket.io Game Events - EXACT COPY from domino-vite server
 * 100% aligned with domino-vite for data interchange
 */

import type { Domino } from './Domino';

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYER & BOARD TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TrackedDomino {
  domino: Domino;
  side: 'left' | 'right';
  turn: number;
  playerId: number;
}

export interface PlacedDomino {
  domino: Domino;
  line?: 'main-line' | 'upper-line' | 'lower-line' | 'left_up-position' | 'right_down-position';
}

export interface BoardState {
  trainSequence: TrackedDomino[];
  trainOnBoard: PlacedDomino[];
}

export interface PlayerDatas {
  id: number;
  name: string;
  isAI: boolean;
  dominos: Domino[];
  dominoCount: number;
  hasPassed: boolean;
  playables?: number[];
  placements?: ('left' | 'right' | 'both')[];
  canPlay?: boolean;
}

export interface StateDatas {
  consecutivePasses: number;
  lastPlayedDomino?: { domino: Domino; side: 'left' | 'right' };
  lastPlayedPlayerId?: number;
  lastPlayerWhoPassedId?: number;
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
// GAME STATE
// ═══════════════════════════════════════════════════════════════════════════════

export interface TurnState {
  turnNumber: number;
  currentPlayerId: number;
  currentPlayerName: string;
  actionType: 'PLACED' | 'PASSED';

  board: BoardState;
  players: PlayerDatas[];

  // Champs FLAT (format réel émis par le serveur) — source de vérité = players[]
  consecutivePasses: number;
  lastPlayedDomino?: { domino: Domino; side: 'left' | 'right' };
  lastPlayedPlayerId?: number;
  lastPlayerWhoPassedId?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT PAYLOADS
// ═══════════════════════════════════════════════════════════════════════════════

export type TurnPostPayload =
  | {
      type: 'played';
      mode: 'local' | 'socket';
      playerId: number;
      domino: Domino;
      side: 'left' | 'right';
      knocked: boolean;
    }
  | {
      type: 'passed';
      mode: 'local' | 'socket';
      playerId: number;
      playerName: string;
    };

export interface GameStartedPayload {
  // Match & Game IDs
  matchId: string;
  gameId: string;

  // Game configuration
  config: {
    maxPoints: number;
    numSets: number;
    mode: 'teams' | 'individual';
  };

  // Game state at start
  turnNumber: number;
  firstPlayerId: number;

  // Board state (empty at start)
  board: BoardState;

  // Players with full initial state
  players: Array<{
    id: number;
    name: string;
    isAI: boolean;
    dominos: Domino[];
    dominoCount: number;
    team: 'V' | 'H';
    hasPassed: boolean;
  }>;
}

/**
 * Payload canonique GAME_ENDED (mode SOCKET) — MIROIR de
 * domino-vite/src/shared/GameEvent.ts. Le serveur est la source de vérité :
 * garder ces deux interfaces synchronisées. Émis à la fin de CHAQUE partie.
 */
export interface GameEndedPayload {
  // ─── Contexte ───
  matchId: string;
  gameId: string;
  mode: 'individual' | 'teams';
  config: { maxPoints: number; numSets: number };

  // ─── Joueurs (métadonnées) ───
  players: Array<{ id: number; name: string; type: 'human' | 'AI'; team: 'V' | 'H' }>;

  // ─── Niveau PARTIE (cette main) ───
  game: {
    winnerId: number;
    winnerName: string;
    winningType: 'EMPTY_HAND' | 'BLOCKED_GAME';
    remainingPips: { p0: number; p1: number; p2: number; p3: number };
    individualScores: { p0: number; p1: number; p2: number; p3: number };
    teamScores: { V: number; H: number };
  };

  // ─── Niveau SET (cumul en cours) ───
  set: {
    individualTotals: { p0: number; p1: number; p2: number; p3: number };
    teamTotals: { V: number; H: number };
    isFinished: boolean;
    winnerId?: number;
    winnerTeam?: 'V' | 'H';
  };

  // ─── Niveau MATCH (progression) ───
  match: {
    individualSetsWon: { p0: number; p1: number; p2: number; p3: number };
    teamSetsWon: { V: number; H: number };
    isFinished: boolean;
    winner:
      | { id: number; name: string; type: 'individual' }
      | { team: 'V' | 'H'; name: string; type: 'team' }
      | null;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type GameEvent =
  | { type: 'RESTART_GAME'; payload: {} }
  | { type: 'LEAVE_ROOM'; payload: { playerId: number } }
  | { type: 'GAME_READY'; payload: {} }
  | { type: 'GAME_STARTED'; payload: GameStartedPayload }
  | { type: 'TURN_STATE'; payload: TurnState }
  | { type: 'TURN_POST'; payload: TurnPostPayload }
  | { type: 'GAME_ENDED'; payload: GameEndedPayload }
  | { type: 'SET_ENDED'; payload: { winningTeam: 'V' | 'H'; finalScores: { teamV: number; teamH: number }; roundsPlayed: number; teamVWins: number; teamHWins: number } };

export type EventListener<E extends GameEvent> = (payload: E['payload']) => void;
