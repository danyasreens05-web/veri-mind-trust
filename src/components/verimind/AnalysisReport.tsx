import type { VeriMindAnalysis } from "@/lib/api/verimind.functions";
import { ScoreMeter } from "./ScoreMeter";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Eye,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

const evidenceStyles: Record<
  VeriMindAnalysis["claims"][number]["evidence_status"],
  { label: string; cls: string; icon: typeof CheckCircle2 }
> = {
  supported: {
    label: "Supported",
    cls: "bg-trust/15 text-trust border-trust/30",
    icon: CheckCircle2,
  },
  partial: {
    label: "Partial",
    cls: "bg-warn/15 text-warn border-warn/30",
    icon: CircleHelp,
  },
  unsupported: {
    label: "Unsupported",
    cls: "bg-danger/15 text-danger border-danger/30",
    icon: AlertTriangle,
  },
  unverifiable: {
    label: "Unverifiable",
    cls: "bg-danger/15 text-danger border-danger/30",
    icon: ShieldAlert,
  },
};

const severityCls: Record<"low" | "medium" | "high", string> = {
  low: "bg-warn/10 text-warn border-warn/30",
  medium: "bg-warn/20 text-warn border-warn/40",
  high: "bg-danger/20 text-danger border-danger/50",
};

export function AnalysisReport({
  result,
  model,
}: {
  result: VeriMindAnalysis;
  model: string;
}) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <section className="rounded-2xl border border-border bg-surface/70 p-6 backdrop-blur">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Reasoning Summary
          <span className="ml-auto text-muted-foreground normal-case tracking-normal">
            via {model}
          </span>
        </div>
        <p className="mt-3 text-lg leading-relaxed text-foreground">
          {result.summary}
        </p>
        <p className="mt-4 rounded-lg border border-warn/30 bg-warn/5 p-3 text-sm text-warn">
          <span className="font-semibold">Uncertainty disclosure: </span>
          <span className="text-foreground/80">
            {result.uncertainty_disclosure}
          </span>
        </p>
      </section>

      {/* Scores */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreMeter
          label="Reliability"
          value={result.scores.reliability}
          hint="Overall trust signal"
        />
        <ScoreMeter
          label="Hallucination Risk"
          value={result.scores.hallucination_risk}
          invert
          hint="Lower is safer"
        />
        <ScoreMeter
          label="Evidence Coverage"
          value={result.scores.evidence_coverage}
          hint="Claims backed by evidence"
        />
        <ScoreMeter
          label="Reasoning Consistency"
          value={result.scores.reasoning_consistency}
          hint="Internal logical coherence"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Claims */}
        <section className="rounded-2xl border border-border bg-surface/70 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Extracted Claims · Verification Layer
          </h3>
          <ul className="mt-4 space-y-3">
            {result.claims.map((c, i) => {
              const meta = evidenceStyles[c.evidence_status];
              const Icon = meta.icon;
              return (
                <li
                  key={i}
                  className="rounded-xl border border-border/70 bg-background/40 p-4"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${meta.cls}`}
                    >
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </span>
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {c.category}
                    </span>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      conf {Math.round(c.confidence * 100)}%
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{c.claim}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.evidence_note}
                  </p>
                </li>
              );
            })}
            {result.claims.length === 0 && (
              <li className="text-sm text-muted-foreground">
                No discrete claims extracted.
              </li>
            )}
          </ul>
        </section>

        {/* Hallucinations + reasoning */}
        <section className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface/70 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Hallucination Detection
            </h3>
            <ul className="mt-4 space-y-3">
              {result.hallucination_flags.map((f, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-border/70 bg-background/40 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs uppercase tracking-wider ${severityCls[f.severity]}`}
                    >
                      {f.severity}
                    </span>
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {f.type.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {f.issue}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {f.explanation}
                  </p>
                </li>
              ))}
              {result.hallucination_flags.length === 0 && (
                <li className="rounded-lg border border-trust/30 bg-trust/5 p-3 text-sm text-trust">
                  No hallucination risks detected by the model's self-audit.
                  Still recommend human review on any numeric claim.
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-surface/70 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Reasoning Trace
            </h3>
            <ol className="mt-4 space-y-2">
              {result.reasoning_steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <span className="text-foreground">{s.step}</span>
                    {s.depends_on_assumption && (
                      <span className="ml-2 rounded-full border border-warn/30 bg-warn/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-warn">
                        assumption
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      {/* Assumptions + human review */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface/70 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Tracked Assumptions
          </h3>
          <ul className="mt-4 space-y-2">
            {result.assumptions.map((a, i) => (
              <li
                key={i}
                className="rounded-lg border border-border/70 bg-background/40 p-3 text-sm text-foreground/90"
              >
                {a}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
            <Eye className="h-4 w-4" /> Human Review Checkpoints
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Validate these manually before acting on the output.
          </p>
          <ul className="mt-4 space-y-2">
            {result.human_review_checkpoints.map((h, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-primary/20 bg-background/40 p-3 text-sm text-foreground"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/40 text-xs text-primary">
                  ✓
                </span>
                {h}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
