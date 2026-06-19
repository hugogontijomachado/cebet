import { isAdmin } from "@/lib/admin-auth";
import { loginAdmin, createSeason, createGame } from "@/app/actions/admin";
import { getActiveSeason, getCurrentGame } from "@/lib/queries";
import { FlagPicker } from "@/components/FlagPicker";
import { GameControls, CloseSeasonButton } from "@/components/admin/AdminControls";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  if (!(await isAdmin())) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 bg-paper p-8 text-ink">
        <h1 className="font-display text-2xl font-bold">Admin · Bolão CEMEP</h1>
        {erro && <p className="text-sm text-pink">PIN incorreto.</p>}
        <form action={loginAdmin} className="flex flex-col gap-3">
          <input
            name="pin"
            type="password"
            placeholder="PIN"
            className="rounded-sm border border-hairline-cool px-3 py-2"
          />
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase text-white">
            Entrar
          </button>
        </form>
      </main>
    );
  }

  const season = await getActiveSeason();
  const game = season ? await getCurrentGame(season.id) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 bg-paper p-8 text-ink">
      <h1 className="font-display text-2xl font-bold">Admin · Bolão CEMEP</h1>

      {!season ? (
        <section className="flex flex-col gap-3 rounded-xl border border-hairline-cloud p-5">
          <h2 className="font-display text-lg">Nova temporada</h2>
          <form action={createSeason} className="flex flex-col gap-3">
            <input
              name="name"
              placeholder="Nome da temporada"
              className="rounded-sm border border-hairline-cool px-3 py-2"
            />
            <label className="flex flex-col gap-1 text-sm">
              Valor por aposta (R$)
              <input
                name="betValue"
                type="number"
                step="0.01"
                defaultValue="5"
                className="rounded-sm border border-hairline-cool px-3 py-2"
              />
            </label>
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase text-white">
              Criar temporada
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className="flex items-center justify-between rounded-xl border border-hairline-cloud p-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-violet-mid">Temporada ativa</p>
              <p className="font-display text-lg">
                {season.name} · R$ {Number(season.bet_value).toFixed(2)}/aposta
              </p>
            </div>
            <CloseSeasonButton seasonId={season.id} />
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-hairline-cloud p-5">
            <h2 className="font-display text-lg">Jogo atual</h2>
            {game && game.status !== "resolved" ? (
              <div className="flex flex-col gap-3">
                <p>
                  {game.team_a_name} x {game.team_b_name} — <strong>{game.status}</strong>
                </p>
                <GameControls game={game} />
              </div>
            ) : (
              <p className="text-violet-mid">
                Nenhum jogo em andamento. Cadastre o próximo abaixo.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-hairline-cloud p-5">
            <h2 className="font-display text-lg">Novo jogo</h2>
            <form action={createGame} className="flex flex-col gap-3">
              <input type="hidden" name="seasonId" value={season.id} />
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="teamAName"
                  placeholder="Time A"
                  className="rounded-sm border border-hairline-cool px-3 py-2"
                />
                <input
                  name="teamBName"
                  placeholder="Time B"
                  className="rounded-sm border border-hairline-cool px-3 py-2"
                />
                <FlagPicker name="teamAFlag" label="Bandeira A" />
                <FlagPicker name="teamBFlag" label="Bandeira B" defaultValue="AR" />
              </div>
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase text-white">
                Cadastrar jogo
              </button>
            </form>
          </section>
        </>
      )}
    </main>
  );
}
