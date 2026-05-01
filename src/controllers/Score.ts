/**
 * Score Manager - Logique de scoring (réutilisable React Native + React Web)
 * Basé sur le modèle React avec additions pour scoring individuel
 */

import type { Domino, PlayerWithHand } from '../shared/models/GameTurnState';

type Game = [number, number]; // [teamV_points, teamH_points]
type Set = Game[]; // Liste de jeux dans un set

export type Match = {
  sets: Set[];
  team1SetsWon: number; // Team V sets won
  team2SetsWon: number; // Team H sets won
  currentSetIndex: number;
  maxGamePoints: number; // Points needed to win a set (default 50)
  maxSetCount: number; // Number of sets to win match (default best of 3)
  matchFinished: boolean;
};

export type GameEndState = {
  winner: {
    id: number;
    name: string;
  };
  teamV: {
    teamName: string;
    players: { id: number; name: string; score: number }[];
    totalScore: number;
  };
  teamH: {
    teamName: string;
    players: { id: number; name: string; score: number }[];
    totalScore: number;
  };
  winningTeam: 'V' | 'H';
  winningType: 'EMPTY_HAND' | 'BLOCKED_GAME';
  pointsEarned: number;
  setScore: {
    teamVPoints: number;
    teamHPoints: number;
  };
  matchProgress: {
    team1SetsWon: number;
    team2SetsWon: number;
    currentSetIndex: number;
    matchFinished: boolean;
  };
};

export type IndividualGameEndState = {
  winner: {
    id: number;
    name: string;
  };
  players: { id: number; name: string; score: number; earned: number; isWinner: boolean }[];
  winningType: 'EMPTY_HAND' | 'BLOCKED_GAME';
  pointsEarned: number;
};

const MAX_GAME_POINTS: number = 50;
const MAX_SET_COUNT: number = 3;

export class Score {
  /**
   * Initialize a new Match
   */
  static initializeMatch(
    maxGamePoints: number = MAX_GAME_POINTS,
    maxSetCount: number = MAX_SET_COUNT
  ): Match {
    return {
      sets: [[]],
      team1SetsWon: 0,
      team2SetsWon: 0,
      currentSetIndex: 0,
      maxGamePoints,
      maxSetCount,
      matchFinished: false,
    };
  }

  /**
   * Calculate total points for each team in a set
   */
  static calculateTotalPoints(set: Set): [number, number] {
    let totalTeamV = 0;
    let totalTeamH = 0;

    for (const [v, h] of set) {
      totalTeamV += v;
      totalTeamH += h;
    }

    return [totalTeamV, totalTeamH];
  }

  /**
   * Add a game result to the match
   */
  static addGame(match: Match, game: Game): Match {
    if (match.matchFinished) {
      return match;
    }

    const [gameV, gameH] = game;

    // Add game to current set
    match.sets[match.currentSetIndex].push(game);

    // Calculate totals for current set
    const currentSet = match.sets[match.currentSetIndex];
    const [totalTeamV, totalTeamH] = this.calculateTotalPoints(currentSet);

    // Check if set is won
    if (totalTeamV >= match.maxGamePoints || totalTeamH >= match.maxGamePoints) {
      const setWinner = totalTeamV > totalTeamH ? 'V' : 'H';

      // Determine set winner
      if (totalTeamV > totalTeamH) {
        match.team1SetsWon++;
      } else {
        match.team2SetsWon++;
      }

      // Check if match is won
      const setsNeededToWin = Math.ceil(match.maxSetCount / 2);
      if (match.team1SetsWon >= setsNeededToWin || match.team2SetsWon >= setsNeededToWin) {
        match.matchFinished = true;
      } else {
        // Move to next set
        match.currentSetIndex++;
        match.sets.push([]);
      }
    }

    return match;
  }

  /**
   * Calculate score for a single player (sum of pips in hand)
   */
  static calculatePlayerScore(player: any): number {
    return player.hand.reduce((sum: number, d: Domino) => sum + d.left + d.right, 0);
  }

  /**
   * Calculate scores for all players
   */
  static calculateAllScores(players: any[]): { id: number; name: string; score: number }[] {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      score: this.calculatePlayerScore(p)
    }));
  }

  /**
   * 🎯 SCORING ÉQUIPES - Gagnant récolte points équipe adverse
   */
  static calculateTeamScores(
    players: { id: number; name: string; score: number }[],
    winnerId: number
  ): {
    teamV: number;
    teamH: number;
    winningTeam: 'V' | 'H';
    pointsEarned: number;
  } {
    // Team V: Players 0 and 2
    const teamVTotal = players[0].score + players[2].score;

    // Team H: Players 1 and 3
    const teamHTotal = players[1].score + players[3].score;

    // Determine winner's team
    const isWinnerInTeamV = winnerId === 0 || winnerId === 2;
    const winningTeam = isWinnerInTeamV ? 'V' : 'H';

    // Points earned = sum of losing team's pips
    const pointsEarned = isWinnerInTeamV ? teamHTotal : teamVTotal;

    return {
      teamV: isWinnerInTeamV ? pointsEarned : 0,
      teamH: isWinnerInTeamV ? 0 : pointsEarned,
      winningTeam,
      pointsEarned
    };
  }

  /**
   * 🎯 SCORING INDIVIDUEL - Gagnant récolte points autres
   */
  static calculateIndividualScores(
    players: { id: number; name: string; score: number }[],
    winnerId: number
  ): { id: number; name: string; score: number; earned: number; isWinner: boolean }[] {
    // Gagnant récolte points des autres
    const otherPlayersTotal = players
      .filter(p => p.id !== winnerId)
      .reduce((sum, p) => sum + p.score, 0);

    return players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score, // Score initial (dominos restants)
      earned: p.id === winnerId ? otherPlayersTotal : 0, // Points récolté
      isWinner: p.id === winnerId
    }));
  }

  /**
   * 🎯 Build GameEndState for TEAM scoring
   */
  static buildGameEndState(
    players: { id: number; name: string; score: number }[],
    winnerId: number,
    matchManager?: any,
    gameScore?: [number, number],
    winningType: 'EMPTY_HAND' | 'BLOCKED_GAME' = 'EMPTY_HAND'
  ): GameEndState {
    const isWinnerInTeamV = winnerId === 0 || winnerId === 2;
    const winningTeam = isWinnerInTeamV ? 'V' : 'H';

    // Use provided gameScore if available, otherwise calculate from pips
    const teamVScore = gameScore ? gameScore[0] : (players[0].score + players[2].score);
    const teamHScore = gameScore ? gameScore[1] : (players[1].score + players[3].score);

    // Calculate set scores if matchManager exists
    let team1SetScore = 0;
    let team2SetScore = 0;
    if (matchManager?.sets && matchManager.currentSetIndex !== undefined) {
      const currentSet = matchManager.sets[matchManager.currentSetIndex];
      if (currentSet) {
        [team1SetScore, team2SetScore] = this.calculateTotalPoints(currentSet);
      }
    }

    const pointsEarned = isWinnerInTeamV ? teamHScore : teamVScore;

    return {
      winner: {
        id: winnerId,
        name: players[winnerId].name
      },
      teamV: {
        teamName: 'Team V',
        players: [
          { id: players[0].id, name: players[0].name, score: players[0].score },
          { id: players[2].id, name: players[2].name, score: players[2].score }
        ],
        totalScore: isWinnerInTeamV ? pointsEarned : 0
      },
      teamH: {
        teamName: 'Team H',
        players: [
          { id: players[1].id, name: players[1].name, score: players[1].score },
          { id: players[3].id, name: players[3].name, score: players[3].score }
        ],
        totalScore: !isWinnerInTeamV ? pointsEarned : 0
      },
      winningTeam,
      winningType,
      pointsEarned,
      setScore: {
        teamVPoints: team1SetScore,
        teamHPoints: team2SetScore
      },
      matchProgress: {
        team1SetsWon: matchManager?.team1SetsWon ?? 0,
        team2SetsWon: matchManager?.team2SetsWon ?? 0,
        currentSetIndex: matchManager?.currentSetIndex ?? 0,
        matchFinished: matchManager?.matchFinished ?? false
      }
    };
  }

  /**
   * 🎯 Build GameEndState for INDIVIDUAL scoring
   */
  static buildIndividualGameEndState(
    players: { id: number; name: string; score: number }[],
    winnerId: number,
    winningType: 'EMPTY_HAND' | 'BLOCKED_GAME' = 'EMPTY_HAND'
  ): IndividualGameEndState {
    const individualScores = this.calculateIndividualScores(players, winnerId);
    const pointsEarned = individualScores.find(s => s.isWinner)?.earned ?? 0;

    return {
      winner: {
        id: winnerId,
        name: players[winnerId].name
      },
      players: individualScores,
      winningType,
      pointsEarned
    };
  }

  /**
   * Check if set or match has ended
   */
  static checkSetAndMatchStatus(matchManager: any): { setEnded: boolean; matchEnded: boolean } {
    if (!matchManager?.sets?.[matchManager.currentSetIndex]) {
      return { setEnded: false, matchEnded: false };
    }

    const currentSet = matchManager.sets[matchManager.currentSetIndex];
    const [totalTeamV, totalTeamH] = this.calculateTotalPoints(currentSet);

    // Check if SET ended
    const setEnded = totalTeamV >= matchManager.maxGamePoints || totalTeamH >= matchManager.maxGamePoints;

    if (!setEnded) {
      return { setEnded: false, matchEnded: false };
    }

    // Check if MATCH ended
    const setsNeededToWin = Math.ceil(matchManager.maxSetCount / 2);
    const matchEnded = matchManager.team1SetsWon >= setsNeededToWin || matchManager.team2SetsWon >= setsNeededToWin;

    return { setEnded: true, matchEnded };
  }
}
