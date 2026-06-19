export interface GameBetSummary {
  betCount: number;
  hadExactWinner: boolean;
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

/** Money pot at stake right now. */
export function computePot(betValue: number, carried: number, currentBetCount: number): number {
  return betValue * (carried + currentBetCount);
}
