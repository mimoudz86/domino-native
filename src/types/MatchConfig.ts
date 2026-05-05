export type MatchConfig = {
  mode: 'individual' | 'teams';
  maxPoints: 50 | 100;
  numSets: 1 | 2 | 3;
};

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  mode: 'individual',
  maxPoints: 50,
  numSets: 1,
};
