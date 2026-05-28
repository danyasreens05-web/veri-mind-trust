import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Brain,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import {
  clearHistory,
  loadHistory,
  type HistoryEntry,
} from "@/lib/verimind-history";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "VeriMind AI — Reliability Dashboard" },
      {
        name: "description",
        content:
          "Aggregate reliability, hallucination, and evidence trends across your VeriMind AI analyses.",
      },
      {
        property: "og:title",
        content: "VeriMind AI — Reliability Dashboard",
      },
      {
        property: "og:description",
        content:
          "Visualize reliability scores, hallucination risk, and claim verification across runs.",
      },
    ],
  }),
  component: Dashboard,
});

// Read CSS custom properties so charts stay on-brand in any theme.
const COLORS = {
  trust: "hsl(152 70% 45%)",
  warn: "hsl(38 95% 55%)",
  danger: "hsl(0 75% 60%)",
  primary: "hsl(217 91% 60%)",
  muted: "hsl(220 14% 60%)",
};

function avg(nums: number[]) {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function Dashboard() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
    const onUpdate = () => setHistory(loadHistory());
    window.addEventListener("verimind:history-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("verimind:history-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const hasData = history.length > 0;

  // ----- Aggregates -----
  const allScores = history.map((h) => h.analysis.scores);
  const avgReliability = avg(allScores.map((s) => s.reliability));
  const avgRisk = avg(allScores.map((s) => s.hallucination_risk));
  const avgEvidence = avg(allScores.map((s) => s.evidence_coverage));
  const avgConsistency = avg(allScores.map((s) => s.reasoning_consistency));

  const totalClaims = history.reduce(
    (acc, h) => acc + h.analysis.claims.length,
    0,
  );
  const totalFlags = history.reduce(
    (acc, h) => acc + h.analysis.hallucination_flags.length,
    0,
  );

  // Trend line — oldest → newest (reverse since history is newest-first).
  const trendData = [...history]
    .slice(0, 20)
    .reverse()
    .map((h, i) => ({
      run: `#${i + 1}`,
      Reliability: h.analysis.scores.reliability,
      "Hallucination Risk": h.analysis.scores.hallucination_risk,
      Evidence: h.analysis.scores.evidence_coverage,
    }));

  // Average radar.
  const radarData = [
    { dim: "Reliability", value: avgReliability },
    { dim: "Evidence", value: avgEvidence },
    { dim: "Consistency", value: avgConsistency },
    { dim: "Safety", value: 100 - avgRisk },
  ];

  // Evidence status distribution across all claims.
  const evidenceTallies = { supported: 0, partial: 0, unsupported: 0, unverifiable: 0 };
  for (const h of history) {
    for (const c of h.analysis.claims) {
      evidenceTallies[c.evidence_status] =
        (evidenceTallies[c.evidence_status] ?? 0) + 1;
    }
  }
  const evidencePie = [
    { name: "Supported", value: evidenceTallies.supported, fill: COLORS.trust },
    { name: "Partial", value: evidenceTallies.partial, fill: COLORS.warn },
    { name: "Unsupported", value: evidenceTallies.unsupported, fill: COLORS.danger },
    { name: "Unverifiable", value: evidenceTallies.unverifiable, fill: COLORS.muted },
  ].filter((d) => d.value > 0);

  // Hallucination severity tallies.
  const sev = { low: 0, medium: 0, high: 0 };
  for (const h of history) {
    for (const f of h.analysis.hallucination_flags) {
      sev[f.severity] = (sev[f.severity] ?? 0) + 1;
    }
  }
  const sevData = [
    { severity: "Low", count: sev.low, fill: COLORS.warn },
    { severity: "Medium", count: sev.medium, fill: COLORS.warn },
    { severity: "High", count: sev.high, fill: COLORS.danger },
  ];

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <header className="mb-8 flex flex-wrap items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Analyzer
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Reliability <span className="text-primary">Dashboard</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Aggregated reasoning health across {history.length} run
            {history.length === 1 ? "" : "s"} (stored locally on this device).
          </p>
        </div>
        {hasData && (
          <button
            onClick={() => {
              if (confirm("Clear all analysis history?")) clearHistory();
            }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs text-danger transition hover:bg-danger/15"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear history
          </button>
        )}
      </header>

      {!hasData ? (
        <EmptyDashboard />
      ) : (
        <div className="space-y-6">
          {/* KPI cards */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Avg Reliability" value={avgReliability} tone="trust" icon={ShieldCheck} />
            <Kpi label="Avg Hallucination Risk" value={avgRisk} tone="danger" icon={AlertTriangle} invert />
            <Kpi label="Total Claims Audited" value={totalClaims} tone="primary" icon={Brain} raw />
            <Kpi label="Total Flags Raised" value={totalFlags} tone="warn" icon={Activity} raw />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Trend */}
            <ChartCard
              title="Score Trend"
              subtitle="Reliability vs. hallucination risk across recent runs"
            >
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border) / 0.4)" strokeDasharray="3 3" />
                  <XAxis dataKey="run" stroke={COLORS.muted} fontSize={11} />
                  <YAxis domain={[0, 100]} stroke={COLORS.muted} fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Reliability" stroke={COLORS.trust} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Hallucination Risk" stroke={COLORS.danger} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Evidence" stroke={COLORS.primary} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Radar */}
            <ChartCard
              title="Reasoning Health Profile"
              subtitle="Averaged across all runs (Safety = 100 − risk)"
            >
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="dim" stroke={COLORS.muted} fontSize={11} />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke={COLORS.primary}
                    fill={COLORS.primary}
                    fillOpacity={0.35}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Evidence pie */}
            <ChartCard
              title="Claim Evidence Distribution"
              subtitle={`Across ${totalClaims} extracted claims`}
            >
              {evidencePie.length === 0 ? (
                <Placeholder text="No claims recorded yet." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={evidencePie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={2}
                    >
                      {evidencePie.map((e, i) => (
                        <Cell key={i} fill={e.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Severity bar */}
            <ChartCard
              title="Hallucination Severity"
              subtitle={`${totalFlags} total flag${totalFlags === 1 ? "" : "s"} raised`}
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={sevData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border) / 0.4)" strokeDasharray="3 3" />
                  <XAxis dataKey="severity" stroke={COLORS.muted} fontSize={11} />
                  <YAxis allowDecimals={false} stroke={COLORS.muted} fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {sevData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Recent runs table */}
          <section className="rounded-2xl border border-border bg-surface/70 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Runs
            </h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Question</th>
                    <th className="py-2 pr-4">Model</th>
                    <th className="py-2 pr-4 text-right">Rel.</th>
                    <th className="py-2 pr-4 text-right">Risk</th>
                    <th className="py-2 text-right">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 10).map((h) => (
                    <tr key={h.id} className="border-t border-border/60">
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {new Date(h.analyzedAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 max-w-[280px] truncate text-foreground">
                        {h.question}
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {h.model.split("/").pop()}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-trust">
                        {h.analysis.scores.reliability}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-danger">
                        {h.analysis.scores.hallucination_risk}
                      </td>
                      <td className="py-2 text-right tabular-nums text-warn">
                        {h.analysis.hallucination_flags.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Kpi({
  label,
  value,
  tone,
  icon: Icon,
  invert = false,
  raw = false,
}: {
  label: string;
  value: number;
  tone: "trust" | "warn" | "danger" | "primary";
  icon: typeof ShieldCheck;
  invert?: boolean;
  raw?: boolean;
}) {
  const toneCls = {
    trust: "text-trust",
    warn: "text-warn",
    danger: "text-danger",
    primary: "text-primary",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-surface/60 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${toneCls}`} />
      </div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${toneCls}`}>
        {value}
        {!raw && <span className="text-sm text-muted-foreground">/100</span>}
      </div>
      {invert && (
        <p className="mt-1 text-xs text-muted-foreground">Lower is safer</p>
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      )}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-12 text-center">
      <Brain className="mx-auto h-8 w-8 text-primary" />
      <h2 className="mt-3 text-lg font-semibold text-foreground">
        No analyses yet
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Run a VeriMind analysis from the Analyzer page. Each run is stored
        locally and visualized here as reliability and hallucination trends.
      </p>
      <Link
        to="/"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        <Brain className="h-4 w-4" /> Go to Analyzer
      </Link>
    </div>
  );
}
