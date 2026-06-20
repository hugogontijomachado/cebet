import type { Game } from "@/lib/types";
import { Flag } from "./Flag";

export function MatchCard({ game }: { game: Game }) {
  const resolved = game.status === "resolved";
  return (
    <div className="flex items-center justify-center gap-4 sm:gap-10">
      <Team name={game.team_a_name} flag={game.team_a_flag} />
      <div className="shrink-0 text-center font-display">
        {resolved ? (
          <div className="flex items-center gap-2 text-5xl font-bold whitespace-nowrap">
            <span>{game.result_a}</span>
            <span className="text-3xl text-violet-mid">x</span>
            <span>{game.result_b}</span>
          </div>
        ) : (
          <div className="text-3xl text-violet-mid">×</div>
        )}
        {resolved && (
          <div className="mt-1 text-xs uppercase tracking-wider text-lime">resultado final</div>
        )}
      </div>
      <Team name={game.team_b_name} flag={game.team_b_flag} />
    </div>
  );
}

function Team({ name, flag }: { name: string; flag: string }) {
  return (
    <div className="flex w-24 flex-col items-center gap-2 sm:w-32">
      <Flag code={flag} className="text-6xl drop-shadow sm:text-7xl" />
      <div className="text-center font-display text-lg leading-tight">{name}</div>
    </div>
  );
}
