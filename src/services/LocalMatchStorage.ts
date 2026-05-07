import * as SQLite from 'expo-sqlite';
import type { GameResult, MatchState, ScoringMode } from '../controllers/MatchManager';
import type { IMatchStorage } from './IMatchStorage';
import type { MatchConfig } from '../types/MatchConfig';
import { DEFAULT_MATCH_CONFIG } from '../types/MatchConfig';
import type { RawGame, MatchWinner } from '../shared/scoring/scoreCalculator';
import {
  calcIndividualScores, calcTeamScores,
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

    // Cleanup des matches incomplets au démarrage
    await LocalMatchStorage.cleanupIncompleteMatches();
  }

  // Cleanup des matches incomplets (match_finished = 0 = pas terminé proprement)
  private static async cleanupIncompleteMatches(): Promise<void> {
    try {
      if (!LocalMatchStorage.sharedDb) return;

      const db = LocalMatchStorage.sharedDb;

      // Trouver tous les matches non terminés
      const incompleteMatches = await db.getAllAsync<any>(
        `SELECT match_id FROM matches WHERE match_finished = 0`
      );

      if (incompleteMatches.length === 0) {
        console.log(`LOG  [STORAGE] 🧹 CLEANUP: No incomplete matches found`);
        return;
      }

      // Supprimer chaque match incomplet et ses données associées
      for (const { match_id } of incompleteMatches) {
        // Supprimer les turns de ce match
        await db.runAsync(
          `DELETE FROM turns WHERE game_id IN (
            SELECT game_id FROM games WHERE match_id = ?
          )`,
          [match_id]
        );

        // Supprimer les games de ce match
        await db.runAsync('DELETE FROM games WHERE match_id = ?', [match_id]);

        // Supprimer les sets de ce match
        await db.runAsync('DELETE FROM sets WHERE match_id = ?', [match_id]);

        // Supprimer le match
        await db.runAsync('DELETE FROM matches WHERE match_id = ?', [match_id]);

        console.log(`LOG  [STORAGE] 🧹 CLEANUP: Deleted incomplete match "${match_id}"`);
      }

      console.log(`LOG  [STORAGE] 🧹 CLEANUP: Removed ${incompleteMatches.length} incomplete match(es)`);
    } catch (error) {
      console.error('[STORAGE] Error during cleanup:', error);
    }
  }

  // Nettoyer les matchs incomplets AVANT de créer un nouveau match
  async cleanupIncompleteMatchesBeforeNew(): Promise<void> {
    try {
      const db = await this.getDb();

      const incompleteMatches = await db.getAllAsync<any>(
        `SELECT match_id FROM matches WHERE match_finished = 0`
      );

      for (const { match_id } of incompleteMatches) {
        await db.runAsync(
          `DELETE FROM turns WHERE game_id IN (
            SELECT game_id FROM games WHERE match_id = ?
          )`,
          [match_id]
        );
        await db.runAsync('DELETE FROM games WHERE match_id = ?', [match_id]);
        await db.runAsync('DELETE FROM sets WHERE match_id = ?', [match_id]);
        await db.runAsync('DELETE FROM matches WHERE match_id = ?', [match_id]);
        console.log(`LOG  [STORAGE] 🧹 CLEANUP_BEFORE_NEW: Deleted incomplete match "${match_id}"`);
      }
    } catch (error) {
      console.error('[STORAGE] Error during cleanup before new:', error);
    }
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

    // Table matches — configuration du match + pointeur set courant + comptage des sets gagnés
    try {
      await db.execAsync(`
        CREATE TABLE matches (
          match_id TEXT PRIMARY KEY,
          mode TEXT NOT NULL,
          max_points INTEGER NOT NULL,
          num_sets INTEGER NOT NULL DEFAULT 1,
          current_set_number INTEGER NOT NULL DEFAULT 1,
          started_at INTEGER NOT NULL,
          ended_at INTEGER,
          match_finished INTEGER NOT NULL DEFAULT 0,
          winner TEXT,
          p0_sets_won INTEGER NOT NULL DEFAULT 0,
          p1_sets_won INTEGER NOT NULL DEFAULT 0,
          p2_sets_won INTEGER NOT NULL DEFAULT 0,
          p3_sets_won INTEGER NOT NULL DEFAULT 0,
          teamV_sets_won INTEGER NOT NULL DEFAULT 0,
          teamH_sets_won INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log(`LOG  [STORAGE] ✅ matches table created`);
    } catch (error) {
      console.error('[STORAGE] Error creating matches table:', error);
    }

    // Table sets — représente chaque set d'un match + scores finaux du set
    try {
      await db.execAsync(`
        CREATE TABLE sets (
          set_id TEXT PRIMARY KEY,
          match_id TEXT NOT NULL,
          set_number INTEGER NOT NULL,
          started_at INTEGER NOT NULL,
          ended_at INTEGER,
          set_finished INTEGER NOT NULL DEFAULT 0,
          winner_id INTEGER,
          winner_name TEXT,
          p0_score INTEGER NOT NULL DEFAULT 0,
          p1_score INTEGER NOT NULL DEFAULT 0,
          p2_score INTEGER NOT NULL DEFAULT 0,
          p3_score INTEGER NOT NULL DEFAULT 0,
          teamV_score INTEGER NOT NULL DEFAULT 0,
          teamH_score INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(match_id) REFERENCES matches(match_id)
        );
      `);
      console.log(`LOG  [STORAGE] ✅ sets table created`);
    } catch (error) {
      console.error('[STORAGE] Error creating sets table:', error);
    }

    // Table games — pips restants ET points gagnés
    try {
      await db.execAsync(`
        CREATE TABLE games (
          game_id TEXT PRIMARY KEY,
          match_id TEXT NOT NULL,
          set_id TEXT NOT NULL,
          game_index INTEGER NOT NULL,
          p0_remainingpoints INTEGER NOT NULL DEFAULT 0,
          p1_remainingpoints INTEGER NOT NULL DEFAULT 0,
          p2_remainingpoints INTEGER NOT NULL DEFAULT 0,
          p3_remainingpoints INTEGER NOT NULL DEFAULT 0,
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
        CREATE INDEX IF NOT EXISTS idx_games_set ON games(match_id, set_id);
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

  // Créer un nouveau match en BD avec TOUS les sets d'avance
  async createMatch(matchId: string, config: MatchConfig): Promise<void> {
    try {
      const db = await this.getDb();
      const now = Date.now();

      // Créer le match (current_set_number = 1 par défaut)
      await db.runAsync(
        `INSERT INTO matches (match_id, mode, max_points, num_sets, current_set_number, started_at, match_finished)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
        [matchId, config.mode, config.maxPoints, config.numSets, now, 0]
      );

      // Créer TOUS les sets d'avance (sans is_active — le pointeur est dans matches)
      for (let i = 1; i <= config.numSets; i++) {
        const setId = `LOCAL_S_${matchId}_${i}`;

        await db.runAsync(
          `INSERT INTO sets (set_id, match_id, set_number, started_at, set_finished)
           VALUES (?, ?, ?, ?, ?)`,
          [setId, matchId, i, now, 0]
        );

        console.log(`LOG  [STORAGE] 🆕 SET_CREATED {"set_id":"${setId}","set_number":${i}}`);
      }

      console.log(`LOG  [STORAGE] 🆕 MATCH_CREATED {"match_id":"${matchId}","mode":"${config.mode}","maxPoints":${config.maxPoints},"numSets":${config.numSets},"currentSetNumber":1}`);
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

  // Sauvegarder un game avec les pips restants et les points gagnés
  async saveGame(
    gameId: string,
    matchId: string,
    gameIndex: number,
    rawGame: RawGame,
    setId: string,
    earnedPoints: Record<number, number>
  ): Promise<void> {
    try {
      const db = await this.getDb();

      await db.runAsync(
        `INSERT INTO games (
          game_id, match_id, set_id, game_index,
          p0_remainingpoints, p1_remainingpoints, p2_remainingpoints, p3_remainingpoints,
          p0_score, p1_score, p2_score, p3_score,
          p0_name, p1_name, p2_name, p3_name,
          p0_type, p1_type, p2_type, p3_type,
          winner_id, winner_name, winning_type, started_at, ended_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          gameId,
          matchId,
          setId,
          gameIndex,
          rawGame.p0_pips_remaining,
          rawGame.p1_pips_remaining,
          rawGame.p2_pips_remaining,
          rawGame.p3_pips_remaining,
          earnedPoints[0] || 0,
          earnedPoints[1] || 0,
          earnedPoints[2] || 0,
          earnedPoints[3] || 0,
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

      console.log(`LOG  [STORAGE] 💾 GAME_SAVED {"gameId":"${gameId}","winner":"${rawGame.winner_name}","p0_pips":${rawGame.p0_pips_remaining},"p1_pips":${rawGame.p1_pips_remaining},"p2_pips":${rawGame.p2_pips_remaining},"p3_pips":${rawGame.p3_pips_remaining}}`);
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
        [gameId, turnNumber, playerId, playerName, action, dominoLeft ?? null, dominoRight ?? null, side ?? null, Date.now()]
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

  async getLastGame(gameId: string): Promise<{
    p0_score: number;
    p1_score: number;
    p2_score: number;
    p3_score: number;
    p0_name: string;
    p1_name: string;
    p2_name: string;
    p3_name: string;
    winner_id: number;
    winner_name: string;
  } | null> {
    try {
      const db = await this.getDb();
      const game = await db.getFirstAsync<any>(
        `SELECT p0_remainingpoints, p1_remainingpoints, p2_remainingpoints, p3_remainingpoints,
                p0_score, p1_score, p2_score, p3_score,
                p0_name, p1_name, p2_name, p3_name,
                winner_id, winner_name
         FROM games
         WHERE game_id = ?`,
        [gameId]
      );

      console.log(`[STORAGE] 📋 getLastGame(${gameId}):`, game);

      if (!game) return null;

      return {
        p0_score: game.p0_remainingpoints,
        p1_score: game.p1_remainingpoints,
        p2_score: game.p2_remainingpoints,
        p3_score: game.p3_remainingpoints,
        p0_name: game.p0_name,
        p1_name: game.p1_name,
        p2_name: game.p2_name,
        p3_name: game.p3_name,
        winner_id: game.winner_id,
        winner_name: game.winner_name
      };
    } catch (error) {
      console.error('[STORAGE] Error getting last game:', error);
      return null;
    }
  }

  async getGamesForMatch(matchId: string): Promise<RawGame[]> {
    try {
      const db = await this.getDb();

      const games = await db.getAllAsync<any>(
        `SELECT g.*, s.set_number
         FROM games g
         LEFT JOIN sets s ON g.set_id = s.set_id
         WHERE g.match_id = ?
         ORDER BY g.game_index ASC`,
        [matchId]
      );

      return games.map(g => ({
        p0_pips_remaining: g.p0_remainingpoints,
        p1_pips_remaining: g.p1_remainingpoints,
        p2_pips_remaining: g.p2_remainingpoints,
        p3_pips_remaining: g.p3_remainingpoints,
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
  async getActiveMatch(matchId?: string): Promise<{ matchId: string; config: MatchConfig; currentSet: number } | null> {
    try {
      const db = await this.getDb();

      let match;
      if (matchId) {
        // Si matchId fourni, récupérer ce match spécifique
        match = await db.getFirstAsync<any>(
          'SELECT * FROM matches WHERE match_id = ?',
          [matchId]
        );
      } else {
        // Sinon, récupérer le dernier match non terminé
        match = await db.getFirstAsync<any>(
          'SELECT * FROM matches WHERE match_finished = 0 ORDER BY started_at DESC LIMIT 1'
        );
      }

      if (!match) {
        return null;
      }

      // Récupérer le set ACTIF via le pointeur (current_set_number)
      const currentSet = match.current_set_number || 1;

      return {
        matchId: match.match_id,
        config: {
          mode: match.mode as ScoringMode,
          maxPoints: match.max_points,
          numSets: match.num_sets
        },
        currentSet
      };
    } catch (error) {
      console.error('[STORAGE] Error loading active match:', error);
      return null;
    }
  }

  // Obtenir les scores calculés d'un match
  // Récupérer les totaux de points pour un match
  // Calculer les totaux de points en temps réel (pas de stockage)
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
      let scores: any;

      if (activeMatch.config.mode === 'individual') {
        // Sommer les earnedPoints depuis la DB
        const db = await this.getDb();
        const gamesData = await db.getAllAsync<any>(
          'SELECT p0_score, p1_score, p2_score, p3_score FROM games WHERE match_id = ?',
          [activeMatch.matchId]
        );
        scores = { 0: 0, 1: 0, 2: 0, 3: 0 };
        gamesData.forEach((g: any) => {
          scores[0] += g.p0_score || 0;
          scores[1] += g.p1_score || 0;
          scores[2] += g.p2_score || 0;
          scores[3] += g.p3_score || 0;
        });
      } else {
        scores = { ...calcTeamScores(games) };
      }

      const numSetsFinished = await this.countFinishedSets(activeMatch.matchId);
      const finished = isMatchFinished(numSetsFinished, activeMatch.config.numSets);
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

  // Nettoyer complètement la base de données
  async cleanupDatabase(): Promise<void> {
    try {
      const db = await this.getDb();

      // Supprimer toutes les données dans l'ordre inverse des dépendances
      await db.runAsync('DELETE FROM turns');
      await db.runAsync('DELETE FROM games');
      await db.runAsync('DELETE FROM sets');
      await db.runAsync('DELETE FROM matches');

      console.log(`LOG  [STORAGE] 🧹 DATABASE_CLEANUP_COMPLETE - All tables cleared`);
    } catch (error) {
      console.error('[STORAGE] Error cleaning up database:', error);
      throw error;
    }
  }

  // Récupérer tous les matches avec index (1, 2, 3... N) trié chronologiquement
  async getAllMatchesWithIndex(): Promise<any[]> {
    try {
      const db = await this.getDb();
      // Trier par created_at ASC pour avoir le plus ancien en premier = index 1
      const matches = await db.getAllAsync<any>(
        'SELECT * FROM matches ORDER BY created_at ASC'
      );

      if (!matches || matches.length === 0) {
        return [];
      }

      // Assigner un index à chaque match (1-based)
      return matches.map((match, index) => ({
        index: index + 1,
        match_id: match.match_id,
        mode: match.mode,
        max_points: match.max_points,
        num_sets: match.num_sets,
        match_finished: match.match_finished === 1 ? 'Finished' : 'In Progress',
        winner: match.winner ? JSON.parse(match.winner) : null,
        created_at: new Date(match.created_at).toISOString(),
      }));
    } catch (error) {
      console.error('[STORAGE] Error getting matches with index:', error);
      return [];
    }
  }

  // Récupérer tous les matches avec leurs détails pour les stats (avec index et scores par set)
  async getAllMatchesStats(): Promise<any[]> {
    try {
      const db = await this.getDb();
      const matchesWithIndex = await this.getAllMatchesWithIndex();

      if (matchesWithIndex.length === 0) {
        return [];
      }

      // Pour chaque match, récupérer le nombre de games et les scores par set
      const matchesWithDetails = await Promise.all(
        matchesWithIndex.map(async (match) => {
          const gameCount = await db.getFirstAsync<any>(
            'SELECT COUNT(*) as count FROM games WHERE match_id = ?',
            [match.match_id]
          );

          // Récupérer les scores de chaque set (limité à num_sets)
          const sets = await db.getAllAsync<any>(
            'SELECT set_number, p0_score, p1_score, p2_score, p3_score, teamV_score, teamH_score FROM sets WHERE match_id = ? AND set_number <= ? ORDER BY set_number',
            [match.match_id, match.num_sets]
          );

          const setPoints: any = {};
          sets.forEach((set) => {
            if (match.mode === 'individual') {
              setPoints[`set${set.set_number}`] = {
                p0: set.p0_score,
                p1: set.p1_score,
                p2: set.p2_score,
                p3: set.p3_score,
              };
            } else {
              setPoints[`set${set.set_number}`] = {
                teamV: set.teamV_score,
                teamH: set.teamH_score,
              };
            }
          });

          return {
            index: match.index,
            num_sets: match.num_sets,
            games_count: gameCount?.count || 0,
            match_finished: match.match_finished,
            winner: match.winner?.name || match.winner?.team || 'N/A',
            mode: match.mode,
            created_at: match.created_at,
            setPoints,
          };
        })
      );

      return matchesWithDetails;
    } catch (error) {
      console.error('[STORAGE] Error getting match stats:', error);
      return [];
    }
  }

  // Récupérer les données complètes de tous les sets d'un match
  async getAllSetsData(matchId: string): Promise<any[]> {
    try {
      const db = await this.getDb();
      const sets = await db.getAllAsync<any>(
        'SELECT set_number, p0_score, p1_score, p2_score, p3_score, teamV_score, teamH_score, winner_name, set_finished FROM sets WHERE match_id = ? ORDER BY set_number',
        [matchId]
      );
      return sets || [];
    } catch (error) {
      console.error('[STORAGE] Error getting all sets data:', error);
      return [];
    }
  }

  async getActiveSetId(matchId: string): Promise<string | null> {
    try {
      const db = await this.getDb();

      // Récupérer le numéro du set actif depuis le pointeur dans matches
      const match = await db.getFirstAsync<any>(
        'SELECT current_set_number FROM matches WHERE match_id = ?',
        [matchId]
      );

      if (!match) {
        console.log(`LOG  [STORAGE] 🔍 GET_ACTIVE_SET_ID {"matchId":"${matchId}","found":false,"reason":"match not found"}`);
        return null;
      }

      // Récupérer le set_id basé sur le set_number
      const set = await db.getFirstAsync<any>(
        'SELECT set_id FROM sets WHERE match_id = ? AND set_number = ?',
        [matchId, match.current_set_number]
      );

      const result = set?.set_id || null;
      console.log(`LOG  [STORAGE] 🔍 GET_ACTIVE_SET_ID {"matchId":"${matchId}","setNumber":${match.current_set_number},"setId":"${result || 'NULL'}"}`);
      return result;
    } catch (error) {
      console.error('[STORAGE] Error getting active set:', error);
      return null;
    }
  }

  async nextSet(matchId: string): Promise<void> {
    try {
      const db = await this.getDb();
      const now = Date.now();

      // Récupérer le pointeur set courant
      const match = await db.getFirstAsync<any>(
        'SELECT current_set_number, num_sets FROM matches WHERE match_id = ?',
        [matchId]
      );

      if (!match) {
        console.error(`[STORAGE] ❌ Match ${matchId} not found`);
        return;
      }

      const currentSetNumber = match.current_set_number;
      const nextSetNumber = currentSetNumber + 1;

      // Vérifier que le set courant existe et le marquer comme fini
      const currentSet = await db.getFirstAsync<any>(
        'SELECT set_id FROM sets WHERE match_id = ? AND set_number = ?',
        [matchId, currentSetNumber]
      );

      if (!currentSet) {
        console.error(`[STORAGE] ❌ Current set ${currentSetNumber} not found for match ${matchId}`);
        return;
      }

      // Marquer le set courant comme terminé
      await db.runAsync(
        'UPDATE sets SET set_finished = 1, ended_at = ? WHERE match_id = ? AND set_number = ?',
        [now, matchId, currentSetNumber]
      );

      // Vérifier que le set suivant existe (avant d'incrémenter le pointeur)
      if (nextSetNumber <= match.num_sets) {
        const nextSet = await db.getFirstAsync<any>(
          'SELECT set_id FROM sets WHERE match_id = ? AND set_number = ?',
          [matchId, nextSetNumber]
        );

        if (nextSet) {
          // Incrémenter le pointeur (seule UPDATE du match)
          await db.runAsync(
            'UPDATE matches SET current_set_number = ? WHERE match_id = ?',
            [nextSetNumber, matchId]
          );

          // Marquer le set suivant comme commencé
          await db.runAsync(
            'UPDATE sets SET started_at = ? WHERE match_id = ? AND set_number = ?',
            [now, matchId, nextSetNumber]
          );

          console.log(`LOG  [STORAGE] 📈 SET_TRANSITION {"matchId":"${matchId}","previousSet":${currentSetNumber},"nextSet":${nextSetNumber}}`);
        } else {
          console.error(`[STORAGE] ❌ Next set ${nextSetNumber} does not exist for match ${matchId}`);
        }
      } else {
        console.log(`LOG  [STORAGE] ⚠️  SET_TRANSITION: No more sets after ${currentSetNumber} (num_sets=${match.num_sets})`);
      }
    } catch (error) {
      console.error('[STORAGE] Error transitioning to next set:', error);
    }
  }

  // Helper: sauvegarder les scores finaux d'un set
  private async updateSetScores(matchId: string, setNumber: number, mode: string, scores: any): Promise<void> {
    const db = await this.getDb();
    const now = Date.now();

    if (mode === 'individual') {
      await db.runAsync(
        'UPDATE sets SET set_finished = 1, ended_at = ?, p0_score = ?, p1_score = ?, p2_score = ?, p3_score = ? WHERE match_id = ? AND set_number = ?',
        [now, scores[0] || 0, scores[1] || 0, scores[2] || 0, scores[3] || 0, matchId, setNumber]
      );
    } else {
      await db.runAsync(
        'UPDATE sets SET set_finished = 1, ended_at = ?, teamV_score = ?, teamH_score = ? WHERE match_id = ? AND set_number = ?',
        [now, scores.teamV || 0, scores.teamH || 0, matchId, setNumber]
      );
    }
  }

  // Helper: incrémenter le compteur de sets gagnés
  private async incrementSetWins(matchId: string, mode: string, scores: any): Promise<void> {
    const db = await this.getDb();

    if (mode === 'individual') {
      const winners = Object.entries(scores).filter(([_, s]: any) => s > 0).sort(([_, a]: any, [__, b]: any) => b - a);
      if (winners.length > 0) {
        const winnerId = parseInt(winners[0][0]);
        await db.runAsync(`UPDATE matches SET p${winnerId}_sets_won = p${winnerId}_sets_won + 1 WHERE match_id = ?`, [matchId]);
      }
    } else {
      if ((scores.teamV || 0) > (scores.teamH || 0)) {
        await db.runAsync('UPDATE matches SET teamV_sets_won = teamV_sets_won + 1 WHERE match_id = ?', [matchId]);
      } else if ((scores.teamH || 0) > (scores.teamV || 0)) {
        await db.runAsync('UPDATE matches SET teamH_sets_won = teamH_sets_won + 1 WHERE match_id = ?', [matchId]);
      }
    }
  }

  // Marquer un set comme terminé + calculer scores + mettre à jour compteurs
  // Compter combien de sets sont terminés (set_finished = 1) pour un match
  async countFinishedSets(matchId: string): Promise<number> {
    try {
      const db = await this.getDb();
      const result = await db.getFirstAsync<any>(
        'SELECT COUNT(*) as count FROM sets WHERE match_id = ? AND set_finished = 1',
        [matchId]
      );
      const count = result?.count || 0;
      console.log(`LOG  [STORAGE] 📊 COUNT_FINISHED_SETS {"matchId":"${matchId}","finishedSets":${count}}`);
      return count;
    } catch (error) {
      console.error('[STORAGE] Error counting finished sets:', error);
      return 0;
    }
  }

  async getLastSetData(matchId: string): Promise<any> {
    try {
      const db = await this.getDb();

      const setData = await db.getFirstAsync<any>(
        `SELECT set_id, set_number, p0_score, p1_score, p2_score, p3_score,
                teamV_score, teamH_score, winner_id, winner_name, set_finished
         FROM sets
         WHERE match_id = ?
         ORDER BY set_number DESC
         LIMIT 1`,
        [matchId]
      );

      console.log(`LOG  [STORAGE] 📊 GET_LAST_SET_DATA {"matchId":"${matchId}","setNumber":${setData?.set_number},"p0":${setData?.p0_score},"p1":${setData?.p1_score},"p2":${setData?.p2_score},"p3":${setData?.p3_score}}`);
      return setData;
    } catch (error) {
      console.error('[STORAGE] Error getting last set data:', error);
      return null;
    }
  }



  async recordToSet(matchId: string, setNumber: number): Promise<void> {
    try {
      const db = await this.getDb();
      const now = Date.now();

      // Step 1: Récupérer le mode du match
      const match = await db.getFirstAsync<any>(
        'SELECT mode FROM matches WHERE match_id = ?',
        [matchId]
      );

      if (!match) {
        console.error(`[STORAGE] ❌ Match ${matchId} not found for recordToSet`);
        return;
      }

      // Step 2: Récupérer le set_id
      const setRecord = await db.getFirstAsync<any>(
        'SELECT set_id FROM sets WHERE match_id = ? AND set_number = ?',
        [matchId, setNumber]
      );

      if (!setRecord) {
        console.error(`[STORAGE] ❌ Set ${setNumber} not found for match ${matchId}`);
        return;
      }

      const setId = setRecord.set_id;

      // Step 3: Récupérer tous les games du set
      const gamesInSet = await db.getAllAsync<any>(
        'SELECT p0_score, p1_score, p2_score, p3_score FROM games WHERE match_id = ? AND set_id = ?',
        [matchId, setId]
      );

      if (match.mode === 'individual') {
        // Step 4: Agréger les scores du set (individual mode)
        const scores = [0, 0, 0, 0];
        gamesInSet.forEach((g: any) => {
          scores[0] += g.p0_score || 0;
          scores[1] += g.p1_score || 0;
          scores[2] += g.p2_score || 0;
          scores[3] += g.p3_score || 0;
        });

        // Step 5: Déterminer le winner du set
        let maxScore = Math.max(...scores);
        const winnerId = scores.indexOf(maxScore);

        // Step 6: Sauvegarder le set avec ses scores finaux
        await db.runAsync(
          `UPDATE sets SET 
            p0_score = ?, p1_score = ?, p2_score = ?, p3_score = ?,
            winner_id = ?, winner_name = ?, set_finished = 1, ended_at = ?
           WHERE set_id = ?`,
          [scores[0], scores[1], scores[2], scores[3], winnerId, `Player ${winnerId}`, now, setId]
        );

        // Step 7: Incrémenter sets_won du gagnant
        await db.runAsync(
          `UPDATE matches SET p${winnerId}_sets_won = p${winnerId}_sets_won + 1 WHERE match_id = ?`,
          [matchId]
        );

        console.log(`LOG  [STORAGE] 📝 RECORD_TO_SET_INDIVIDUAL {"matchId":"${matchId}","setNumber":${setNumber},"winnerId":${winnerId},"scores":${JSON.stringify(scores)}}`);
      } else {
        // Step 4: Agréger les scores du set (teams mode)
        let teamVScore = 0;
        let teamHScore = 0;

        gamesInSet.forEach((g: any) => {
          teamVScore += (g.p0_score || 0) + (g.p2_score || 0);
          teamHScore += (g.p1_score || 0) + (g.p3_score || 0);
        });

        // Step 5: Déterminer le winner du set
        const winnerTeam = teamVScore > teamHScore ? 'V' : 'H';

        // Step 6: Sauvegarder le set avec ses scores finaux
        await db.runAsync(
          `UPDATE sets SET 
            teamV_score = ?, teamH_score = ?,
            winner_id = ?, winner_name = ?, set_finished = 1, ended_at = ?
           WHERE set_id = ?`,
          [teamVScore, teamHScore, winnerTeam === 'V' ? 0 : 1, `Team ${winnerTeam}`, now, setId]
        );

        // Step 7: Incrémenter sets_won de l'équipe gagnante
        if (winnerTeam === 'V') {
          await db.runAsync(
            'UPDATE matches SET teamV_sets_won = teamV_sets_won + 1 WHERE match_id = ?',
            [matchId]
          );
        } else {
          await db.runAsync(
            'UPDATE matches SET teamH_sets_won = teamH_sets_won + 1 WHERE match_id = ?',
            [matchId]
          );
        }

        console.log(`LOG  [STORAGE] 📝 RECORD_TO_SET_TEAMS {"matchId":"${matchId}","setNumber":${setNumber},"winner":"${winnerTeam}","teamV":${teamVScore},"teamH":${teamHScore}}`);
      }
    } catch (error) {
      console.error('[STORAGE] Error in recordToSet:', error);
    }
  }
  async recordToGame(
    payload: any,
    matchId: string,
    setId: string,
    gameIndex: number,
    config: any
  ): Promise<void> {
    try {
      // Step 1: Construire RawGame à partir du payload
      const rawGame: RawGame = {
        p0_pips_remaining: payload.rawScores.p0,
        p1_pips_remaining: payload.rawScores.p1,
        p2_pips_remaining: payload.rawScores.p2,
        p3_pips_remaining: payload.rawScores.p3,
        p0_name: payload.gameEnd?.individual?.players?.[0]?.name || 'Player 0',
        p1_name: payload.gameEnd?.individual?.players?.[1]?.name || 'Player 1',
        p2_name: payload.gameEnd?.individual?.players?.[2]?.name || 'Player 2',
        p3_name: payload.gameEnd?.individual?.players?.[3]?.name || 'Player 3',
        p0_type: 'human',
        p1_type: 'human',
        p2_type: 'human',
        p3_type: 'human',
        winner_id: payload.winner.id,
        winner_name: payload.winner.name,
        winning_type: payload.winningType,
        set_number: config.currentSet
      };

      // Step 2: Calculer earnedPoints UNE SEULE FOIS selon le mode
      let earnedPoints: any;
      if (config.mode === 'individual') {
        earnedPoints = calcIndividualScores([rawGame]);
        console.log(`LOG  [STORAGE] 🎯 EARNED_POINTS_INDIVIDUAL {"p0":${earnedPoints[0] || 0},"p1":${earnedPoints[1] || 0},"p2":${earnedPoints[2] || 0},"p3":${earnedPoints[3] || 0}}`);
      } else {
        earnedPoints = calcTeamScores([rawGame]);
        console.log(`LOG  [STORAGE] 🎯 EARNED_POINTS_TEAMS {"teamV":${earnedPoints.teamV},"teamH":${earnedPoints.teamH}}`);
      }

      // Step 3: Appeler saveGame() pour persister
      const gameId = `LOCAL_G_${setId}_${gameIndex}`;
      await this.saveGame(gameId, matchId, gameIndex, rawGame, setId, earnedPoints);

      console.log(`LOG  [STORAGE] 📝 RECORD_TO_GAME {"gameId":"${gameId}","mode":"${config.mode}","earnedPoints":${JSON.stringify(earnedPoints)}}`);
    } catch (error) {
      console.error('[STORAGE] Error in recordToGame:', error);
    }
  }

  async recordToMatch(matchId: string, allGames: RawGame[], config: any): Promise<void> {
    try {
      const db = await this.getDb();
      const now = Date.now();

      // Step 1: Déterminer le winner final du match
      const winner = getMatchWinner(allGames, config.mode, config.maxPoints);

      // Step 2: Sauvegarder le match comme terminé
      await db.runAsync(
        'UPDATE matches SET match_finished = 1, winner = ?, ended_at = ? WHERE match_id = ?',
        [JSON.stringify(winner), now, matchId]
      );

      console.log(`LOG  [STORAGE] 📝 RECORD_TO_MATCH {"matchId":"${matchId}","winner":${JSON.stringify(winner)}}`);
    } catch (error) {
      console.error('[STORAGE] Error in recordToMatch:', error);
    }
  }

  async getGameWithSetAndMatch(gameId: string): Promise<{
    game: any;
    set: any;
    match: any;
  } | null> {
    try {
      const db = await this.getDb();

      // Récupérer le game avec ses données
      const game = await db.getFirstAsync<any>(
        'SELECT * FROM games WHERE game_id = ?',
        [gameId]
      );

      if (!game) {
        console.log(`LOG  [STORAGE] 🔍 GAME_NOT_FOUND {"gameId":"${gameId}"}`);
        return null;
      }

      // Récupérer le set correspondant
      const set = await db.getFirstAsync<any>(
        'SELECT * FROM sets WHERE set_id = ?',
        [game.set_id]
      );

      // Récupérer le match correspondant
      const match = await db.getFirstAsync<any>(
        'SELECT * FROM matches WHERE match_id = ?',
        [game.match_id]
      );

      console.log(`LOG  [STORAGE] 📊 GET_GAME_WITH_SET_AND_MATCH {"gameId":"${gameId}","setNumber":${set?.set_number},"matchId":"${match?.match_id}"}`);
      return { game, set, match };
    } catch (error) {
      console.error('[STORAGE] Error getting game with set and match:', error);
      return null;
    }
  }

  async getGameData(gameId: string): Promise<any> {
    try {
      const db = await this.getDb();
      const game = await db.getFirstAsync<any>(
        'SELECT p0_score, p1_score, p2_score, p3_score, winner_name, winning_type FROM games WHERE game_id = ?',
        [gameId]
      );
      console.log(`LOG  [STORAGE] 📝 GET_GAME_DATA {"gameId":"${gameId}","winner":"${game?.winner_name}"}`);
      return game;
    } catch (error) {
      console.error('[STORAGE] Error getting game data:', error);
      return null;
    }
  }

  async getSetByGameId(gameId: string): Promise<any> {
    try {
      const db = await this.getDb();
      
      const game = await db.getFirstAsync<any>(
        'SELECT set_id FROM games WHERE game_id = ?',
        [gameId]
      );

      if (!game) return null;

      const set = await db.getFirstAsync<any>(
        'SELECT set_id, set_number, p0_score, p1_score, p2_score, p3_score, teamV_score, teamH_score, winner_id, winner_name, set_finished FROM sets WHERE set_id = ?',
        [game.set_id]
      );

      console.log(`LOG  [STORAGE] 📊 GET_SET_BY_GAME_ID {"gameId":"${gameId}","setNumber":${set?.set_number}}`);
      return set;
    } catch (error) {
      console.error('[STORAGE] Error getting set by game id:', error);
      return null;
    }
  }

  async getMatchByGameId(gameId: string): Promise<any> {
    try {
      const db = await this.getDb();
      
      const game = await db.getFirstAsync<any>(
        'SELECT match_id FROM games WHERE game_id = ?',
        [gameId]
      );

      if (!game) return null;

      const match = await db.getFirstAsync<any>(
        'SELECT match_id, mode, max_points, num_sets, current_set_number, match_finished, winner, p0_sets_won, p1_sets_won, p2_sets_won, p3_sets_won, teamV_sets_won, teamH_sets_won FROM matches WHERE match_id = ?',
        [game.match_id]
      );

      console.log(`LOG  [STORAGE] 🏆 GET_MATCH_BY_GAME_ID {"gameId":"${gameId}","matchId":"${match?.match_id}","finished":${match?.match_finished}}`);
      return match;
    } catch (error) {
      console.error('[STORAGE] Error getting match by game id:', error);
      return null;
    }
  }
}
