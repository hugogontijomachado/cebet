import { describe, it, expect } from "vitest";
import { computePoints, isExact, outcome, POINTS } from "./scoring";

describe("outcome", () => {
  it("classifies wins and draws", () => {
    expect(outcome({ a: 2, b: 1 })).toBe("A");
    expect(outcome({ a: 0, b: 3 })).toBe("B");
    expect(outcome({ a: 1, b: 1 })).toBe("DRAW");
  });
});

describe("computePoints", () => {
  const result = { a: 2, b: 1 };
  it("exact placar -> 5", () => {
    expect(computePoints({ a: 2, b: 1 }, result)).toBe(POINTS.exact);
  });
  it("winner + same goal difference (not exact) -> 3", () => {
    expect(computePoints({ a: 3, b: 2 }, result)).toBe(POINTS.winnerAndDiff);
  });
  it("winner only -> 2", () => {
    expect(computePoints({ a: 4, b: 0 }, result)).toBe(POINTS.winnerOnly);
  });
  it("one team's goals right, wrong outcome -> 1", () => {
    expect(computePoints({ a: 0, b: 1 }, result)).toBe(POINTS.oneTeam);
  });
  it("nothing right -> 0", () => {
    expect(computePoints({ a: 0, b: 5 }, result)).toBe(POINTS.none);
  });
  it("draw predicted for a draw, wrong score -> 3 (same outcome + diff 0)", () => {
    expect(computePoints({ a: 3, b: 3 }, { a: 1, b: 1 })).toBe(POINTS.winnerAndDiff);
  });
  it("isExact only true for identical score", () => {
    expect(isExact({ a: 2, b: 1 }, result)).toBe(true);
    expect(isExact({ a: 1, b: 2 }, result)).toBe(false);
  });
});
