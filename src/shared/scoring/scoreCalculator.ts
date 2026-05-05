// Fonctions pures de calcul de scores — aucune dépendance framework
// Réutilisables dans React Native ET React Server

export type RawGame = {
  p0_score: number;
  p1_score: number;
  p2_score: number;
  p3_score: number;
  p0_name: string;
  p1_name: string;
  p2_name: string;
  p3_name: string;
  p0_type: 'human' | 'AI';
  p1_type: 'human' | 'AI';
  p2_type: 'human' | 'AI';
  p3_type: 'human' | 'AI';
  winner_id: number;
  winner_name: string;
  winning_type: 'EMPTY_HAND' | 'BLOCKED_GAME';
  set_number?: number;
};

// Détecte un draw en mode INDIVIDUAL: game bloqué + 2+ joueurs avec les mêmes pips
export function isDrawGameIndividual(game: RawGame): boolean {
  if (game.winning_type !== 'BLOCKED_GAME') return false;

  const pips = [game.p0_score, game.p1_score, game.p2_score, game.p3_score];
  const maxPips = Math.max(...pips);
  const countWithMaxPips = pips.filter(p => p === maxPips).length;

  return countWithMaxPips >= 2;
}

// Détecte un draw en mode TEAM: game bloqué + un player TeamV a mêmes pips qu'un player TeamH
export function isDrawGameTeam(game: RawGame): boolean {
  if (game.winning_type !== 'BLOCKED_GAME') return false;

  const teamVPips = [game.p0_score, game.p2_score];
  const teamHPips = [game.p1_score, game.p3_score];

  for (const vpip of teamVPips) {
    for (const hpip of teamHPips) {
      if (vpip === hpip) return true;
    }
  }

  return false;
}

// Mode INDIVIDUAL : le gagnant récolte les pips des autres joueurs (sauf en cas de draw)
export function calcIndividualScores(games: RawGame[]): Record<number, number> {
  return games.reduce((acc, g) => {
    if (isDrawGameIndividual(g)) {
      return acc; // Draw game: pas de points distribués
    }

    const total = g.p0_score + g.p1_score + g.p2_score + g.p3_score;
    const winnerPips = [g.p0_score, g.p1_score, g.p2_score, g.p3_score][g.winner_id];
    acc[g.winner_id] = (acc[g.winner_id] || 0) + (total - winnerPips);
    return acc;
  }, {} as Record<number, number>);
}

// Mode TEAM : Team V = p0 + p2, Team H = p1 + p3
// Les non-gagnants marquent leurs pips (sauf en cas de draw)
export function calcTeamScores(games: RawGame[]): { teamV: number; teamH: number } {
  return games.reduce((acc, g) => {
    if (isDrawGameTeam(g)) {
      return acc; // Draw game: pas de points distribués
    }

    const isWinnerV = g.winner_id === 0 || g.winner_id === 2;
    // Si gagnant est de TeamV, TeamH marque les pips des membres de TeamV
    if (isWinnerV) {
      acc.teamH += g.p1_score + g.p3_score;
    } else {
      // Si gagnant est de TeamH, TeamV marque les pips des membres de TeamH
      acc.teamV += g.p0_score + g.p2_score;
    }
    return acc;
  }, { teamV: 0, teamH: 0 });
}

export type MatchWinner =
  | { id: number; name: string; type: 'individual' }
  | { team: 'V' | 'H'; name: string; type: 'team' }
  | null;

// Un game est fini quand les données RawGame existent et sont complètes
export function isGameFinished(game: RawGame | null | undefined): game is RawGame {
  return game !== null && game !== undefined && game.winner_id !== undefined;
}

// Détecte si un game est un draw (jeu nul = pas de points distribués)
export function isDrawGame(game: RawGame, mode: 'individual' | 'teams'): boolean {
  if (mode === 'individual') {
    return isDrawGameIndividual(game);
  }
  return isDrawGameTeam(game);
}

// En cas de draw, retourne les pips "perdus" (non distribués)
export function getDrawGamePips(game: RawGame): { total: number; byPlayer: Record<number, number> } {
  const total = game.p0_score + game.p1_score + game.p2_score + game.p3_score;
  return {
    total,
    byPlayer: {
      0: game.p0_score,
      1: game.p1_score,
      2: game.p2_score,
      3: game.p3_score
    }
  };
}

// Détection de fin de SET (quand quelqu'un >= maxPoints dans ce set)
// Prend les games du set courant uniquement
export function isSetFinished(
  gamesInSet: RawGame[],
  mode: 'individual' | 'teams',
  maxPoints: number
): boolean {
  if (gamesInSet.length === 0) return false;

  if (mode === 'individual') {
    const scores = calcIndividualScores(gamesInSet);
    return Object.values(scores).some(s => s >= maxPoints);
  }

  const { teamV, teamH } = calcTeamScores(gamesInSet);
  return teamV >= maxPoints || teamH >= maxPoints;
}

// Détection de fin de match : tous les sets sont terminés
export function isMatchFinished(
  numSetsFinished: number,
  numSets: number
): boolean {
  return numSetsFinished === numSets;
}

// Déterminer le gagnant du match (si match est terminé)
export function getMatchWinner(
  games: RawGame[],
  mode: 'individual' | 'teams',
  maxPoints: number
): MatchWinner {
  if (mode === 'individual') {
    const scores = calcIndividualScores(games);
    const winners = Object.entries(scores)
      .filter(([_, score]) => score >= maxPoints)
      .sort(([_, a], [__, b]) => b - a);

    if (winners.length > 0) {
      const [winnerId] = winners[0];
      const id = parseInt(winnerId);

      // Récupérer le nom du joueur basé sur son ID (pas toujours p0_name!)
      const firstGame = games[0];
      if (!firstGame) return null;

      const playerNames = [firstGame.p0_name, firstGame.p1_name, firstGame.p2_name, firstGame.p3_name];
      const playerName = playerNames[id] || `Player ${id}`;

      return {
        id,
        name: playerName,
        type: 'individual'
      };
    }
  } else {
    const { teamV, teamH } = calcTeamScores(games);

    if (teamV >= maxPoints) {
      return { team: 'V', name: 'Team V', type: 'team' };
    } else if (teamH >= maxPoints) {
      return { team: 'H', name: 'Team H', type: 'team' };
    }
  }

  return null;
}
