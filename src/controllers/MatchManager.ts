// Types de gestion du match
// (Logique de calcul → src/shared/scoring/scoreCalculator.ts)

import type { GameEndState, IndividualGameEndState } from './Score';

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
  scoreIndividual: Record<number, number>;
  scoreTeams: { teamV: number; teamH: number };
  matchFinished: boolean;
  winner: null | { id?: number; team?: 'V' | 'H'; name: string };
  currentGameNumber: number;
  currentSetNumber: number;
};
