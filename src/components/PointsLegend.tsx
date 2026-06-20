/** Expandable legend explaining how points are scored. Tap to open (mobile-friendly). */
export function PointsLegend({ open = false }: { open?: boolean }) {
  return (
    <details
      open={open}
      className="w-full max-w-sm rounded-lg bg-night/40 px-4 py-2 text-sm text-violet-mid"
    >
      <summary className="cursor-pointer select-none text-xs uppercase tracking-widest">
        ⓘ Como são os pontos?
      </summary>
      <ul className="mt-2 space-y-1 text-white/90">
        <li>
          <span className="font-bold text-lime">5</span> — cravou o placar exato
        </li>
        <li>
          <span className="font-bold text-lime">3</span> — acertou o vencedor <em>e</em> o saldo de
          gols
        </li>
        <li>
          <span className="font-bold text-lime">2</span> — acertou só quem ganha (ou o empate)
        </li>
        <li>
          <span className="font-bold text-lime">1</span> — acertou os gols de um dos times
        </li>
        <li>
          <span className="font-bold text-violet-mid">0</span> — não acertou nada
        </li>
      </ul>
      <p className="mt-2 text-xs text-violet-mid">
        Vale sempre o maior nível. A coluna “Pontos” mostra quanto cada um faria no placar atual.
      </p>
    </details>
  );
}
