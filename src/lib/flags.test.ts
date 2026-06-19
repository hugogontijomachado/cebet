import { describe, it, expect } from "vitest";
import { flagEmoji, COUNTRIES } from "./flags";

describe("flagEmoji", () => {
  it("converts BR to the Brazil flag", () => {
    expect(flagEmoji("BR")).toBe("🇧🇷");
  });
  it("converts HT to the Haiti flag", () => {
    expect(flagEmoji("HT")).toBe("🇭🇹");
  });
  it("is case-insensitive", () => {
    expect(flagEmoji("ar")).toBe("🇦🇷");
  });
  it("builds the Scotland subdivision flag from GB-SCT", () => {
    const scotland =
      "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}";
    expect(flagEmoji("GB-SCT")).toBe(scotland);
  });
});

describe("COUNTRIES", () => {
  it("has unique codes, includes Brasil/Haiti/Escócia, valid code shapes", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain("BR");
    expect(codes).toContain("HT");
    expect(codes).toContain("GB-SCT");
    // Either a 2-letter country code or a GB-XXX subdivision code.
    expect(codes.every((c) => /^[A-Z]{2}$/.test(c) || /^GB-[A-Z]{3}$/.test(c))).toBe(true);
  });
});
