"use client";

import { useState, useTransition } from "react";
import { placeBet } from "@/app/actions/bets";
import type { Participant, Uuid } from "@/lib/types";

export function BetForm({
  seasonId,
  gameId,
  participants,
  disabled,
}: {
  seasonId: Uuid;
  gameId: Uuid;
  participants: Participant[];
  disabled: boolean;
}) {
  const [mode, setMode] = useState<"existing" | "new">(
    participants.length ? "existing" : "new",
  );
  const [participantId, setParticipantId] = useState<string>(participants[0]?.id ?? "");
  const [newName, setNewName] = useState("");
  const [predA, setPredA] = useState("");
  const [predB, setPredB] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (disabled) {
    return (
      <p className="text-center text-violet-mid">Os palpites deste jogo foram encerrados.</p>
    );
  }

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await placeBet({
        seasonId,
        gameId,
        participantId: mode === "existing" ? (participantId as Uuid) : undefined,
        newName: mode === "new" ? newName : undefined,
        predA: Number(predA),
        predB: Number(predB),
      });
      setMsg(res.ok ? "Palpite registrado! 🎯" : res.error);
      if (res.ok && mode === "new") setNewName("");
    });
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-widest text-violet-mid">Quem é você?</span>
        {participants.length > 0 && (
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={mode === "existing"}
              onChange={() => setMode("existing")}
            />
            <select
              className="flex-1 rounded-sm bg-paper px-3 py-2 text-ink"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              onFocus={() => setMode("existing")}
            >
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === "new"} onChange={() => setMode("new")} />
          <input
            className="flex-1 rounded-sm bg-paper px-3 py-2 text-ink"
            placeholder="Sou novo: meu nome"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onFocus={() => setMode("new")}
          />
        </label>
      </div>

      <div className="flex items-center justify-center gap-3">
        <input
          inputMode="numeric"
          className="w-16 rounded-sm bg-paper px-3 py-2 text-center text-2xl text-ink"
          value={predA}
          onChange={(e) => setPredA(e.target.value.replace(/\D/g, ""))}
          placeholder="0"
        />
        <span className="text-2xl text-violet-mid">x</span>
        <input
          inputMode="numeric"
          className="w-16 rounded-sm bg-paper px-3 py-2 text-center text-2xl text-ink"
          value={predB}
          onChange={(e) => setPredB(e.target.value.replace(/\D/g, ""))}
          placeholder="0"
        />
      </div>

      <button
        onClick={submit}
        disabled={pending || predA === "" || predB === ""}
        className="rounded-md bg-white px-4 py-3 font-ui text-sm font-bold uppercase tracking-wide text-ink-deep disabled:opacity-50"
      >
        {pending ? "Enviando…" : "Enviar palpite"}
      </button>
      {msg && <p className="text-center text-sm text-lime">{msg}</p>}
    </div>
  );
}
