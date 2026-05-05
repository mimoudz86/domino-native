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

    // Cleanup des matches incomplets au démarrage
    await LocalMatchStorage.cleanupIncompleteMatches();
  }

  // Cleanup des matches incomplets (avec un set actif = pas terminé proprement)
  private static async cleanupIncompleteMatches(): Promise<void> {
    try {
      if (!LocalMatchStorage.sharedDb) return;

      const db = LocalMatchStorage.sharedDb;

      // Trouver tous les matches non terminés qui ont un set actif
      const incompleteMatches = await db.getAllAsync<any>(
        `SELECT DISTINCT m.match_id FROM matches m
         INNER JOIN sets s ON m.match_id = s.match_id
         WHERE m.match_finished = 0 AND s.is_active = 1`
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

    // Table matches — configuration du match + comptage des sets gagnés
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
          p0_total_points INTEGER NOT NULL DEFAULT 0,
          p1_total_points INTEGER NOT NULL DEFAULT 0,
          p2_total_points INTEGER NOT NULL DEFAULT 0,
          p3_total_points INTEGER NOT NULL DEFAULT 0,
          teamV_total_points INTEGER NOT NULL DEFAULT 0,
          teamH_total_points INTEGER NOT NULL DEFAULT 0,
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
          is_active INTEGER NOT NULL DEFAULT 0,
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

      // Créer le match
      await db.runAsync(
        `INSERT INTO matches (match_id, mode, max_points, num_sets, started_at, match_finished)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [matchId, config.mode, config.maxPoints, config.numSets, now, 0]
      );

      // Créer TOUS les sets d'avance
      for (let i = 1; i <= config.numSets; i++) {
        const setId = `LOCAL_S_${matchId}_${i}`;
        const isActive = i === 1 ? 1 : 0;  // Seul le premier set est actif au départ

        await db.runAsync(
          `INSERT INTO sets (set_id, match_id, set_number, started_at, set_finished, is_active)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [setId, matchId, i, now, 0, isActive]
        );

        console.log(`LOG  [STORAGE] 🆕 SET_CREATED {"set_id":"${setId}","set_number":${i},"is_active":${isActive}}`);
      }

      console.log(`LOG  [STORAGE] 🆕 MATCH_CREATED {"match_id":"${matchId}","mode":"${config.mode}","maxPoints":${config.maxPoints},"numSets":${config.numSets}}`);
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
        console.log(`LOG  [STORAGE] 🔍 GET_ACTIVE_MATCH_RESULT {"matchFound":false,"result":null}`);
        return null;
      }

      // Récupérer le set ACTIF (is_active=1)
      const activeSet = await db.getFirstAsync<any>(
        'SELECT set_number FROM sets WHERE match_id = ? AND is_active = 1',
        [match.match_id]
      );

      const currentSet = activeSet?.set_number || 1;

      console.log(`LOG  [STORAGE] 🔍 GET_ACTIVE_MATCH_RESULT {"matchId":"${match.match_id}","currentSet":${currentSet},"numSets":${match.num_sets},"mode":"${match.mode}","maxPoints":${match.max_points}}`);

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

  // Récupérer les totaux de points pour un match
  async getMatchTotals(matchId: string): Promise<{
    p0_total: number;
    p1_total: number;
    p2_total: number;
    p3_total: number;
    teamV_total: number;
    teamH_total: number;
  } | null> {
    try {
      const db = await this.getDb();
      const match = await db.getFirstAsync<any>(
        'SELECT p0_total_points, p1_total_points, p2_total_points, p3_total_points, teamV_total_points, teamH_total_points FROM matches WHERE match_id = ?',
        [matchId]
      );

      if (!match) return null;

      return {
        p0_total: match.p0_total_points || 0,
        p1_total: match.p1_total_points || 0,
        p2_total: match.p2_total_points || 0,
        p3_total: match.p3_total_points || 0,
        teamV_total: match.teamV_total_points || 0,
        teamH_total: match.teamH_total_points || 0
      };
    } catch (error) {
      console.error('[STORAGE] Error getting match totals:', error);
      return null;
    }
  }

  // Mettre à jour les totaux de points dans la table matches
  async updateMatchScoreTotals(matchId: string, mode: ScoringMode): Promise<void> {
    try {
      const db = await this.getDb();
      const games = await this.getGamesForMatch(matchId);

      if (mode === 'individual') {
        const scores = calcIndividualScores(games);
        await db.runAsync(
          `UPDATE matches SET p0_total_points = ?, p1_total_points = ?, p2_total_points = ?, p3_total_points = ? WHERE match_id = ?`,
          [
            scores[0] || 0,
            scores[1] || 0,
            scores[2] || 0,
            scores[3] || 0,
            matchId
          ]
        );
      } else {
        const { teamV, teamH } = calcTeamScores(games);
        await db.runAsync(
          `UPDATE matches SET teamV_total_points = ?, teamH_total_points = ? WHERE match_id = ?`,
          [teamV, teamH, matchId]
        );
      }
    } catch (error) {
      console.error('[STORAGE] Error updating match score totals:', error);
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
      const set = await db.getFirstAsync<any>(
        'SELECT set_id FROM sets WHERE match_id = ? AND is_active = 1',
        [matchId]
      );
      return set?.set_id || null;
    } catch (error) {
      console.error('[STORAGE] Error getting active set:', error);
      return null;
    }
  }

  async nextSet(matchId: string): Promise<void> {
    try {
      const db = await this.getDb();
      const now = Date.now();

      // Récupérer le set actif (actuellement ACTIVE)
      const activeSet = await db.getFirstAsync<any>(
        'SELECT set_number FROM sets WHERE match_id = ? AND is_active = 1',
        [matchId]
      );

      if (!activeSet) return;

      const currentSetNumber = activeSet.set_number;
      const nextSetNumber = currentSetNumber + 1;

      // Désactiver le set courant et le marquer comme fini
      await db.runAsync(
        'UPDATE sets SET set_finished = 1, is_active = 0, ended_at = ? WHERE match_id = ? AND set_number = ?',
        [now, matchId, currentSetNumber]
      );

      // Activer le set suivant (qui doit déjà exister)
      const nextSetExists = await db.getFirstAsync<any>(
        'SELECT set_id FROM sets WHERE match_id = ? AND set_number = ?',
        [matchId, nextSetNumber]
      );

      if (nextSetExists) {
        await db.runAsync(
          'UPDATE sets SET is_active = 1, started_at = ? WHERE match_id = ? AND set_number = ?',
          [now, matchId, nextSetNumber]
        );
        console.log(`LOG  [STORAGE] 📈 SET_TRANSITION {"matchId":"${matchId}","previousSet":${currentSetNumber},"nextSet":${nextSetNumber}}`);
      } else {
        console.error(`[STORAGE] ❌ Next set ${nextSetNumber} does not exist for match ${matchId}`);
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
  async finishSet(setNumber: number, matchId: string): Promise<void> {
    try {
      const db = await this.getDb();
      const match = await db.getFirstAsync<any>('SELECT mode FROM matches WHERE match_id = ?', [matchId]);
      const set = await db.getFirstAsync<any>('SELECT set_id FROM sets WHERE match_id = ? AND set_number = ?', [matchId, setNumber]);
      const gamesInSet = await db.getAllAsync<any>(
        'SELECT * FROM games WHERE set_id = ?',
        [set?.set_id]
      );

      const mode = match?.mode || 'individual';
      const scores = mode === 'individual' ? calcIndividualScores(gamesInSet) : calcTeamScores(gamesInSet);

      await this.updateSetScores(matchId, setNumber, mode, scores);
      await this.incrementSetWins(matchId, mode, scores);

      console.log(`LOG  [STORAGE] ✅ FINISH_SET {"setNumber":${setNumber},"matchId":"${matchId},"mode":"${mode}","scores":${JSON.stringify(scores)}}`);
    } catch (error) {
      console.error('[STORAGE] Error finishing set:', error);
    }
  }

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

  async getMatchStateById(matchId: string): Promise<MatchState | null> {
    try {
      const db = await this.getDb();
      const match = await db.getFirstAsync<any>('SELECT * FROM matches WHERE match_id = ?', [matchId]);
      if (!match) return null;

      const games = await this.getGamesForMatch(matchId);
      const config = { mode: match.mode as ScoringMode, maxPoints: match.max_points, numSets: match.num_sets };
      const scores = config.mode === 'individual' ? calcIndividualScores(games) : { ...calcTeamScores(games) };
      const numSetsFinished = await this.countFinishedSets(matchId);
      const finished = isMatchFinished(numSetsFinished, config.numSets);
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
