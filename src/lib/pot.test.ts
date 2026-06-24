import { describe, it, expect } from "vitest";
import { carriedBetCount, carriedExtra, computePot } from "./pot";

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

describe("carriedExtra", () => {
  it("is 0 with no games", () => {
    expect(carriedExtra([])).toBe(0);
  });
  it("treats missing extraPot as 0", () => {
    expect(
      carriedExtra([
        { betCount: 10, hadExactWinner: false },
        { betCount: 12, hadExactWinner: false },
      ]),
    ).toBe(0);
  });
  it("accumulates extra across games with no exact winner", () => {
    expect(
      carriedExtra([
        { betCount: 10, hadExactWinner: false, extraPot: 50 },
        { betCount: 12, hadExactWinner: false, extraPot: 30 },
      ]),
    ).toBe(80);
  });
  it("resets after a game with an exact winner", () => {
    expect(
      carriedExtra([
        { betCount: 10, hadExactWinner: false, extraPot: 50 },
        { betCount: 12, hadExactWinner: true, extraPot: 30 },
        { betCount: 8, hadExactWinner: false, extraPot: 20 },
      ]),
    ).toBe(20);
  });
});

describe("computePot", () => {
  it("pot = betValue * (carried + current)", () => {
    expect(computePot(5, 22, 8)).toBe(150);
  });
  it("pot with nothing carried", () => {
    expect(computePot(5, 0, 10)).toBe(50);
  });
  it("adds carried and current extra on top of the bet pot", () => {
    expect(computePot(5, 22, 8, 40, 10)).toBe(200);
  });
  it("extra params default to 0", () => {
    expect(computePot(5, 0, 10)).toBe(50);
  });
});
