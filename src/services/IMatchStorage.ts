import type { GameResult, MatchState, ScoringMode } from '../controllers/MatchManager';
import type { RawGame, MatchWinner } from '../shared/scoring/scoreCalculator';
import type { MatchConfig } from '../types/MatchConfig';

export interface IMatchStorage {
  // Match management
  createMatch(matchId: string, config: MatchConfig): Promise<void>;
  saveGame(gameId: string, matchId: string, gameIndex: number, rawGame: RawGame, setId: string): Promise<void>;
  updateMatchScoreTotals(matchId: string, mode: ScoringMode): Promise<void>;
  finishMatch(matchId: string, winner: MatchWinner): Promise<void>;
  nextSet(matchId: string): Promise<void>;
  getActiveSetId(matchId: string): Promise<string | null>;

  // Queries
  getMatchState(): Promise<MatchState>;
  getMatchStateById(matchId: string): Promise<MatchState | null>;
  getActiveMatch(): Promise<{ matchId: string; config: MatchConfig; currentSet: number } | null>;
  getGamesForMatch(matchId: string): Promise<RawGame[]>;
  getLastGameIndex(matchId: string): Promise<number>;
  getAllGames(): Promise<GameResult[]>;
  getMatchScore(matchId: string, mode: ScoringMode): Promise<Record<number, number> | { teamV: number; teamH: number } | null>;
  getMatchTotals(matchId: string): Promise<{ p0_total: number; p1_total: number; p2_total: number; p3_total: number; teamV_total: number; teamH_total: number } | null>;

  // Utilities
  reset(mode: ScoringMode): Promise<void>;
}
