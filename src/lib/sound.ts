/**
 * Synthesized celebration fanfare via the Web Audio API — no audio file needed,
 * works offline and respects the strict CSP. Silently no-ops if audio is blocked
 * (e.g. before any user interaction with the page).
 */
export function playFanfare(grand = false): void {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    void ctx.resume();
    const now = ctx.currentTime;

    // Ascending major arpeggio; the "grand" variant adds a higher flourish.
    const base = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    const notes = grand ? [...base, 1318.51, 1567.98] : base; // + E6 G6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });

    const total = (notes.length * 0.12 + 0.6) * 1000;
    setTimeout(() => void ctx.close(), total);
  } catch {
    // audio unavailable — ignore
  }
}
