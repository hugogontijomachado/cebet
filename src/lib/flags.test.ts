import { describe, it, expect } from "vitest";
import { flagEmoji, COUNTRIES } from "./flags";

describe("flagEmoji", () => {
  it("converts BR to the Brazil flag", () => {
    expect(flagEmoji("BR")).toBe("🇧🇷");
  });
  it("is case-insensitive", () => {
    expect(flagEmoji("ar")).toBe("🇦🇷");
  });
});

describe("COUNTRIES", () => {
  it("has unique 2-letter codes and includes Brazil", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain("BR");
    expect(codes.every((c) => /^[A-Z]{2}$/.test(c))).toBe(true);
  });
});
