import type { VeriMindAnalysis } from "@/lib/api/verimind.functions";

export type HistoryEntry = {
  id: string;
  question: string;
  model: string;
  analyzedAt: string;
  analysis: VeriMindAnalysis;
};

const KEY = "verimind:history:v1";
const MAX = 50;

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistoryEntry(entry: HistoryEntry) {
  if (typeof window === "undefined") return;
  const all = [entry, ...loadHistory()].slice(0, MAX);
  window.localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent("verimind:history-updated"));
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("verimind:history-updated"));
}
