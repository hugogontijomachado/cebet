import Link from "next/link";
import { getActiveSeason } from "@/lib/queries";
import { PointsLegend } from "@/components/PointsLegend";
import { formatBRL } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function RegrasPage() {
  const season = await getActiveSeason();
  const bet = season ? formatBRL(Number(season.bet_value)) : "R$ 5,00";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-10">
      <Link href="/" className="text-sm text-violet-mid underline">
        ← Voltar
      </Link>
      <h1 className="font-display text-3xl font-bold">Como funciona o bolão</h1>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-lime">Pontuação</h2>
        <p className="text-white/90">
          Cada palpite vale pontos conforme a proximidade do placar (vale sempre o maior nível):
        </p>
        <PointsLegend open />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-lime">O bolão (dinheiro)</h2>
        <p className="text-white/90">
          Cada palpite custa <strong>{bet}</strong>. Quem <strong>cravar o placar exato</strong> leva
          o bolão acumulado. Se ninguém cravar, o valor <strong>acumula</strong> para o próximo jogo.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-lime">Campeão da temporada</h2>
        <p className="text-white/90">
          No fim da temporada, quem somou <strong>mais pontos</strong> é o campeão — e leva o bolão
          que ainda estiver acumulado.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-lime">Placar ao vivo</h2>
        <p className="text-white/90">
          Durante o jogo, o placar parcial vai sendo atualizado e a coluna{" "}
          <strong>“Pontos”</strong> mostra quanto cada um faria{" "}
          <em>se o jogo terminasse naquele placar</em>.
        </p>
      </section>

      <Link href="/" className="mt-2 text-sm text-lime underline">
        ← Voltar ao jogo
      </Link>
    </main>
  );
}
