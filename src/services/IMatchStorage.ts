// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type RawGame = {
  p0_pips_remaining: number;
  p1_pips_remaining: number;
  p2_pips_remaining: number;
  p3_pips_remaining: number;
  p0_name: string;
  p1_name: string;
  p2_name: string;
  p3_name: string;
  p0_type: 'human' | 'AI';
  p1_type: 'human' | 'AI';
  p2_type: 'human' | 'AI';
  p3_type: 'human' | 'AI';
  winner_id: number;
  winner_name: string;
  winning_type: 'EMPTY_HAND' | 'BLOCKED_GAME';
  set_number?: number;
};

export type MatchWinner =
  | { id: number; name: string; type: 'individual' }
  | { team: 'V' | 'H'; name: string; type: 'team' }
  | null;

export type MatchConfig = {
  mode: 'individual' | 'teams';
  maxPoints: 50 | 100;
  numSets: 1 | 2 | 3;
};

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  mode: 'individual',
  maxPoints: 50,
  numSets: 3,
};

export type ScoringMode = 'individual' | 'teams';

export type GameResult = {
  gameNumber: number;
  winnerId: number;
  winnerName: string;
  winningType: 'EMPTY_HAND' | 'BLOCKED_GAME';
  timestamp: number;
};

export type MatchState = {
  mode: ScoringMode;
  maxPoints: 50 | 100;
  numSets: 1 | 2 | 3;
  games: GameResult[];
  scoreIndividual: Record<number, number>;
  scoreTeams: { teamV: number; teamH: number };
  matchFinished: boolean;
  winner: null | { id?: number; team?: 'V' | 'H'; name: string };
  currentGameNumber: number;
  currentSetNumber: number;
};

export interface IMatchStorage {
  // Match management
  createMatch(matchId: string, config: MatchConfig): Promise<void>;
  saveGame(gameId: string, matchId: string, gameIndex: number, rawGame: RawGame, setId: string, earnedPoints: Record<number, number>): Promise<void>;
  finishMatch(matchId: string, winner: MatchWinner): Promise<void>;
  nextSet(matchId: string): Promise<void>;
  getActiveSetId(matchId: string): Promise<string | null>;

  // Recording hierarchy (new system)
  recordToGame(payload: any, matchId: string, setId: string, gameIndex: number, config: MatchConfig): Promise<void>;
  recordToSet(matchId: string, setNumber: number): Promise<void>;
  recordToMatch(matchId: string, allGames: RawGame[], config: MatchConfig): Promise<void>;

  // Queries
  getMatchState(): Promise<MatchState>;
  getActiveMatch(matchId?: string): Promise<{ matchId: string; config: MatchConfig; currentSet: number } | null>;
  getGamesForMatch(matchId: string): Promise<RawGame[]>;
  getLastGameIndex(matchId: string): Promise<number>;
  getLastGame(gameId: string): Promise<any>;
  getLastSetData(matchId: string): Promise<any>;
  getAllGames(): Promise<GameResult[]>;
  getAllSetsData(matchId: string): Promise<any[]>;
  countFinishedSets(matchId: string): Promise<number>;

  // Utilities
  reset(mode: ScoringMode): Promise<void>;
  cleanupDatabase(): Promise<void>;
  getAllMatchesWithIndex(): Promise<any[]>;
  getAllMatchesStats(): Promise<any[]>;
  isMatchFinished(matchId: string): Promise<boolean>;

  // Fetch current game/set/match data by gameId
  getGameWithSetAndMatch(gameId: string): Promise<{ game: any; set: any; match: any } | null>;
  getGameData(gameId: string): Promise<any>;
  getSetByGameId(gameId: string): Promise<any>;
  getMatchByGameId(gameId: string): Promise<any>;
}
