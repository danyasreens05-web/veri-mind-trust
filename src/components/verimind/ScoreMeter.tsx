type Tone = "trust" | "warn" | "danger" | "primary";

export function ScoreMeter({
  label,
  value,
  invert = false,
  hint,
}: {
  label: string;
  value: number;
  /** If true, lower values are "good" (e.g. hallucination risk). */
  invert?: boolean;
  hint?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const good = invert ? pct < 34 : pct >= 70;
  const mid = invert ? pct < 67 && pct >= 34 : pct >= 40 && pct < 70;
  const tone: Tone = good ? "trust" : mid ? "warn" : "danger";

  const barColor =
    tone === "trust"
      ? "bg-trust"
      : tone === "warn"
        ? "bg-warn"
        : "bg-danger";
  const textColor =
    tone === "trust"
      ? "text-trust"
      : tone === "warn"
        ? "text-warn"
        : "text-danger";

  return (
    <div className="rounded-xl border border-border bg-surface/60 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`text-2xl font-semibold tabular-nums ${textColor}`}>
          {pct}
          <span className="text-sm text-muted-foreground">/100</span>
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint ? (
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
