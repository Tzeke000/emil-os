import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, TrendingDown, Plus, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const WASTE_TYPES = [
  { value: "redundant_context", label: "Redundant context injected" },
  { value: "verbose_prompt", label: "Prompt too verbose" },
  { value: "unnecessary_reasoning", label: "Unnecessary chain-of-thought" },
  { value: "wrong_model", label: "Overkill model used" },
  { value: "repeated_memory", label: "Same memory injected multiple times" },
  { value: "other", label: "Other" },
];

const SEVERITY = {
  low:    { color: "text-muted-foreground", bg: "bg-muted/30" },
  medium: { color: "text-amber-400",        bg: "bg-amber-500/10 border border-amber-500/20" },
  high:   { color: "text-red-400",          bg: "bg-red-500/10 border border-red-500/20" },
};

const EMPTY = { module: "", task_name: "", waste_type: "verbose_prompt", tokens_wasted: "", description: "", fix_applied: "", severity: "medium" };

export default function TokenWastePage() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [analyzing, setAnalyzing] = useState(null);
  const [suggestion, setSuggestion] = useState({});
  const queryClient = useQueryClient();

  // Reuse RuntimeLog entity — filter for warning/error logs and surface them here
  const { data: runtimeLogs = [] } = useQuery({
    queryKey: ["runtimeLogsWaste"],
    queryFn: () => base44.entities.RuntimeLog.list("-created_date", 300),
    staleTime: 60000,
  });

  // Token waste logs = warning + error logs that have token data
  const wasteLogs = runtimeLogs.filter(l => (l.level === "warning" || l.level === "error") && (l.tokens_used > 0 || l.message));

  // Manual waste entries stored as RuntimeLog with source="system", level="warning", module tagged
  const manualEntries = runtimeLogs.filter(l => l.source === "system" && l.level === "warning" && l.details?.startsWith("WASTE:"));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RuntimeLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runtimeLogsWaste"] });
      setShowAdd(false);
      setForm(EMPTY);
      toast.success("Waste entry logged");
    },
  });

  const handleAdd = () => {
    createMutation.mutate({
      level: "warning",
      source: "system",
      module: form.module,
      task_name: form.task_name,
      message: `[${WASTE_TYPES.find(w => w.value === form.waste_type)?.label}] ${form.description}`,
      details: `WASTE: type=${form.waste_type} | fix=${form.fix_applied || "none"}`,
      tokens_used: parseInt(form.tokens_wasted) || 0,
    });
  };

  const getSuggestion = async (log) => {
    setAnalyzing(log.id);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Emil is an AI agent running on Ollama. A token waste event was recorded:\n\nModule: ${log.module || "unknown"}\nTask: ${log.task_name || "none"}\nMessage: ${log.message}\nTokens wasted: ${log.tokens_used || 0}\n\nSuggest a specific, concrete fix Emil can apply to prevent this waste in future runs. Max 60 words. Be direct.`,
    });
    setSuggestion(s => ({ ...s, [log.id]: res }));
    setAnalyzing(null);
  };

  const totalWastedTokens = wasteLogs.reduce((s, l) => s + (l.tokens_used || 0), 0);

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Efficiency</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Token Waste Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track and learn from inefficient runs.{" "}
            {totalWastedTokens > 0 && (
              <span className="text-amber-400 font-mono font-semibold">{totalWastedTokens.toLocaleString()} tokens</span>
            )}
            {totalWastedTokens > 0 && <span className="text-muted-foreground"> wasted in last 300 logs.</span>}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Log Waste Event
        </Button>
      </div>

      {/* Waste entries */}
      <div className="border border-border rounded-xl overflow-hidden bg-card divide-y divide-border/60">
        {wasteLogs.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground font-mono">— no waste events recorded —</div>
        )}
        {wasteLogs.map(log => (
          <div key={log.id} className="px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {log.module && <span className="text-xs font-semibold text-primary font-mono">{log.module}</span>}
                  {log.task_name && <span className="text-xs text-muted-foreground truncate">→ {log.task_name}</span>}
                  {log.tokens_used > 0 && (
                    <span className="ml-auto text-xs font-mono font-bold text-amber-400">{log.tokens_used.toLocaleString()} tokens</span>
                  )}
                </div>
                <p className="text-sm text-foreground">{log.message}</p>
                {log.details && !log.details.startsWith("WASTE:") && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{log.details}</p>
                )}

                {/* AI Suggestion */}
                {suggestion[log.id] && (
                  <div className="mt-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                    <p className="text-xs text-primary font-semibold mb-0.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Fix Suggestion
                    </p>
                    <p className="text-xs text-foreground leading-relaxed">{suggestion[log.id]}</p>
                  </div>
                )}

                {!suggestion[log.id] && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1.5 h-6 text-xs gap-1 text-primary px-0"
                    disabled={analyzing === log.id}
                    onClick={() => getSuggestion(log)}
                  >
                    {analyzing === log.id
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing…</>
                      : <><Sparkles className="w-3 h-3" /> Get fix suggestion</>
                    }
                  </Button>
                )}
              </div>
              <span className="text-xs font-mono text-muted-foreground/40 flex-shrink-0 mt-0.5">
                {log.created_date ? format(new Date(log.created_date), "MMM d HH:mm") : ""}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono">Log Waste Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Module</Label>
                <Input value={form.module} onChange={e => setForm({ ...form, module: e.target.value })} className="mt-1" placeholder="outreach_writer" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Task (optional)</Label>
                <Input value={form.task_name} onChange={e => setForm({ ...form, task_name: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Waste Type</Label>
              <Select value={form.waste_type} onValueChange={v => setForm({ ...form, waste_type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{WASTE_TYPES.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tokens Wasted (est.)</Label>
              <Input type="number" value={form.tokens_wasted} onChange={e => setForm({ ...form, tokens_wasted: e.target.value })} className="mt-1" placeholder="0" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" rows={3} placeholder="What made this run wasteful?" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fix Applied (optional)</Label>
              <Input value={form.fix_applied} onChange={e => setForm({ ...form, fix_applied: e.target.value })} className="mt-1" placeholder="Shortened system prompt by 40%" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={!form.description}>Log It</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}