import { COUNTRIES, flagEmoji } from "@/lib/flags";

export function FlagPicker({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-ink">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? "BR"}
        className="rounded-sm border border-hairline-cool px-3 py-2 text-ink"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {flagEmoji(c.code)} {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
