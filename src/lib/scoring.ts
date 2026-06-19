export interface Score {
  a: number;
  b: number;
}

export const POINTS = {
  exact: 5,
  winnerAndDiff: 3,
  winnerOnly: 2,
  oneTeam: 1,
  none: 0,
} as const;

export function outcome(s: Score): "A" | "B" | "DRAW" {
  if (s.a > s.b) return "A";
  if (s.a < s.b) return "B";
  return "DRAW";
}

export function isExact(pred: Score, result: Score): boolean {
  return pred.a === result.a && pred.b === result.b;
}

export function computePoints(pred: Score, result: Score): number {
  if (isExact(pred, result)) return POINTS.exact;
  const sameOutcome = outcome(pred) === outcome(result);
  const sameDiff = pred.a - pred.b === result.a - result.b;
  if (sameOutcome && sameDiff) return POINTS.winnerAndDiff;
  if (sameOutcome) return POINTS.winnerOnly;
  if (pred.a === result.a || pred.b === result.b) return POINTS.oneTeam;
  return POINTS.none;
}
