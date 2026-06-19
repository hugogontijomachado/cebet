"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/money";

const PIX_NAME = "Deborah";
const PIX_KEY = "62991711700";

export function PixInfo({ betValue }: { betValue: number }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — selection still works as a fallback.
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-hairline-violet bg-night/60 px-6 py-3 text-center">
      <span className="text-xs uppercase tracking-widest text-violet-mid">
        Aposta {formatBRL(betValue)} · pague no PIX
      </span>
      <span className="font-display text-lg">{PIX_NAME}</span>
      <button
        type="button"
        onClick={copy}
        aria-label="Copiar chave PIX"
        className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 font-ui text-sm font-bold text-ink-deep transition active:scale-95"
      >
        <span className="select-all tracking-wide">{PIX_KEY}</span>
        <span className="text-xs uppercase">{copied ? "✓ copiado" : "📋 copiar"}</span>
      </button>
    </div>
  );
}
