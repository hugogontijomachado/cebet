"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { playFanfare } from "@/lib/sound";

/** Fires a grand gold celebration on mount — used by the champion screen. */
export function ChampionConfetti() {
  useEffect(() => {
    playFanfare(true);
    const gold = ["#ffd700", "#c2ef4e", "#ffffff", "#fa7faa"];
    const end = Date.now() + 4000;
    (function frame() {
      confetti({ particleCount: 7, angle: 60, spread: 80, origin: { x: 0 }, colors: gold });
      confetti({ particleCount: 7, angle: 120, spread: 80, origin: { x: 1 }, colors: gold });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    confetti({ particleCount: 160, spread: 120, origin: { y: 0.35 }, colors: gold });
  }, []);
  return null;
}
