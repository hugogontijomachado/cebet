import Link from "next/link";
import {
  getActiveSeason,
  getLeaderboard,
  getResolvedGamesWithWinners,
} from "@/lib/queries";
import { Leaderboard } from "@/components/Leaderboard";
import { MatchCard } from "@/components/MatchCard";

export const dynamic = "force-dynamic";

export default async function TemporadaPage() {
  const season = await getActiveSeason();
  if (!season) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 bg-paper p-8 text-ink">
        <p className="text-violet-mid">Nenhuma temporada ativa.</p>
        <Link href="/" className="text-sm text-violet-link underline">
          ← Voltar
        </Link>
      </main>
    );
  }
  const rows = await getLeaderboard(season.id);
  const history = await getResolvedGamesWithWinners(season.id);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 bg-paper p-6 text-ink">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{season.name}</h1>
        <Link href="/" className="text-sm text-violet-link underline">
          ← Jogo atual
        </Link>
      </header>

      <section>
        <h2 className="mb-3 font-display text-lg">Classificação</h2>
        <Leaderboard rows={rows} championId={season.champion_participant_id} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg">Jogos</h2>
        {history.map(({ game, winners }) => (
          <div key={game.id} className="rounded-xl border border-hairline-cloud p-4">
            <div className="text-ink">
              <MatchCard game={game} />
            </div>
            <p className="mt-2 text-center text-sm text-violet-mid">
              {winners.length ? `Cravou: ${winners.join(", ")}` : "Acumulou"}
            </p>
          </div>
        ))}
        {history.length === 0 && (
          <p className="text-violet-mid">Nenhum jogo encerrado ainda.</p>
        )}
      </section>
    </main>
  );
}
