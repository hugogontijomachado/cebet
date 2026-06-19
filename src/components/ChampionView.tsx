import Link from "next/link";
import type { Season } from "@/lib/types";
import type { ChampionInfo } from "@/lib/queries";
import { formatBRL } from "@/lib/money";
import { ChampionConfetti } from "./ChampionConfetti";

export function ChampionView({
  season,
  champion,
}: {
  season: Season;
  champion: ChampionInfo | null;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-5 px-6 py-12 text-center">
      <ChampionConfetti />
      <p className="text-xs uppercase tracking-widest text-violet-mid">{season.name} · encerrada</p>
      <p className="font-display text-xl uppercase tracking-widest text-lime">
        🏆 Campeão da temporada
      </p>
      <div className="text-7xl">👑</div>
      {champion ? (
        <>
          <h1 className="font-display text-5xl font-bold text-lime drop-shadow">
            {champion.names.join(" · ")}
          </h1>
          <p className="font-display text-xl text-white">{champion.points} pontos</p>
          {champion.prize > 0 && (
            <p className="font-display text-2xl text-white">
              {champion.names.length > 1 ? "dividem" : "leva"} {formatBRL(champion.prize)} 💰
            </p>
          )}
        </>
      ) : (
        <h1 className="font-display text-3xl font-bold">Temporada encerrada</h1>
      )}
      <div className="mt-4 flex gap-4">
        <Link href="/temporada" className="text-sm text-lime underline">
          Ver classificação final
        </Link>
        <Link href="/" className="text-sm text-violet-mid underline">
          Recarregar
        </Link>
      </div>
    </main>
  );
}
