import type { GameResult, MatchState, ScoringMode } from '../controllers/MatchManager';

export interface IMatchStorage {
  saveGame(game: GameResult): Promise<void>;
  getMatchState(): Promise<MatchState>;
  getAllGames(): Promise<GameResult[]>;
  reset(mode: ScoringMode): Promise<void>;
}
