import { formatBRL } from "@/lib/money";

/** Replaces the "R$ 0,00" pot right after a win — shows who won and how much. */
export function WonPot({ winners, prize }: { winners: string[]; prize: number }) {
  return (
    <div className="inline-flex flex-col items-center gap-1 rounded-xl bg-night px-8 py-4 text-center ring-1 ring-hairline-violet">
      <span className="text-xs uppercase tracking-widest text-violet-mid">Bolão pago 🎉</span>
      <span className="font-display text-2xl font-bold text-lime">{winners.join(" · ")}</span>
      <span className="font-display text-base text-white">
        {winners.length > 1 ? "levaram" : "levou"} {formatBRL(prize)} 💰
      </span>
    </div>
  );
}
