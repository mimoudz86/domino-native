import * as SQLite from 'expo-sqlite';
import type { GameResult, MatchState, ScoringMode } from '../controllers/MatchManager';
import type { IMatchStorage } from './IMatchStorage';
import type { MatchConfig } from '../types/MatchConfig';
import { DEFAULT_MATCH_CONFIG } from '../types/MatchConfig';
import type { RawGame, MatchWinner } from '../shared/scoring/scoreCalculator';
import {
  calcIndividualScores,
  calcTeamScores,
  isMatchFinished,
  getMatchWinner
} from '../shared/scoring/scoreCalculator';

export class LocalMatchStorage implements IMatchStorage {
  private static sharedDb: SQLite.SQLiteDatabase | null = null;
  private static initPromise: Promise<SQLite.SQLiteDatabase> | null = null;
  private matchConfig: MatchConfig;

  constructor(matchConfig: MatchConfig = DEFAULT_MATCH_CONFIG) {
    this.matchConfig = matchConfig;
  }

  // Initialiser la BD une seule fois au démarrage de l'app
  static async initializeDatabase(): Promise<void> {
    if (LocalMatchStorage.sharedDb) {
      console.log(`LOG  [STORAGE] ℹ️  Database already initialized`);
      return;
    }

    if (LocalMatchStorage.initPromise) {
      await LocalMatchStorage.initPromise;
      return;
    }

    LocalMatchStorage.initPromise = LocalMatchStorage.createDatabase();
    LocalMatchStorage.sharedDb = await LocalMatchStorage.initPromise;
    console.log(`LOG  [STORAGE] 🗄️  Database initialized successfully`);
  }

  private static async createDatabase(): Promise<SQLite.SQLiteDatabase> {
    const db = await SQLite.openDatabaseAsync('domino_match.db');

    // Clean slate: drop tables if they exist, then recreate
    try {
      await db.execAsync(`
        DROP TABLE IF EXISTS turns;
        DROP TABLE IF EXISTS games;
        DROP TABLE IF EXISTS sets;
        DROP TABLE IF EXISTS matches;
      `);
      console.log(`LOG  [STORAGE] 🧹 Existing tables dropped`);
    } catch (error) {
      // Ignore errors if tables don't exist
    }

    // Table matches — configuration du match
    try {
      await db.execAsync(`
        CREATE TABLE matches (
          match_id TEXT PRIMARY KEY,
          mode TEXT NOT NULL,
          max_points INTEGER NOT NULL,
          num_sets INTEGER NOT NULL DEFAULT 1,
          started_at INTEGER NOT NULL,
          ended_at INTEGER,
          match_finished INTEGER NOT NULL DEFAULT 0,
          winner TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log(`LOG  [STORAGE] ✅ matches table created`);
    } catch (error) {
      console.error('[STORAGE] Error creating matches table:', error);
    }

    // Table sets — représente chaque set d'un match
    try {
      await db.execAsync(`
        CREATE TABLE sets (
          set_id TEXT PRIMARY KEY,
          match_id TEXT NOT NULL,
          set_number INTEGER NOT NULL,
          started_at INTEGER NOT NULL,
          ended_at INTEGER,
          set_finished INTEGER NOT NULL DEFAULT 0,
          winner TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(match_id) REFERENCES matches(match_id)
        );
      `);
      console.log(`LOG  [STORAGE] ✅ sets table created`);
    } catch (error) {
      console.error('[STORAGE] Error creating sets table:', error);
    }

    // Table games — données BRUTES (pips restants, pas les pips gagnés)
    try {
      await db.execAsync(`
        CREATE TABLE games (
          game_id TEXT PRIMARY KEY,
          match_id TEXT NOT NULL,
          set_id TEXT NOT NULL,
          game_index INTEGER NOT NULL,
          p0_score INTEGER NOT NULL DEFAULT 0,
          p1_score INTEGER NOT NULL DEFAULT 0,
          p2_score INTEGER NOT NULL DEFAULT 0,
          p3_score INTEGER NOT NULL DEFAULT 0,
          p0_name TEXT,
          p1_name TEXT,
          p2_name TEXT,
          p3_name TEXT,
          p0_type TEXT,
          p1_type TEXT,
          p2_type TEXT,
          p3_type TEXT,
          winner_id INTEGER NOT NULL,
          winner_name TEXT NOT NULL,
          winning_type TEXT NOT NULL,
          started_at INTEGER,
          ended_at INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(match_id) REFERENCES matches(match_id),
          FOREIGN KEY(set_id) REFERENCES sets(set_id)
        );
      `);
      console.log(`LOG  [STORAGE] ✅ games table created`);
    } catch (error) {
      console.error('[STORAGE] Error creating games table:', error);
    }

    // Table turns — détail des coups joués
    try {
      await db.execAsync(`
        CREATE TABLE turns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          game_id TEXT NOT NULL,
          turn_number INTEGER NOT NULL,
          player_id INTEGER NOT NULL,
          player_name TEXT,
          action TEXT NOT NULL,
          domino_left INTEGER,
          domino_right INTEGER,
          side TEXT,
          timestamp INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(game_id) REFERENCES games(game_id)
        );
      `);
      console.log(`LOG  [STORAGE] ✅ turns table created`);
    } catch (error) {
      console.error('[STORAGE] Error creating turns table:', error);
    }

    // Créer les index
    try {
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_games_match ON games(match_id);
        CREATE INDEX IF NOT EXISTS idx_games_set ON games(match_id, set_number);
        CREATE INDEX IF NOT EXISTS idx_turns_game ON turns(game_id);
      `);
    } catch {
      // Index peuvent déjà exister
    }

    return db;
  }

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!LocalMatchStorage.sharedDb) {
      throw new Error('Database not initialized. Call LocalMatchStorage.initializeDatabase() first.');
    }
    return LocalMatchStorage.sharedDb;
  }

  // Créer un nouveau match en BD
  async createMatch(matchId: string, config: MatchConfig): Promise<void> {
    try {
      const db = await this.getDb();
      const now = Date.now();

      // Créer le match
      await db.runAsync(
        `INSERT INTO matches (match_id, mode, max_points, num_sets, started_at, match_finished)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [matchId, config.mode, config.maxPoints, config.numSets, now, 0]
      );

      // Créer le premier set
      const setId = `LOCAL_S_${matchId}_1`;
      await db.runAsync(
        `INSERT INTO sets (set_id, match_id, set_number, started_at, set_finished)
         VALUES (?, ?, ?, ?, ?)`,
        [setId, matchId, 1, now, 0]
      );

      console.log(`LOG  [STORAGE] 🆕 MATCH_CREATED {"match_id":"${matchId}","mode":"${config.mode}","maxPoints":${config.maxPoints}}`);
      console.log(`LOG  [STORAGE] 🆕 SET_CREATED {"set_id":"${setId}","set_number":1}`);
    } catch (error) {
      console.error('[STORAGE] Error creating match:', error);
    }
  }

  // LEGACY: Sauvegarder un game (ancienne signature pour compatibilité)
  async saveGameLegacy(game: GameResult): Promise<void> {
    try {
      const db = await this.getDb();
      const gameId = `LEGACY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await db.runAsync(
        `INSERT INTO games (game_id, match_id, game_index, p0_score, p1_score, p2_score, p3_score, winner_id, winner_name, winning_type, started_at, ended_at)
         VALUES (?, ?, ?, 0, 0, 0, 0, ?, ?, ?, ?, ?)`,
        [
          gameId,
          'LEGACY_MATCH',
          game.gameNumber,
          game.winnerId,
          game.winnerName,
          game.winningType,
          Date.now(),
          Date.now()
        ]
      );

      console.log(`LOG  [STORAGE] 💾 GAME_SAVED_LEGACY {"gameNumber":${game.gameNumber},"winner":"${game.winnerName}"}`);
    } catch (error) {
      console.error('[STORAGE] Error saving game (legacy):', error);
    }
  }

  // Sauvegarder un game avec les données BRUTES
  async saveGame(
    gameId: string,
    matchId: string,
    gameIndex: number,
    rawGame: RawGame,
    setId: string
  ): Promise<void> {
    try {
      const db = await this.getDb();

      await db.runAsync(
        `INSERT INTO games (
          game_id, match_id, set_id, game_index,
          p0_score, p1_score, p2_score, p3_score,
          p0_name, p1_name, p2_name, p3_name,
          p0_type, p1_type, p2_type, p3_type,
          winner_id, winner_name, winning_type, started_at, ended_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          gameId,
          matchId,
          setId,
          gameIndex,
          rawGame.p0_score,
          rawGame.p1_score,
          rawGame.p2_score,
          rawGame.p3_score,
          rawGame.p0_name,
          rawGame.p1_name,
          rawGame.p2_name,
          rawGame.p3_name,
          rawGame.p0_type,
          rawGame.p1_type,
          rawGame.p2_type,
          rawGame.p3_type,
          rawGame.winner_id,
          rawGame.winner_name,
          rawGame.winning_type,
          Date.now(),
          Date.now()
        ]
      );

      console.log(`LOG  [STORAGE] 💾 GAME_SAVED {"gameId":"${gameId}","winner":"${rawGame.winner_name}","p0":${rawGame.p0_score},"p1":${rawGame.p1_score},"p2":${rawGame.p2_score},"p3":${rawGame.p3_score}}`);
    } catch (error) {
      console.error('[STORAGE] Error saving game:', error);
    }
  }

  // Sauvegarder un turn
  async saveTurn(
    gameId: string,
    turnNumber: number,
    playerId: number,
    playerName: string,
    action: 'PLAY' | 'PASS',
    dominoLeft?: number,
    dominoRight?: number,
    side?: 'left' | 'right'
  ): Promise<void> {
    try {
      const db = await this.getDb();

      await db.runAsync(
        `INSERT INTO turns (game_id, turn_number, player_id, player_name, action, domino_left, domino_right, side, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [gameId, turnNumber, playerId, playerName, action, dominoLeft, dominoRight, side, Date.now()]
      );
    } catch (error) {
      console.error('[STORAGE] Error saving turn:', error);
    }
  }

  // Obtenir tous les games d'un match
  async getLastGameIndex(matchId: string): Promise<number> {
    try {
      const games = await this.getGamesForMatch(matchId);
      return games.length > 0 ? Math.max(...games.map((_, i) => i + 1)) : 0;
    } catch (error) {
      console.error('[STORAGE] Error getting last game index:', error);
      return 0;
    }
  }

  async getGamesForMatch(matchId: string): Promise<RawGame[]> {
    try {
      const db = await this.getDb();

      const games = await db.getAllAsync<any>(
        'SELECT * FROM games WHERE match_id = ? ORDER BY game_index ASC',
        [matchId]
      );

      return games.map(g => ({
        p0_score: g.p0_score,
        p1_score: g.p1_score,
        p2_score: g.p2_score,
        p3_score: g.p3_score,
        p0_name: g.p0_name,
        p1_name: g.p1_name,
        p2_name: g.p2_name,
        p3_name: g.p3_name,
        p0_type: g.p0_type,
        p1_type: g.p1_type,
        p2_type: g.p2_type,
        p3_type: g.p3_type,
        winner_id: g.winner_id,
        winner_name: g.winner_name,
        winning_type: g.winning_type,
        set_number: g.set_number
      } as RawGame));
    } catch (error) {
      console.error('[STORAGE] Error loading games:', error);
      return [];
    }
  }

  // Obtenir le dernier match actif (non terminé)
  async getActiveMatch(): Promise<{ matchId: string; config: MatchConfig; currentSet: number } | null> {
    try {
      const db = await this.getDb();

      const match = await db.getFirstAsync<any>(
        'SELECT * FROM matches WHERE match_finished = 0 ORDER BY started_at DESC LIMIT 1'
      );

      if (!match) return null;

      return {
        matchId: match.match_id,
        config: {
          mode: match.mode as ScoringMode,
          maxPoints: match.max_points,
          numSets: match.num_sets
        }
      };
    } catch (error) {
      console.error('[STORAGE] Error loading active match:', error);
      return null;
    }
  }

  // Obtenir les scores calculés d'un match
  async getMatchScore(matchId: string, mode: ScoringMode): Promise<Record<number, number> | { teamV: number; teamH: number } | null> {
    try {
      const games = await this.getGamesForMatch(matchId);
      if (games.length === 0) return null;

      if (mode === 'individual') {
        return calcIndividualScores(games);
      }
      return calcTeamScores(games);
    } catch (error) {
      console.error('[STORAGE] Error calculating match score:', error);
      return null;
    }
  }

  // Marquer un match comme terminé
  async finishMatch(matchId: string, winner: MatchWinner): Promise<void> {
    try {
      const db = await this.getDb();

      await db.runAsync(
        `UPDATE matches SET match_finished = 1, winner = ?, ended_at = ? WHERE match_id = ?`,
        [winner ? JSON.stringify(winner) : null, Date.now(), matchId]
      );

      console.log(`LOG  [STORAGE] 🏆 MATCH_FINISHED {"match_id":"${matchId}","winner":${JSON.stringify(winner)}}`);
    } catch (error) {
      console.error('[STORAGE] Error finishing match:', error);
    }
  }

  // LEGACY: Récupérer l'état du match (pour compatibilité avec ancien code)
  async getMatchState(): Promise<MatchState> {
    try {
      const activeMatch = await this.getActiveMatch();
      if (!activeMatch) {
        return {
          mode: this.matchConfig.mode,
          maxPoints: this.matchConfig.maxPoints,
          numSets: this.matchConfig.numSets,
          games: [],
          scoreIndividual: { 0: 0, 1: 0, 2: 0, 3: 0 },
          scoreTeams: { teamV: 0, teamH: 0 },
          matchFinished: false,
          winner: null,
          currentGameNumber: 0,
          currentSetNumber: 1
        };
      }

      const games = await this.getGamesForMatch(activeMatch.matchId);
      const scores = activeMatch.config.mode === 'individual'
        ? calcIndividualScores(games)
        : { ...calcTeamScores(games) };

      const finished = isMatchFinished(games, activeMatch.config.mode, activeMatch.config.maxPoints);
      const matchWinner = finished ? getMatchWinner(games, activeMatch.config.mode, activeMatch.config.maxPoints) : null;

      return {
        mode: activeMatch.config.mode,
        maxPoints: activeMatch.config.maxPoints,
        numSets: activeMatch.config.numSets,
        games: [], // Legacy: pas utilisé, les games sont dans la BD
        scoreIndividual: activeMatch.config.mode === 'individual' ? (scores as Record<number, number>) : { 0: 0, 1: 0, 2: 0, 3: 0 },
        scoreTeams: activeMatch.config.mode === 'teams' ? (scores as { teamV: number; teamH: number }) : { teamV: 0, teamH: 0 },
        matchFinished: finished,
        winner: matchWinner,
        currentGameNumber: games.length,
        currentSetNumber: activeMatch.currentSet || 1
      };
    } catch (error) {
      console.error('[STORAGE] Error loading match state:', error);
      return {
        mode: this.matchConfig.mode,
        maxPoints: this.matchConfig.maxPoints,
        numSets: this.matchConfig.numSets,
        games: [],
        scoreIndividual: { 0: 0, 1: 0, 2: 0, 3: 0 },
        scoreTeams: { teamV: 0, teamH: 0 },
        matchFinished: false,
        winner: null,
        currentGameNumber: 0,
          currentSetNumber: 1
      };
    }
  }

  // LEGACY: Récupérer tous les games (pour compatibilité)
  async getAllGames(): Promise<GameResult[]> {
    try {
      const db = await this.getDb();

      const games = await db.getAllAsync<any>(
        'SELECT * FROM games ORDER BY game_index ASC'
      );

      return games.map(g => ({
        gameNumber: g.game_index,
        winnerId: g.winner_id,
        winnerName: g.winner_name,
        winningType: g.winning_type,
        timestamp: g.started_at
      } as GameResult));
    } catch (error) {
      console.error('[STORAGE] Error loading games:', error);
      return [];
    }
  }

  // LEGACY: Réinitialiser le match (pour compatibilité)
  async reset(mode: ScoringMode): Promise<void> {
    try {
      const db = await this.getDb();

      // Supprimer tous les games
      await db.runAsync('DELETE FROM turns');
      await db.runAsync('DELETE FROM games');

      console.log(`LOG  [STORAGE] 🔄 MATCH_RESET {"mode":"${mode}"}`);
    } catch (error) {
      console.error('[STORAGE] Error resetting match:', error);
    }
  }

  async nextSet(matchId: string): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execAsync(
        'UPDATE matches SET current_set = current_set + 1 WHERE match_id = ?',
        [matchId]
      );
      console.log(`LOG  [STORAGE] 📈 SET_INCREMENTED {"matchId":"${matchId}"}`);
    } catch (error) {
      console.error('[STORAGE] Error incrementing set:', error);
    }
  }

  async getMatchStateById(matchId: string): Promise<MatchState | null> {
    try {
      const db = await this.getDb();
      const match = await db.getFirstAsync<any>('SELECT * FROM matches WHERE match_id = ?', [matchId]);
      if (!match) return null;

      const games = await this.getGamesForMatch(matchId);
      const config = { mode: match.mode as ScoringMode, maxPoints: match.max_points, numSets: match.num_sets };
      const scores = config.mode === 'individual' ? calcIndividualScores(games) : { ...calcTeamScores(games) };
      const finished = isMatchFinished(games, config.mode, config.maxPoints);
      const matchWinner = finished ? getMatchWinner(games, config.mode, config.maxPoints) : null;

      return {
        mode: config.mode,
        maxPoints: config.maxPoints,
        numSets: config.numSets,
        games: [],
        scoreIndividual: config.mode === 'individual' ? (scores as Record<number, number>) : { 0: 0, 1: 0, 2: 0, 3: 0 },
        scoreTeams: config.mode === 'teams' ? (scores as { teamV: number; teamH: number }) : { teamV: 0, teamH: 0 },
        matchFinished: finished,
        winner: matchWinner,
        currentGameNumber: games.length,
        currentSetNumber: match.current_set
      };
    } catch (error) {
      console.error('[STORAGE] Error loading match state by ID:', error);
      return null;
    }
  }
}
