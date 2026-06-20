import Link from "next/link";
import {
  getActiveSeason,
  getCurrentGame,
  getParticipants,
  getGameBets,
  getCurrentPot,
  getResolvedGamesWithWinners,
  getLatestClosedSeason,
  getSeasonChampion,
} from "@/lib/queries";
import { MatchCard } from "@/components/MatchCard";
import { PotDisplay } from "@/components/PotDisplay";
import { WonPot } from "@/components/WonPot";
import { PixInfo } from "@/components/PixInfo";
import { BetForm } from "@/components/BetForm";
import { PredictionsTable } from "@/components/PredictionsTable";
import { WinnerCelebration } from "@/components/WinnerCelebration";
import { LiveScore } from "@/components/LiveScore";
import { SeasonCloseWatcher } from "@/components/SeasonCloseWatcher";
import { ChampionView } from "@/components/ChampionView";
import { isAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const season = await getActiveSeason();
  const admin = await isAdmin();

  if (!season) {
    // No active season — show the most recent champion screen if there is one.
    const closed = await getLatestClosedSeason();
    if (closed) {
      const champion = await getSeasonChampion(closed);
      return <ChampionView season={closed} champion={champion} />;
    }
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

  // Latest game decided with a winner, no new game yet → show who won + prize.
  const justWon = !!(
    game &&
    game.status === "resolved" &&
    game.had_exact_winner &&
    resolvedWinners.length > 0
  );

  // PIX stays at the top only while bets are open; otherwise it moves to the bottom.
  const bettingOpen = !!(game && game.status === "open");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center gap-8 px-4 py-10">
      <SeasonCloseWatcher seasonId={season.id} />
      <header className="text-center">
        <p className="text-xs uppercase tracking-widest text-violet-mid">{season.name}</p>
        <h1 className="font-display text-3xl font-bold">Bolão CEMEP</h1>
      </header>

      {justWon ? (
        <WonPot winners={resolvedWinners} prize={Number(game!.pot_amount ?? 0)} />
      ) : (
        <PotDisplay value={pot} />
      )}
      {bettingOpen && <PixInfo betValue={Number(season.bet_value)} />}

      {!game ? (
        <p className="text-violet-mid">Aguardando o próximo jogo…</p>
      ) : (
        <>
          <MatchCard game={game} />

          {game.status !== "resolved" && (
            <LiveScore
              gameId={game.id}
              initialA={game.live_a}
              initialB={game.live_b}
              isAdmin={admin}
            />
          )}

          <WinnerCelebration
            gameId={game.id}
            initialStatus={game.status}
            winners={resolvedWinners}
            resultA={game.result_a}
            resultB={game.result_b}
            potAmount={game.pot_amount}
            teamAName={game.team_a_name}
            teamBName={game.team_b_name}
          />

          {game.status !== "resolved" && (
            <BetForm
              seasonId={season.id}
              gameId={game.id}
              participants={await getParticipants(season.id)}
              disabled={game.status !== "open"}
            />
          )}

          <PredictionsTable
            gameId={game.id}
            initial={await getGameBets(game.id)}
            isAdmin={admin}
            liveA={game.live_a}
            liveB={game.live_b}
            resolved={game.status === "resolved"}
            resultA={game.result_a}
            resultB={game.result_b}
          />
        </>
      )}

      {!bettingOpen && <PixInfo betValue={Number(season.bet_value)} />}

      <div className="mt-4 flex gap-4">
        <Link href="/temporada" className="text-sm text-lime underline">
          Tabela da temporada →
        </Link>
        <Link href="/regras" className="text-sm text-violet-mid underline">
          Regras
        </Link>
      </div>
    </main>
  );
}
