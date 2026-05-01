/**
 * MatchManager - Gère l'état complet du match (plusieurs parties)
 * Réutilisable React Native + React Web
 */

import { Score, Match, GameEndState, IndividualGameEndState } from './Score';

export type ScoringMode = 'individual' | 'teams';

export type GameResult = {
  gameNumber: number;
  winnerId: number;
  winnerName: string;
  winningType: 'EMPTY_HAND' | 'BLOCKED_GAME';
  individual?: IndividualGameEndState;
  teams?: GameEndState;
  timestamp: number;
};

export type MatchState = {
  mode: ScoringMode;
  maxPoints: number;
  numSets: 1 | 2 | 3;
  games: GameResult[];
  scoreIndividual: Record<number, number>; // { 0: 13, 1: 0, 2: 0, 3: 0 }
  scoreTeams: { teamV: number; teamH: number };
  matchFinished: boolean;
  winner: null | { id?: number; team?: 'V' | 'H'; name: string };
  currentGameNumber: number;
};

export class MatchManager {
  private mode: ScoringMode;
  private maxPoints: number;
  private games: GameResult[] = [];
  private scoreIndividual: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  private scoreTeams: { teamV: number; teamH: number } = { teamV: 0, teamH: 0 };
  private matchFinished: boolean = false;
  private winner: null | { id?: number; team?: 'V' | 'H'; name: string } = null;
  private currentGameNumber: number = 0;

  constructor(mode: ScoringMode = 'individual', maxPoints: number = 50) {
    this.mode = mode;
    this.maxPoints = maxPoints;
  }

  /**
   * Ajouter un résultat de partie
   */
  addGameResult(
    winnerId: number,
    winnerName: string,
    players: { id: number; name: string; score: number }[],
    winningType: 'EMPTY_HAND' | 'BLOCKED_GAME' = 'EMPTY_HAND'
  ): void {
    if (this.matchFinished) {
      console.warn('❌ Match is already finished!');
      return;
    }

    this.currentGameNumber++;

    const gameResult: GameResult = {
      gameNumber: this.currentGameNumber,
      winnerId,
      winnerName,
      winningType,
      timestamp: Date.now()
    };

    // Calculer les scores selon le mode
    if (this.mode === 'individual') {
      gameResult.individual = Score.buildIndividualGameEndState(players, winnerId, winningType);
      this.updateIndividualScores(gameResult.individual);
    } else {
      gameResult.teams = Score.buildGameEndState(players, winnerId, undefined, undefined, winningType);
      this.updateTeamScores(gameResult.teams);
    }

    this.games.push(gameResult);
    this.checkMatchEnd();
  }

  /**
   * Mettre à jour les scores individuels
   */
  private updateIndividualScores(gameEnd: IndividualGameEndState): void {
    gameEnd.players.forEach(p => {
      this.scoreIndividual[p.id] += p.earned;
    });
  }

  /**
   * Mettre à jour les scores d'équipes
   */
  private updateTeamScores(gameEnd: GameEndState): void {
    this.scoreTeams.teamV += gameEnd.teamV.totalScore;
    this.scoreTeams.teamH += gameEnd.teamH.totalScore;
  }

  /**
   * Vérifier si le match est terminé (quelqu'un ≥ maxPoints)
   */
  private checkMatchEnd(): void {
    if (this.mode === 'individual') {
      // Mode individuel: premier joueur ≥ maxPoints gagne
      const winners = Object.entries(this.scoreIndividual)
        .filter(([_, score]) => score >= this.maxPoints)
        .sort(([_, a], [__, b]) => b - a);

      if (winners.length > 0) {
        const [winnerId, score] = winners[0];
        const playerName = this.games.length > 0
          ? this.games[this.games.length - 1].individual?.players.find(p => p.id === parseInt(winnerId))?.name
          : '';

        this.matchFinished = true;
        this.winner = {
          id: parseInt(winnerId),
          name: playerName || `Player ${winnerId}`
        };
      }
    } else {
      // Mode équipes: première équipe ≥ maxPoints gagne
      let winningTeam: 'V' | 'H' | null = null;

      if (this.scoreTeams.teamV >= this.maxPoints) {
        winningTeam = 'V';
      } else if (this.scoreTeams.teamH >= this.maxPoints) {
        winningTeam = 'H';
      }

      if (winningTeam) {
        this.matchFinished = true;
        this.winner = {
          team: winningTeam,
          name: winningTeam === 'V' ? 'Team V (Alice & Charlie)' : 'Team H (Bob & David)'
        };
      }
    }
  }

  /**
   * Obtenir l'état actuel du match
   */
  getState(): MatchState {
    return {
      mode: this.mode,
      maxPoints: this.maxPoints,
      games: this.games,
      scoreIndividual: { ...this.scoreIndividual },
      scoreTeams: { ...this.scoreTeams },
      matchFinished: this.matchFinished,
      winner: this.winner,
      currentGameNumber: this.currentGameNumber
    };
  }

  /**
   * Réinitialiser le match
   */
  reset(): void {
    this.games = [];
    this.scoreIndividual = { 0: 0, 1: 0, 2: 0, 3: 0 };
    this.scoreTeams = { teamV: 0, teamH: 0 };
    this.matchFinished = false;
    this.winner = null;
    this.currentGameNumber = 0;
  }

  /**
   * Obtenir le résumé d'une partie
   */
  getGameSummary(gameNumber: number): GameResult | null {
    return this.games.find(g => g.gameNumber === gameNumber) || null;
  }

  /**
   * Obtenir tous les résultats
   */
  getAllGames(): GameResult[] {
    return [...this.games];
  }

  /**
   * PUBLIC GETTER - Accès aux games pour les tests
   */
  getGames(): GameResult[] {
    return [...this.games];
  }
}
