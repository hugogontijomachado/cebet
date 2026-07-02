export function flagEmoji(code: string): string {
  // Subdivision flags (Scotland, England, Wales) use ISO 3166-2 codes like
  // "GB-SCT" and render as a waving-flag base + tag chars + cancel tag.
  const sub = code.toUpperCase().match(/^GB-([A-Z]{3})$/);
  if (sub) {
    const seq = "gb" + sub[1].toLowerCase();
    return (
      "\u{1F3F4}" +
      [...seq].map((c) => String.fromCodePoint(0xe0000 + c.charCodeAt(0))).join("") +
      "\u{E007F}"
    );
  }
  return code
    .toUpperCase()
    .replace(/[A-Z]/g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/** Curated team list (national teams + UK subdivisions). Extend freely. */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "BR", name: "Brasil" },
  { code: "AR", name: "Argentina" },
  { code: "UY", name: "Uruguai" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colômbia" },
  { code: "PE", name: "Peru" },
  { code: "PY", name: "Paraguai" },
  { code: "EC", name: "Equador" },
  { code: "BO", name: "Bolívia" },
  { code: "VE", name: "Venezuela" },
  { code: "HT", name: "Haiti" },
  { code: "PT", name: "Portugal" },
  { code: "ES", name: "Espanha" },
  { code: "FR", name: "França" },
  { code: "DE", name: "Alemanha" },
  { code: "IT", name: "Itália" },
  { code: "GB", name: "Reino Unido" },
  { code: "GB-SCT", name: "Escócia" },
  { code: "GB-ENG", name: "Inglaterra" },
  { code: "GB-WLS", name: "País de Gales" },
  { code: "NL", name: "Holanda" },
  { code: "BE", name: "Bélgica" },
  { code: "HR", name: "Croácia" },
  { code: "RS", name: "Sérvia" },
  { code: "CH", name: "Suíça" },
  { code: "PL", name: "Polônia" },
  { code: "NO", name: "Noruega" },
  { code: "US", name: "Estados Unidos" },
  { code: "MX", name: "México" },
  { code: "CA", name: "Canadá" },
  { code: "JP", name: "Japão" },
  { code: "KR", name: "Coreia do Sul" },
  { code: "AU", name: "Austrália" },
  { code: "MA", name: "Marrocos" },
  { code: "SN", name: "Senegal" },
  { code: "GH", name: "Gana" },
  { code: "CM", name: "Camarões" },
  { code: "NG", name: "Nigéria" },
];
