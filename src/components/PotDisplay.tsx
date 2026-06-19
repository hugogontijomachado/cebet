import { formatBRL } from "@/lib/money";

export function PotDisplay({ value }: { value: number }) {
  return (
    <div className="inline-flex flex-col items-center rounded-xl bg-night px-8 py-4 ring-1 ring-hairline-violet">
      <span className="text-xs uppercase tracking-widest text-violet-mid">Bolão acumulado</span>
      <span className="font-display text-4xl font-bold text-lime">{formatBRL(value)}</span>
    </div>
  );
}
