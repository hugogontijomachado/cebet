/** Aviso legal de jogo responsável, exibido no final de todas as páginas. */
export function ResponsibleGamingNotice() {
  return (
    <footer className="border-t border-hairline-violet px-4 py-6">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-pink px-3 py-1 text-xs font-bold uppercase tracking-wider text-pink">
          <span aria-hidden>🔞</span> Proibido para menores de 18 anos
        </span>
        <p className="text-xs text-violet-mid">
          Jogue com responsabilidade. Aposte com moderação.
        </p>
      </div>
    </footer>
  );
}
