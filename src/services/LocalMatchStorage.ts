import * as SQLite from 'expo-sqlite';
import type { GameResult, MatchState, ScoringMode } from '../controllers/MatchManager';
import type { IMatchStorage } from './IMatchStorage';
import type { MatchConfig } from '../types/MatchConfig';
import { DEFAULT_MATCH_CONFIG } from '../types/MatchConfig';

export class LocalMatchStorage implements IMatchStorage {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbPromise: Promise<SQLite.SQLiteDatabase>;
  private matchConfig: MatchConfig;

  constructor(matchConfig: MatchConfig = DEFAULT_MATCH_CONFIG) {
    this.matchConfig = matchConfig;
    this.dbPromise = this.initDb();
  }

  private async initDb(): Promise<SQLite.SQLiteDatabase> {
    if (this.db) return this.db;

    const db = await SQLite.openDatabaseAsync('domino_match.db');

    // Créer les tables si elles n'existent pas
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gameNumber INTEGER NOT NULL UNIQUE,
        winnerId INTEGER NOT NULL,
        winnerName TEXT NOT NULL,
        winningType TEXT NOT NULL,
        individual TEXT,
        teams TEXT,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS match_state (
        id INTEGER PRIMARY KEY,
        mode TEXT NOT NULL,
        maxPoints INTEGER NOT NULL,
        numSets INTEGER NOT NULL DEFAULT 1,
        scoreIndividual TEXT NOT NULL,
        scoreTeams TEXT NOT NULL,
        matchFinished INTEGER NOT NULL,
        winner TEXT,
        currentGameNumber INTEGER NOT NULL
      );
    `);

    // Migration: ajouter colonne numSets si elle n'existe pas
    try {
      await db.execAsync(`ALTER TABLE match_state ADD COLUMN numSets INTEGER NOT NULL DEFAULT 1;`);
    } catch {
      // Colonne existe déjà, on ignore
    }

    this.db = db;
    return db;
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
      const db = await this.dbPromise;

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
      const db = await this.dbPromise;

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
      const db = await this.dbPromise;

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
      const db = await this.dbPromise;

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
