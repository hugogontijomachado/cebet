export interface GameBetSummary {
  betCount: number;
  hadExactWinner: boolean;
  /** Extra money the admin injected into this game's pot. */
  extraPot?: number;
}

/** Bets carried into the next game (reset to 0 whenever a game had an exact winner). */
export function carriedBetCount(resolved: GameBetSummary[]): number {
  let running = 0;
  for (const g of resolved) {
    running += g.betCount;
    if (g.hadExactWinner) running = 0;
  }
  return running;
}

/** Extra money carried into the next game (reset to 0 whenever a game had an exact winner). */
export function carriedExtra(resolved: GameBetSummary[]): number {
  let running = 0;
  for (const g of resolved) {
    running += g.extraPot ?? 0;
    if (g.hadExactWinner) running = 0;
  }
  return running;
}

/** Money pot at stake right now: bet pot (count-based) plus any extra money. */
export function computePot(
  betValue: number,
  carried: number,
  currentBetCount: number,
  carriedExtra = 0,
  currentExtra = 0,
): number {
  return betValue * (carried + currentBetCount) + carriedExtra + currentExtra;
}
