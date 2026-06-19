import { formatBRL } from "@/lib/money";

const PIX_NAME = "Deborah";
const PIX_KEY = "62991711700";

export function PixInfo({ betValue }: { betValue: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-hairline-violet bg-night/60 px-6 py-3 text-center">
      <span className="text-xs uppercase tracking-widest text-violet-mid">
        Aposta {formatBRL(betValue)} · pague no PIX
      </span>
      <span className="font-display text-lg">
        {PIX_NAME} <span className="text-violet-mid">·</span>{" "}
        <span className="text-lime">{PIX_KEY}</span>
      </span>
    </div>
  );
}
