import { flagEmoji } from "@/lib/flags";

export function Flag({ code, className = "" }: { code: string; className?: string }) {
  return (
    <span role="img" aria-label={code} className={className}>
      {flagEmoji(code)}
    </span>
  );
}
