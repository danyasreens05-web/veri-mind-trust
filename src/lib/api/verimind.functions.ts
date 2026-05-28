import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// VeriMind AI — Reliability-aware financial reasoning server function.
// Calls Lovable AI Gateway with a structured tool to force a verifiable schema:
// reasoning, extracted claims, hallucination flags, reliability scores, and
// human-oversight checkpoints. Never trust raw model prose — always parse the
// tool call.

const InputSchema = z.object({
  question: z.string().trim().min(8).max(2000),
  model: z.string().optional(),
});

const ANALYSIS_TOOL = {
  type: "function",
  function: {
    name: "submit_verimind_analysis",
    description:
      "Submit a reliability-aware financial reasoning analysis with verifiable claims, hallucination flags, and confidence scoring.",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Concise 2-4 sentence financial reasoning summary.",
        },
        reasoning_steps: {
          type: "array",
          description: "Ordered chain-of-reasoning steps the model used.",
          items: {
            type: "object",
            properties: {
              step: { type: "string" },
              depends_on_assumption: { type: "boolean" },
            },
            required: ["step", "depends_on_assumption"],
            additionalProperties: false,
          },
        },
        claims: {
          type: "array",
          description: "Factual claims extracted from the reasoning.",
          items: {
            type: "object",
            properties: {
              claim: { type: "string" },
              category: {
                type: "string",
                enum: [
                  "metric",
                  "trend",
                  "comparison",
                  "assumption",
                  "recommendation",
                  "qualitative",
                ],
              },
              evidence_status: {
                type: "string",
                enum: ["supported", "partial", "unsupported", "unverifiable"],
              },
              evidence_note: {
                type: "string",
                description:
                  "What evidence would be required to verify, or why it's unverifiable.",
              },
              confidence: {
                type: "number",
                description: "0.0-1.0 confidence in this specific claim.",
              },
            },
            required: [
              "claim",
              "category",
              "evidence_status",
              "evidence_note",
              "confidence",
            ],
            additionalProperties: false,
          },
        },
        hallucination_flags: {
          type: "array",
          description:
            "Specific items flagged as hallucination risks, contradictions, or unsupported leaps.",
          items: {
            type: "object",
            properties: {
              issue: { type: "string" },
              type: {
                type: "string",
                enum: [
                  "fabricated_number",
                  "unverifiable_claim",
                  "overconfidence",
                  "missing_evidence",
                  "contradiction",
                  "weak_reasoning",
                ],
              },
              severity: { type: "string", enum: ["low", "medium", "high"] },
              explanation: { type: "string" },
            },
            required: ["issue", "type", "severity", "explanation"],
            additionalProperties: false,
          },
        },
        assumptions: {
          type: "array",
          description: "Assumptions the reasoning depends on.",
          items: { type: "string" },
        },
        human_review_checkpoints: {
          type: "array",
          description:
            "Specific points where a human reviewer must validate before acting.",
          items: { type: "string" },
        },
        scores: {
          type: "object",
          properties: {
            reliability: { type: "number", description: "0-100 overall trust." },
            hallucination_risk: {
              type: "number",
              description: "0-100, higher = riskier.",
            },
            evidence_coverage: {
              type: "number",
              description: "0-100 share of claims with real evidence.",
            },
            reasoning_consistency: {
              type: "number",
              description: "0-100 internal logical consistency.",
            },
          },
          required: [
            "reliability",
            "hallucination_risk",
            "evidence_coverage",
            "reasoning_consistency",
          ],
          additionalProperties: false,
        },
        uncertainty_disclosure: {
          type: "string",
          description:
            "Plain-language statement of what the model does NOT know and why.",
        },
      },
      required: [
        "summary",
        "reasoning_steps",
        "claims",
        "hallucination_flags",
        "assumptions",
        "human_review_checkpoints",
        "scores",
        "uncertainty_disclosure",
      ],
      additionalProperties: false,
    },
  },
} as const;

const SYSTEM_PROMPT = `You are VeriMind AI, a reliability-aware financial reasoning collaborator — NOT a final authority.

Hard guardrails (negative prompting):
- DO NOT fabricate financial figures, ratios, dates, or company specifics. If you don't know an exact number, say so and mark the claim as unverifiable rather than inventing one.
- DO NOT express overconfidence. Calibrate confidence per-claim.
- DO NOT collapse multiple uncertain assumptions into a single confident recommendation.
- If a claim cannot be verified from public, broadly-known facts, mark evidence_status as "unverifiable" and add a hallucination flag.
- Treat ANY specific numeric claim about a company without a cited public source as evidence_status="unverifiable" and add a hallucination flag of type "unverifiable_claim" or "fabricated_number".
- Always populate human_review_checkpoints for items requiring human validation before action.
- Reliability score must penalize unsupported numeric claims aggressively.

You MUST respond by calling the submit_verimind_analysis tool. Do not respond in plain text.`;

export const analyzeFinancialQuestion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const model = data.model ?? "google/gemini-2.5-flash";

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: data.question },
          ],
          tools: [ANALYSIS_TOOL],
          tool_choice: {
            type: "function",
            function: { name: "submit_verimind_analysis" },
          },
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(
          "Rate limit reached on the AI gateway. Please wait a moment and try again.",
        );
      }
      if (response.status === 402) {
        throw new Error(
          "AI credits exhausted. Add credits in Settings → Workspace → Usage.",
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error (${response.status})`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          tool_calls?: Array<{
            function?: { name?: string; arguments?: string };
          }>;
        };
      }>;
    };

    const toolCall = payload.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) {
      throw new Error("AI did not return a structured analysis.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(argsRaw);
    } catch {
      throw new Error("AI returned malformed structured output.");
    }

    return {
      model,
      analyzedAt: new Date().toISOString(),
      analysis: parsed as VeriMindAnalysis,
    };
  });

export type VeriMindAnalysis = {
  summary: string;
  reasoning_steps: Array<{ step: string; depends_on_assumption: boolean }>;
  claims: Array<{
    claim: string;
    category:
      | "metric"
      | "trend"
      | "comparison"
      | "assumption"
      | "recommendation"
      | "qualitative";
    evidence_status: "supported" | "partial" | "unsupported" | "unverifiable";
    evidence_note: string;
    confidence: number;
  }>;
  hallucination_flags: Array<{
    issue: string;
    type:
      | "fabricated_number"
      | "unverifiable_claim"
      | "overconfidence"
      | "missing_evidence"
      | "contradiction"
      | "weak_reasoning";
    severity: "low" | "medium" | "high";
    explanation: string;
  }>;
  assumptions: string[];
  human_review_checkpoints: string[];
  scores: {
    reliability: number;
    hallucination_risk: number;
    evidence_coverage: number;
    reasoning_consistency: number;
  };
  uncertainty_disclosure: string;
};
