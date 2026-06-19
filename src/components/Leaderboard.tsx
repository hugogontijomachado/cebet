import type { LeaderRow } from "@/lib/queries";

export function Leaderboard({
  rows,
  championId,
}: {
  rows: LeaderRow[];
  championId: string | null;
}) {
  return (
    <table className="w-full border-collapse text-ink">
      <thead>
        <tr className="border-b border-hairline-cloud text-left text-xs uppercase tracking-widest text-violet-mid">
          <th className="py-2">#</th>
          <th>Nome</th>
          <th className="text-center">Cravadas</th>
          <th className="text-right">Pontos</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.participant.id} className="border-b border-hairline-cloud">
            <td className="py-2">{i + 1}</td>
            <td>
              {r.participant.name}
              {r.participant.id === championId && " 👑"}
            </td>
            <td className="text-center">{r.exactWins}</td>
            <td className="text-right font-bold">{r.points}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={4} className="py-4 text-center text-violet-mid">
              Ainda sem pontos.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
