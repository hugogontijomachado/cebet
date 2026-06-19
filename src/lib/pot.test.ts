import { describe, it, expect } from "vitest";
import { carriedBetCount, computePot } from "./pot";

describe("carriedBetCount", () => {
  it("is 0 with no games", () => {
    expect(carriedBetCount([])).toBe(0);
  });
  it("accumulates bets across games with no exact winner", () => {
    expect(
      carriedBetCount([
        { betCount: 10, hadExactWinner: false },
        { betCount: 12, hadExactWinner: false },
      ]),
    ).toBe(22);
  });
  it("resets after a game with an exact winner", () => {
    expect(
      carriedBetCount([
        { betCount: 10, hadExactWinner: false },
        { betCount: 12, hadExactWinner: true },
        { betCount: 8, hadExactWinner: false },
      ]),
    ).toBe(8);
  });
});

describe("computePot", () => {
  it("pot = betValue * (carried + current)", () => {
    expect(computePot(5, 22, 8)).toBe(150);
  });
  it("pot with nothing carried", () => {
    expect(computePot(5, 0, 10)).toBe(50);
  });
});
