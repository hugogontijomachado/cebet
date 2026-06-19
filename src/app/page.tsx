import Link from "next/link";
import {
  getActiveSeason,
  getCurrentGame,
  getParticipants,
  getGameBets,
  getCurrentPot,
  getResolvedGamesWithWinners,
} from "@/lib/queries";
import { MatchCard } from "@/components/MatchCard";
import { PotDisplay } from "@/components/PotDisplay";
import { PixInfo } from "@/components/PixInfo";
import { BetForm } from "@/components/BetForm";
import { PredictionsTable } from "@/components/PredictionsTable";
import { WinnerCelebration } from "@/components/WinnerCelebration";
import { isAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const season = await getActiveSeason();
  const admin = await isAdmin();

  if (!season) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="font-display text-4xl font-bold">Bolão CEMEP</h1>
        <p className="text-violet-mid">Nenhuma temporada ativa. Fale com o admin.</p>
        <Link href="/admin" className="text-sm text-lime underline">
          Área do admin
        </Link>
      </main>
    );
  }

  const game = await getCurrentGame(season.id);
  const pot = await getCurrentPot(season, game);

  const resolvedWinners =
    game && game.status === "resolved"
      ? (await getResolvedGamesWithWinners(season.id)).find((g) => g.game.id === game.id)
          ?.winners ?? []
      : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center gap-8 px-4 py-10">
      <header className="text-center">
        <p className="text-xs uppercase tracking-widest text-violet-mid">{season.name}</p>
        <h1 className="font-display text-3xl font-bold">Bolão CEMEP</h1>
      </header>

      <PotDisplay value={pot} />
      <PixInfo betValue={Number(season.bet_value)} />

      {!game ? (
        <p className="text-violet-mid">Aguardando o próximo jogo…</p>
      ) : (
        <>
          <MatchCard game={game} />

          {game.status === "resolved" ? (
            <WinnerCelebration
              gameId={game.id}
              initialStatus={game.status}
              winners={resolvedWinners}
            />
          ) : (
            <>
              <WinnerCelebration gameId={game.id} initialStatus={game.status} winners={[]} />
              <BetForm
                seasonId={season.id}
                gameId={game.id}
                participants={await getParticipants(season.id)}
                disabled={game.status !== "open"}
              />
            </>
          )}

          <PredictionsTable
            gameId={game.id}
            initial={await getGameBets(game.id)}
            isAdmin={admin}
          />
        </>
      )}

      <Link href="/temporada" className="mt-4 text-sm text-lime underline">
        Ver tabela da temporada →
      </Link>
    </main>
  );
}
