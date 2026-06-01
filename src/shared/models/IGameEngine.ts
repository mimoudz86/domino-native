import type { Player } from '../../controllers/Player';
import type { Board } from '../../controllers/Board';
import type { TrackedDomino } from './GameTurnState';

export interface IGameEngine {
  // Data properties
  players: Player[];
  board: Board;
  currentPlayerIndex: number;
  turnNumber: number;
  trainSequence: TrackedDomino[];
  trainOnBoard: any[];
  lastPlayerWhoPassedId: number | null;
  consecutivePassCount?: number;
  consecutivePasses?: number;
  lastPlayedDomino?: any;
  lastPlayedPlayerId?: number;
  isOver: boolean;
  winner: Player | null;
  winningType?: 'EMPTY_HAND' | 'BLOCKED_GAME';
  lastAction?: 'played' | 'passed' | null;

  // Methods
  getWinner(): Player | null;
  getPlayers(): Player[];
  getEnds?(): { leftEnd: number | null; rightEnd: number | null };
  getRemainingPips?(playerId: number): number;
}
