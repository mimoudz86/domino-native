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
  scores: Array<{
    playerId: number;
    playerName: string;
    score: number;
  }>;

  // Données du set (depuis MatchService via SocketManager)
  setScore: { teamVPoints: number; teamHPoints: number };
  winningTeam?: 'V' | 'H';

  // Progression du match (depuis MatchService)
  matchProgress: { team1SetsWon: number; team2SetsWon: number };
  isMatchFinished: boolean;
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
