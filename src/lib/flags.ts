export function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/[A-Z]/g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/** Curated team list (national teams). Extend freely. */
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
  { code: "PT", name: "Portugal" },
  { code: "ES", name: "Espanha" },
  { code: "FR", name: "França" },
  { code: "DE", name: "Alemanha" },
  { code: "IT", name: "Itália" },
  { code: "GB", name: "Inglaterra" },
  { code: "NL", name: "Holanda" },
  { code: "BE", name: "Bélgica" },
  { code: "HR", name: "Croácia" },
  { code: "RS", name: "Sérvia" },
  { code: "CH", name: "Suíça" },
  { code: "PL", name: "Polônia" },
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
