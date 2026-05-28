import type { GameResult, MatchState, ScoringMode } from '../controllers/Score';
import type { RawGame, MatchWinner } from '../shared/scoring/scoreCalculator';
import type { MatchConfig } from '../types/MatchConfig';

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
