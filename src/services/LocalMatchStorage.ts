import * as SQLite from 'expo-sqlite';
import type { GameResult, MatchState, ScoringMode } from '../controllers/MatchManager';
import type { IMatchStorage } from './IMatchStorage';
import type { MatchConfig } from '../types/MatchConfig';
import { DEFAULT_MATCH_CONFIG } from '../types/MatchConfig';

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

    // Créer les tables (même structure que le serveur React)
    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS matches (
          match_id TEXT PRIMARY KEY,
          mode TEXT NOT NULL,
          maxPoints INTEGER NOT NULL,
          numSets INTEGER NOT NULL DEFAULT 1,
          started_at INTEGER NOT NULL,
          ended_at INTEGER,
          matchFinished INTEGER NOT NULL DEFAULT 0,
          winner TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log(`LOG  [STORAGE] ✅ Matches table created/verified`);
    } catch (error) {
      console.error('[STORAGE] Error creating matches table:', error);
    }

    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS games (
          game_id TEXT PRIMARY KEY,
          match_id TEXT NOT NULL,
          gameNumber INTEGER NOT NULL,
          winner_id INTEGER NOT NULL,
          winner_name TEXT NOT NULL,
          winning_type TEXT NOT NULL,
          individual TEXT,
          teams TEXT,
          started_at INTEGER NOT NULL,
          ended_at INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(match_id) REFERENCES matches(match_id)
        );
      `);
      console.log(`LOG  [STORAGE] ✅ Games table created/verified`);
    } catch (error) {
      console.error('[STORAGE] Error creating games table:', error);
    }

    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS turns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          game_id TEXT NOT NULL,
          turn_number INTEGER NOT NULL,
          player_id INTEGER NOT NULL,
          player_name TEXT,
          action TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(game_id) REFERENCES games(game_id)
        );
      `);
      console.log(`LOG  [STORAGE] ✅ Turns table created/verified`);
    } catch (error) {
      console.error('[STORAGE] Error creating turns table:', error);
    }

    // Créer les index
    try {
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_games_match ON games(match_id);
        CREATE INDEX IF NOT EXISTS idx_turns_game ON turns(game_id);
      `);
    } catch {
      // Index peut déjà exister
    }

    return db;
  }

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!LocalMatchStorage.sharedDb) {
      throw new Error('Database not initialized. Call LocalMatchStorage.initializeDatabase() first.');
    }
    return LocalMatchStorage.sharedDb;
  }

  private defaultMatchState(): MatchState {
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
    };
  }

  async saveGame(game: GameResult): Promise<void> {
    try {
      const db = await this.getDb();

      // Insérer le game
      await db.runAsync(
        `INSERT INTO games (gameNumber, winnerId, winnerName, winningType, individual, teams, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          game.gameNumber,
          game.winnerId,
          game.winnerName,
          game.winningType,
          game.individual ? JSON.stringify(game.individual) : null,
          game.teams ? JSON.stringify(game.teams) : null,
          game.timestamp
        ]
      );

      // Mettre à jour l'état du match
      const matchState = await this.getMatchState();
      this.updateMatchState(matchState, game);

      // Sauvegarder l'état
      await db.runAsync(
        `DELETE FROM match_state WHERE id = 1`
      );

      await db.runAsync(
        `INSERT INTO match_state (id, mode, maxPoints, scoreIndividual, scoreTeams, matchFinished, winner, currentGameNumber)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
        [
          matchState.mode,
          matchState.maxPoints,
          JSON.stringify(matchState.scoreIndividual),
          JSON.stringify(matchState.scoreTeams),
          matchState.matchFinished ? 1 : 0,
          matchState.winner ? JSON.stringify(matchState.winner) : null,
          matchState.currentGameNumber
        ]
      );

      console.log(`LOG  [STORAGE] 💾 GAME_SAVED {"gameNumber":${game.gameNumber},"winner":"${game.winnerName}"}`);
    } catch (error) {
      console.error('[STORAGE] Error saving game:', error);
    }
  }

  async getMatchState(): Promise<MatchState> {
    try {
      const db = await this.getDb();

      const result = await db.getFirstAsync<any>(
        'SELECT * FROM match_state WHERE id = 1'
      );

      if (!result) {
        return this.defaultMatchState();
      }

      return {
        mode: result.mode,
        maxPoints: result.maxPoints,
        numSets: result.numSets || this.matchConfig.numSets,
        games: await this.getAllGames(),
        scoreIndividual: JSON.parse(result.scoreIndividual),
        scoreTeams: JSON.parse(result.scoreTeams),
        matchFinished: result.matchFinished === 1,
        winner: result.winner ? JSON.parse(result.winner) : null,
        currentGameNumber: result.currentGameNumber,
      };
    } catch (error) {
      console.error('[STORAGE] Error loading match state:', error);
      return this.defaultMatchState();
    }
  }

  async getAllGames(): Promise<GameResult[]> {
    try {
      const db = await this.getDb();

      const games = await db.getAllAsync<any>(
        'SELECT * FROM games ORDER BY gameNumber ASC'
      );

      return games.map((g: any) => ({
        gameNumber: g.gameNumber,
        winnerId: g.winnerId,
        winnerName: g.winnerName,
        winningType: g.winningType,
        individual: g.individual ? JSON.parse(g.individual) : undefined,
        teams: g.teams ? JSON.parse(g.teams) : undefined,
        timestamp: g.timestamp,
      }));
    } catch (error) {
      console.error('[STORAGE] Error loading games:', error);
      return [];
    }
  }

  async reset(mode: ScoringMode): Promise<void> {
    try {
      const db = await this.getDb();

      // Supprimer tous les games
      await db.runAsync('DELETE FROM games');

      // Réinitialiser match_state (utilise la config du constructeur)
      const defaultState = this.defaultMatchState();

      await db.runAsync('DELETE FROM match_state WHERE id = 1');
      await db.runAsync(
        `INSERT INTO match_state (id, mode, maxPoints, numSets, scoreIndividual, scoreTeams, matchFinished, winner, currentGameNumber)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          defaultState.mode,
          defaultState.maxPoints,
          defaultState.numSets,
          JSON.stringify(defaultState.scoreIndividual),
          JSON.stringify(defaultState.scoreTeams),
          0,
          null,
          0
        ]
      );

      console.log(`LOG  [STORAGE] 🔄 MATCH_RESET {"mode":"${defaultState.mode}","maxPoints":${defaultState.maxPoints},"numSets":${defaultState.numSets}}`);
    } catch (error) {
      console.error('[STORAGE] Error resetting match:', error);
    }
  }

  private updateMatchState(matchState: MatchState, game: GameResult): void {
    // Mettre à jour le numéro du game courant
    matchState.currentGameNumber = game.gameNumber;

    // Mettre à jour les scores selon le mode
    if (matchState.mode === 'individual' && game.individual) {
      game.individual.players.forEach(p => {
        matchState.scoreIndividual[p.id] = (matchState.scoreIndividual[p.id] || 0) + p.earned;
      });

      // Vérifier si le match est fini
      const winners = Object.entries(matchState.scoreIndividual)
        .filter(([_, score]) => score >= matchState.maxPoints)
        .sort(([_, a], [__, b]) => b - a);

      if (winners.length > 0) {
        const [winnerId, score] = winners[0];
        matchState.matchFinished = true;
        matchState.winner = {
          id: parseInt(winnerId),
          name: game.individual.players.find(p => p.id === parseInt(winnerId))?.name || `Player ${winnerId}`,
        };
      }
    } else if (matchState.mode === 'teams' && game.teams) {
      matchState.scoreTeams.teamV += game.teams.teamV.totalScore;
      matchState.scoreTeams.teamH += game.teams.teamH.totalScore;

      // Vérifier si le match est fini
      if (matchState.scoreTeams.teamV >= matchState.maxPoints) {
        matchState.matchFinished = true;
        matchState.winner = { team: 'V', name: 'Team V' };
      } else if (matchState.scoreTeams.teamH >= matchState.maxPoints) {
        matchState.matchFinished = true;
        matchState.winner = { team: 'H', name: 'Team H' };
      }
    }
  }
}
