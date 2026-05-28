import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Brain, Loader2, ShieldCheck, Zap } from "lucide-react";

import {
  analyzeFinancialQuestion,
  type VeriMindAnalysis,
} from "@/lib/api/verimind.functions";
import { AnalysisReport } from "@/components/verimind/AnalysisReport";
import { saveHistoryEntry } from "@/lib/verimind-history";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VeriMind AI — Reliability-Aware Financial Reasoning" },
      {
        name: "description",
        content:
          "Hallucination-aware AI framework for trustworthy financial reasoning. Extracts claims, scores reliability, and flags human-review checkpoints.",
      },
      {
        property: "og:title",
        content: "VeriMind AI — Reliability-Aware Financial Reasoning",
      },
      {
        property: "og:description",
        content:
          "Treats AI as a reasoning collaborator. Verifies claims, detects hallucinations, scores confidence.",
      },
    ],
  }),
  component: Home,
});

const EXAMPLES = [
  "Analyze whether NVIDIA is financially healthy heading into 2026.",
  "Is a 60/40 portfolio still appropriate in a high-rate environment?",
  "Summarize the key risks of investing in mid-cap Indian IT services firms.",
];

const MODELS = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash · balanced" },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite · efficient" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro · heaviest reasoning" },
];

function Home() {
  const analyze = useServerFn(analyzeFinancialQuestion);
  const [question, setQuestion] = useState("");
  const [model, setModel] = useState(MODELS[0].id);

  const mutation = useMutation({
    mutationFn: (input: { question: string; model: string }) =>
      analyze({ data: input }),
    onSuccess: (data, vars) => {
      const r = data as {
        model: string;
        analyzedAt: string;
        analysis: VeriMindAnalysis;
      };
      saveHistoryEntry({
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : String(Date.now()),
        question: vars.question,
        model: r.model,
        analyzedAt: r.analyzedAt,
        analysis: r.analysis,
      });
    },
  });

  const result = mutation.data as
    | { model: string; analyzedAt: string; analysis: VeriMindAnalysis }
    | undefined;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim().length < 8) return;
    mutation.mutate({ question: question.trim(), model });
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:py-16">
      {/* Header */}
      <header className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-wider text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          Reliability-aware reasoning framework
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          VeriMind <span className="text-primary">AI</span>
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
          A hallucination-aware AI workflow for financial and educational
          decision support. It treats the model as a{" "}
          <span className="text-foreground">reasoning collaborator</span> — not
          a final authority — by extracting claims, scoring evidence, and
          surfacing human-review checkpoints.
        </p>
        <ul className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {[
            "Claim extraction",
            "Evidence verification",
            "Hallucination detection",
            "Confidence scoring",
            "Human oversight",
            "Negative prompting",
          ].map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-border bg-surface/60 px-2.5 py-1"
            >
              {tag}
            </li>
          ))}
        </ul>
      </header>

      {/* Input */}
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-border bg-surface/80 p-5 shadow-2xl shadow-black/40 backdrop-blur"
      >
        <label
          htmlFor="q"
          className="text-xs uppercase tracking-wider text-muted-foreground"
        >
          Financial question or AI output to audit
        </label>
        <textarea
          id="q"
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, 2000))}
          placeholder="e.g. Analyze whether Company X is financially healthy."
          rows={4}
          className="mt-2 w-full resize-y rounded-xl border border-input bg-background/60 p-3 text-foreground outline-none ring-ring placeholder:text-muted-foreground/70 focus:ring-2"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-lg border border-input bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            {question.length}/2000
          </span>

          <button
            type="submit"
            disabled={mutation.isPending || question.trim().length < 8}
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Reasoning…
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" /> Run VeriMind Analysis
              </>
            )}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setQuestion(ex)}
              className="rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-foreground/80 transition hover:border-primary/40 hover:text-foreground"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {/* Output */}
      <section className="mt-8">
        {mutation.isError && (
          <div className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
            {(mutation.error as Error).message}
          </div>
        )}

        {mutation.isPending && !result && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-border bg-surface/50"
              />
            ))}
          </div>
        )}

        {result && (
          <AnalysisReport result={result.analysis} model={result.model} />
        )}

        {!result && !mutation.isPending && !mutation.isError && (
          <EmptyState />
        )}
      </section>

      <footer className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
        <p>
          VeriMind AI · A reliability-aware reasoning framework. Outputs are
          decision support, not financial advice. Always validate at human
          review checkpoints.
        </p>
      </footer>
    </main>
  );
}

function EmptyState() {
  const steps = [
    {
      icon: Brain,
      title: "1 · Reasoning Layer",
      desc: "LLM generates summary, risks, assumptions, and recommendations.",
    },
    {
      icon: ShieldCheck,
      title: "2 · Claim & Verification",
      desc: "Each factual claim is extracted, categorized, and tagged with evidence status.",
    },
    {
      icon: Zap,
      title: "3 · Hallucination Audit",
      desc: "Flags unverifiable numbers, overconfidence, contradictions, and weak chains.",
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {steps.map((s) => (
        <div
          key={s.title}
          className="rounded-2xl border border-border bg-surface/50 p-5"
        >
          <s.icon className="h-5 w-5 text-primary" />
          <h3 className="mt-3 text-sm font-semibold text-foreground">
            {s.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
        </div>
      ))}
    </div>
  );
}
