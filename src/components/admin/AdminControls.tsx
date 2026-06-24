"use client";

import { useState, useTransition } from "react";
import { closeBetting, resolveGame, closeSeason, setExtraPot } from "@/app/actions/admin";
import { useConfirm } from "@/components/ConfirmDialog";
import type { Game, Uuid } from "@/lib/types";

export function ExtraPotControl({ game }: { game: Game }) {
  const [value, setValue] = useState(String(Number(game.extra_pot ?? 0)));
  const [pending, start] = useTransition();
  const amount = Number(value);
  const valid = value !== "" && Number.isFinite(amount) && amount >= 0;

  return (
    <label className="flex flex-col gap-1 text-sm">
      Acúmulo extra (R$) — somado ao bolão
      <div className="flex items-center gap-2">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d.,]/g, "").replace(",", "."))}
          className="w-28 rounded-sm border border-hairline-cool px-3 py-2 text-ink"
          placeholder="0"
        />
        <button
          onClick={() => start(() => setExtraPot(game.id, amount))}
          disabled={pending || !valid}
          className="rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase text-white disabled:opacity-50"
        >
          Salvar acúmulo extra
        </button>
      </div>
    </label>
  );
}

export function GameControls({ game }: { game: Game }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [pending, start] = useTransition();
  const confirm = useConfirm();

  if (game.status === "open") {
    return (
      <button
        onClick={async () => {
          if (
            await confirm({
              title: "Encerrar palpites?",
              message: "Trava as apostas e exclui quem ainda não pagou.",
              confirmLabel: "Encerrar palpites",
              tone: "danger",
            })
          )
            start(() => closeBetting(game.id));
        }}
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase text-white"
      >
        Encerrar palpites
      </button>
    );
  }
  if (game.status === "closed") {
    return (
      <div className="flex items-center gap-2">
        <input
          inputMode="numeric"
          value={a}
          onChange={(e) => setA(e.target.value.replace(/\D/g, ""))}
          className="w-14 rounded-sm border border-hairline-cool px-2 py-2 text-center text-ink"
          placeholder="A"
        />
        <span className="text-ink">x</span>
        <input
          inputMode="numeric"
          value={b}
          onChange={(e) => setB(e.target.value.replace(/\D/g, ""))}
          className="w-14 rounded-sm border border-hairline-cool px-2 py-2 text-center text-ink"
          placeholder="B"
        />
        <button
          onClick={async () => {
            if (
              await confirm({
                title: "Lançar resultado?",
                message: `${game.team_a_name} ${a} × ${b} ${game.team_b_name} — isto congela os pontos e o pote e não pode ser desfeito facilmente.`,
                confirmLabel: "Lançar resultado",
                tone: "danger",
              })
            )
              start(() => resolveGame(game.id, Number(a), Number(b)));
          }}
          disabled={pending || a === "" || b === ""}
          className="rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase text-white disabled:opacity-50"
        >
          Lançar resultado
        </button>
      </div>
    );
  }
  return (
    <span className="text-sm text-violet-mid">
      Resolvido: {game.result_a} x {game.result_b}
    </span>
  );
}

export function CloseSeasonButton({ seasonId }: { seasonId: Uuid }) {
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  return (
    <button
      onClick={async () => {
        if (
          await confirm({
            title: "Encerrar temporada?",
            message: "Coroa o campeão e fecha a temporada definitivamente.",
            confirmLabel: "Encerrar temporada",
            tone: "danger",
          })
        )
          start(() => closeSeason(seasonId));
      }}
      disabled={pending}
      className="rounded-md bg-pink px-4 py-2 text-sm font-bold uppercase text-ink-deep"
    >
      Encerrar temporada
    </button>
  );
}
