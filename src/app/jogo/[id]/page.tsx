import Link from "next/link";
import { notFound } from "next/navigation";
import { getGameById, getGameBets } from "@/lib/queries";
import { isAdmin } from "@/lib/admin-auth";
import { MatchCard } from "@/components/MatchCard";
import { PredictionsTable } from "@/components/PredictionsTable";
import { formatBRL } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getGameById(id);
  if (!game) notFound();

  const admin = await isAdmin();
  const bets = await getGameBets(game.id);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center gap-6 px-4 py-10">
      <Link href="/temporada" className="self-start text-sm text-violet-mid underline">
        ← Temporada
      </Link>

      <p className="text-xs uppercase tracking-widest text-violet-mid">Jogo #{game.game_order}</p>

      <MatchCard game={game} />

      {game.status === "resolved" ? (
        <p className="text-sm text-violet-mid">
          {game.had_exact_winner && game.pot_amount != null
            ? `Bolão pago: ${formatBRL(Number(game.pot_amount))} 💰`
            : "Acumulou — ninguém cravou"}
        </p>
      ) : (
        <p className="text-xs uppercase tracking-widest text-violet-mid">
          {game.status === "open" ? "Apostas abertas" : "Apostas encerradas"}
        </p>
      )}

      <PredictionsTable
        gameId={game.id}
        initial={bets}
        isAdmin={admin}
        liveA={game.live_a}
        liveB={game.live_b}
        resolved={game.status === "resolved"}
      />
    </main>
  );
}
