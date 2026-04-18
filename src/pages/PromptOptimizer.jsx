import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Copy, ArrowRight, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const GOALS = [
  { value: "minimize_tokens", label: "Minimize tokens (most aggressive)" },
  { value: "preserve_clarity", label: "Preserve clarity, trim filler" },
  { value: "bullet_format", label: "Convert to bullet instructions" },
  { value: "system_prompt", label: "Rewrite as lean system prompt" },
];

function countTokensEst(text) {
  // rough: ~4 chars per token
  return Math.round((text || "").length / 4);
}

export default function PromptOptimizer() {
  const [original, setOriginal] = useState("");
  const [goal, setGoal] = useState("minimize_tokens");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const origTokens = countTokensEst(original);
  const resultTokens = result ? countTokensEst(result.optimized) : 0;
  const saved = origTokens - resultTokens;
  const pctSaved = origTokens > 0 ? Math.round((saved / origTokens) * 100) : 0;

  const optimize = async () => {
    if (!original.trim()) return;
    setLoading(true);
    setResult(null);
    const goalLabel = GOALS.find(g => g.value === goal)?.label || goal;
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a prompt compression specialist for a local AI agent called Emil running on Ollama (small models like llama3.1:8b). Every token costs compute and money.

Goal: ${goalLabel}

Rules:
- Remove all filler, repetition, and overly polite phrasing
- Keep every instruction that changes behavior
- Use imperative tense
- Never lose required output format instructions
- Output ONLY the optimized prompt, nothing else — no explanation, no preamble

Original prompt:
"""
${original}
"""`,
      response_json_schema: {
        type: "object",
        properties: {
          optimized: { type: "string" },
          changes_summary: { type: "string" },
        },
      },
    });
    setResult(res);
    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(result.optimized);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Token Savings</span>
      </div>
      <h1 className="text-xl font-bold text-foreground mb-0.5">Prompt Optimizer</h1>
      <p className="text-sm text-muted-foreground mb-6">Paste any prompt Emil uses. Get a leaner version that preserves intent but burns fewer tokens.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Original Prompt</Label>
            <span className="text-xs font-mono text-muted-foreground">~{origTokens} tokens</span>
          </div>
          <Textarea
            value={original}
            onChange={e => setOriginal(e.target.value)}
            placeholder="Paste Emil's current prompt here..."
            rows={14}
            className="font-mono text-sm bg-muted/20 resize-none"
          />
          <div>
            <Label className="text-xs text-muted-foreground">Optimization Goal</Label>
            <Select value={goal} onValueChange={setGoal}>
              <SelectTrigger className="mt-1 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GOALS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={optimize} disabled={loading || !original.trim()} className="w-full gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Optimizing…</> : <><Sparkles className="w-4 h-4" /> Optimize Prompt</>}
          </Button>
        </div>

        {/* Output */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Optimized Prompt</Label>
            {result && (
              <span className={cn("text-xs font-mono font-bold", pctSaved > 0 ? "text-emerald-400" : "text-muted-foreground")}>
                ~{resultTokens} tokens {pctSaved > 0 && `(−${pctSaved}% saved)`}
              </span>
            )}
          </div>
          <div className={cn(
            "rounded-lg border min-h-[14rem] p-3 font-mono text-sm whitespace-pre-wrap leading-relaxed",
            result ? "bg-card border-border text-foreground" : "bg-muted/10 border-dashed border-border/60 text-muted-foreground/40"
          )}>
            {result ? result.optimized : "Optimized version will appear here…"}
          </div>

          {result?.changes_summary && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5">
              <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-1">What changed</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{result.changes_summary}</p>
            </div>
          )}

          {result && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={copy}>
                <Copy className="w-3.5 h-3.5" /> Copy
              </Button>
              {pctSaved > 0 && (
                <div className="flex items-center gap-1.5 ml-2 text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">Saved ~{saved} tokens per call</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}