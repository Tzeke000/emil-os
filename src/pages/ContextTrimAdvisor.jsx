import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Brain, TrendingDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

function estimateTokens(text) {
  return Math.round((text || "").length / 4);
}

const IMPORTANCE_WEIGHT = { critical: 1.0, high: 0.8, medium: 0.5, low: 0.2 };

export default function ContextTrimAdvisor() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: memories = [] } = useQuery({
    queryKey: ["memoriesForTrim"],
    queryFn: () => base44.entities.MemoryRecord.list("-created_date", 200),
    staleTime: 60000,
  });

  const { data: truthFiles = [] } = useQuery({
    queryKey: ["truthFilesForTrim"],
    queryFn: () => base44.entities.TruthFile.list("-created_date", 50),
    staleTime: 60000,
  });

  // Score each memory by token cost vs importance
  const scored = memories.map(m => {
    const tokens = estimateTokens(m.content || m.memory || "");
    const importance = m.importance || "medium";
    const weight = IMPORTANCE_WEIGHT[importance] || 0.5;
    const wasteScore = Math.round(tokens * (1 - weight));
    return { ...m, tokens, wasteScore, importance };
  }).sort((a, b) => b.wasteScore - a.wasteScore);

  const totalMemoryTokens = scored.reduce((s, m) => s + m.tokens, 0);
  const totalFileTokens = truthFiles.reduce((s, f) => s + estimateTokens(f.content), 0);
  const totalTokens = totalMemoryTokens + totalFileTokens;

  const topWaste = scored.slice(0, 10);
  const trimCandidates = scored.filter(m => m.wasteScore > 200);

  const runAnalysis = async () => {
    setLoading(true);
    const topSnippets = topWaste.slice(0, 5).map(m =>
      `Title: ${m.title || m.category || "unknown"} | Importance: ${m.importance} | Est tokens: ${m.tokens}`
    ).join("\n");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Emil is an AI agent on Ollama. Her context window is limited. Here are her top 5 most token-heavy memory records:\n\n${topSnippets}\n\nGive 3 specific, actionable recommendations to reduce her total context size without losing critical information. Each recommendation should name the specific record or type and say what to do (e.g., compress, archive, split, summarize). Max 120 words total.`,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                record: { type: "string" },
                action: { type: "string" },
                reason: { type: "string" },
                tokens_saved: { type: "number" },
              },
            },
          },
        },
      },
    });
    setAnalysis(res);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-1">
        <Brain className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Context Efficiency</span>
      </div>
      <h1 className="text-xl font-bold text-foreground mb-0.5">Context Trim Advisor</h1>
      <p className="text-sm text-muted-foreground mb-5">Surface which memories and truth files are burning the most tokens relative to their importance.</p>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-mono text-foreground">{totalMemoryTokens.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Memory tokens (est.)</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-mono text-foreground">{totalFileTokens.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Truth file tokens (est.)</p>
        </div>
        <div className={cn("border rounded-xl p-4 text-center", trimCandidates.length > 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-card border-border")}>
          <p className={cn("text-2xl font-bold font-mono", trimCandidates.length > 0 ? "text-amber-400" : "text-foreground")}>{trimCandidates.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Trim candidates</p>
        </div>
      </div>

      {/* AI Recommendations */}
      {analysis?.recommendations && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-5 space-y-3">
          <p className="text-xs text-primary font-semibold uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> AI Recommendations
          </p>
          {analysis.recommendations.map((r, i) => (
            <div key={i} className="bg-card rounded-lg px-3 py-2.5 border border-border">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.record}</p>
                  <p className="text-xs text-primary font-mono mt-0.5 capitalize">{r.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.reason}</p>
                </div>
                {r.tokens_saved > 0 && (
                  <span className="text-xs font-mono text-emerald-400 font-bold whitespace-nowrap">−{r.tokens_saved} tokens</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Top Token-Heavy Memories ({topWaste.length})
        </p>
        <Button size="sm" className="gap-1.5" disabled={loading || memories.length === 0} onClick={runAnalysis}>
          {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing…</> : <><Sparkles className="w-3.5 h-3.5" /> Run AI Analysis</>}
        </Button>
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-card divide-y divide-border/60">
        {memories.length === 0 && (
          <p className="text-center py-12 text-sm text-muted-foreground font-mono">— no memories loaded —</p>
        )}
        {topWaste.map((m, i) => (
          <div key={m.id} className="flex items-center gap-4 px-5 py-3">
            <span className="text-xs font-mono text-muted-foreground/40 w-5">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{m.title || m.category || "Untitled memory"}</p>
              <p className="text-xs text-muted-foreground capitalize">{m.importance || "medium"} importance</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono font-bold text-foreground">{m.tokens.toLocaleString()} tokens</p>
              {m.wasteScore > 200 && (
                <p className="text-xs text-amber-400 font-mono">waste score {m.wasteScore}</p>
              )}
            </div>
            {m.wasteScore > 400 && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}