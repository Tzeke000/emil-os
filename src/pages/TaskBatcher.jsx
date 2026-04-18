import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Layers, Sparkles, Loader2, Check, ChevronRight, Zap, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const BATCH_TYPES = [
  {
    value: "score_prospects",
    label: "Score Prospects",
    description: "Score multiple prospects at once using a single prompt",
    entity: "Prospect",
    filter: (items) => items.filter(p => p.status === "found"),
    displayField: (p) => `${p.business_name}${p.niche ? ` · ${p.niche}` : ""}${p.city ? ` · ${p.city}` : ""}`,
    buildPrompt: (items, extra) => `You are Emil, an AI sales agent. Score each of the following prospects from 0–100 based on lead quality. Consider niche, location, and any notes. Be concise.\n\nScoring criteria:\n${extra || "- Is a local service business\n- Has a website\n- Niche is high-margin (dental, legal, home services, etc.)"}\n\nProspects:\n${items.map((p, i) => `${i + 1}. ${p.business_name} | Niche: ${p.niche || "unknown"} | City: ${p.city || "unknown"} | Website: ${p.website || "none"} | Notes: ${p.personalized_notes || "none"}`).join("\n")}\n\nReturn a JSON array of objects with: index (1-based), business_name, score (0-100), reason (max 15 words).`,
    resultSchema: { type: "object", properties: { results: { type: "array", items: { type: "object", properties: { index: { type: "number" }, business_name: { type: "string" }, score: { type: "number" }, reason: { type: "string" } } } } } },
    applyResults: async (items, results, queryClient) => {
      for (const r of results) {
        const prospect = items[r.index - 1];
        if (prospect) {
          await base44.entities.Prospect.update(prospect.id, { score: r.score, status: "scored", personalized_notes: prospect.personalized_notes ? `${prospect.personalized_notes}\nScore reason: ${r.reason}` : `Score reason: ${r.reason}` });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
  },
  {
    value: "classify_replies",
    label: "Classify Replies",
    description: "Classify multiple inbox replies in one shot",
    entity: "Reply",
    filter: (items) => items.filter(r => r.status === "new"),
    displayField: (r) => `${r.prospect_name || "Unknown"} · ${r.channel || "email"}`,
    buildPrompt: (items) => `You are Emil, an AI sales agent. Classify each of the following prospect replies. For each, determine: classification (interested / not_interested / needs_follow_up / price_objection / referral / spam / other), and a suggested_response (1 sentence, ready to send).\n\nReplies:\n${items.map((r, i) => `${i + 1}. From: ${r.prospect_name || "unknown"} | Channel: ${r.channel || "email"} | Body: "${r.body || r.content || "(empty)"}"`).join("\n")}\n\nReturn JSON array with: index, prospect_name, classification, suggested_response.`,
    resultSchema: { type: "object", properties: { results: { type: "array", items: { type: "object", properties: { index: { type: "number" }, prospect_name: { type: "string" }, classification: { type: "string" }, suggested_response: { type: "string" } } } } } },
    applyResults: async (items, results, queryClient) => {
      for (const r of results) {
        const reply = items[r.index - 1];
        if (reply) {
          await base44.entities.Reply.update(reply.id, { classification: r.classification, suggested_response: r.suggested_response, status: "reviewed" });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["replies"] });
    },
  },
  {
    value: "generate_followups",
    label: "Generate Follow-up Messages",
    description: "Write follow-up messages for multiple prospects at once",
    entity: "Prospect",
    filter: (items) => items.filter(p => ["contacted", "follow_up_due"].includes(p.status)),
    displayField: (p) => `${p.business_name}${p.niche ? ` · ${p.niche}` : ""}`,
    buildPrompt: (items, extra) => `You are Emil, an AI sales agent writing concise follow-up messages. Offer: ${extra || "AI-powered marketing automation for local service businesses"}.\n\nWrite a short, personalized follow-up message (2-3 sentences max) for each prospect below. Be direct and value-focused.\n\nProspects:\n${items.map((p, i) => `${i + 1}. ${p.business_name} | Niche: ${p.niche || "unknown"} | Notes: ${p.personalized_notes || "none"} | Last contacted: ${p.last_contacted_date || "unknown"}`).join("\n")}\n\nReturn JSON array with: index, business_name, message.`,
    resultSchema: { type: "object", properties: { results: { type: "array", items: { type: "object", properties: { index: { type: "number" }, business_name: { type: "string" }, message: { type: "string" } } } } } },
    applyResults: async (items, results, queryClient) => {
      // Results displayed only — no auto-write for messages
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
  },
];

function TokenSavingsBadge({ count }) {
  const saved = Math.max(0, count - 1);
  if (saved === 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
      <Zap className="w-3.5 h-3.5" />
      ~{saved} fewer LLM call{saved !== 1 ? "s" : ""} vs running individually
    </div>
  );
}

export default function TaskBatcher() {
  const [batchType, setBatchType] = useState("score_prospects");
  const [selectedIds, setSelectedIds] = useState([]);
  const [extraContext, setExtraContext] = useState("");
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const queryClient = useQueryClient();

  const { data: prospects = [] } = useQuery({ queryKey: ["prospects"], queryFn: () => base44.entities.Prospect.list("-created_date", 200) });
  const { data: replies = [] } = useQuery({ queryKey: ["replies"], queryFn: () => base44.entities.Reply.list("-created_date", 100) });

  const currentType = BATCH_TYPES.find(b => b.value === batchType);
  const allItems = batchType === "classify_replies" ? replies : prospects;
  const filteredItems = currentType ? currentType.filter(allItems) : [];
  const selectedItems = filteredItems.filter(item => selectedIds.includes(item.id));

  const toggleItem = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setResults(null);
    setApplied(false);
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(i => i.id));
    }
    setResults(null);
    setApplied(false);
  };

  const handleBatchTypeChange = (val) => {
    setBatchType(val);
    setSelectedIds([]);
    setResults(null);
    setApplied(false);
    setExtraContext("");
  };

  const runBatch = async () => {
    if (selectedItems.length === 0) return;
    setRunning(true);
    setResults(null);
    setApplied(false);
    const prompt = currentType.buildPrompt(selectedItems, extraContext);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: currentType.resultSchema,
    });
    setResults(res?.results || []);
    setRunning(false);
  };

  const applyResults = async () => {
    if (!results) return;
    setApplying(true);
    await currentType.applyResults(selectedItems, results, queryClient);
    setApplying(false);
    setApplied(true);
    toast.success(`Applied ${results.length} result${results.length !== 1 ? "s" : ""}`);
  };

  const estTokensSaved = selectedItems.length > 1 ? `~${Math.round(selectedItems.length * 0.6 * 300)} tokens saved vs ${selectedItems.length} individual calls` : null;

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Layers className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Efficiency</span>
      </div>
      <h1 className="text-xl font-bold text-foreground mb-0.5">Task Batcher</h1>
      <p className="text-sm text-muted-foreground mb-5">
        Group similar tasks into a single LLM call. Fewer prompts = fewer tokens = lower cost.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: configuration */}
        <div className="space-y-4">
          {/* Batch type selector */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Batch Operation</Label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {BATCH_TYPES.map(bt => (
                <button
                  key={bt.value}
                  onClick={() => handleBatchTypeChange(bt.value)}
                  className={cn(
                    "text-left rounded-lg border px-4 py-3 transition-all",
                    batchType === bt.value
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-card border-border hover:border-primary/20 text-foreground"
                  )}
                >
                  <p className="text-sm font-semibold">{bt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{bt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Extra context */}
          {(batchType === "score_prospects" || batchType === "generate_followups") && (
            <div>
              <Label className="text-xs text-muted-foreground">
                {batchType === "score_prospects" ? "Scoring Criteria (optional override)" : "Your Offer / Context"}
              </Label>
              <Textarea
                value={extraContext}
                onChange={e => setExtraContext(e.target.value)}
                className="mt-1 text-sm font-mono bg-muted/20 resize-none"
                rows={3}
                placeholder={batchType === "score_prospects"
                  ? "Leave blank to use default scoring rules…"
                  : "e.g. AI-powered lead gen for local dental practices — $500/mo retainer"
                }
              />
            </div>
          )}

          {/* Token savings estimate */}
          {selectedItems.length > 1 && (
            <div className="space-y-2">
              <TokenSavingsBadge count={selectedItems.length} />
              {estTokensSaved && (
                <p className="text-xs text-muted-foreground font-mono pl-1">{estTokensSaved}</p>
              )}
            </div>
          )}

          {/* Run button */}
          <Button
            onClick={runBatch}
            disabled={running || selectedItems.length === 0}
            className="w-full gap-2"
          >
            {running
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Running batch ({selectedItems.length} items)…</>
              : <><Sparkles className="w-4 h-4" /> Run Batch ({selectedItems.length} selected)</>
            }
          </Button>
        </div>

        {/* Right: item selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
              {currentType?.label} Queue
              <span className="ml-1.5 font-mono text-foreground normal-case tracking-normal">({filteredItems.length})</span>
            </Label>
            {filteredItems.length > 0 && (
              <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                {selectedIds.length === filteredItems.length ? "Deselect all" : "Select all"}
              </button>
            )}
          </div>

          <div className="border border-border rounded-xl overflow-hidden bg-card divide-y divide-border/60 max-h-80 overflow-y-auto">
            {filteredItems.length === 0 && (
              <p className="text-center py-10 text-sm text-muted-foreground font-mono">— no items in queue —</p>
            )}
            {filteredItems.map(item => (
              <label
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/20 transition-colors"
              >
                <Checkbox
                  checked={selectedIds.includes(item.id)}
                  onCheckedChange={() => toggleItem(item.id)}
                />
                <span className="text-sm text-foreground truncate">{currentType?.displayField(item)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {results && results.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Batch Results — {results.length} item{results.length !== 1 ? "s" : ""}
            </p>
            {!applied && (
              <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-500" onClick={applyResults} disabled={applying}>
                {applying
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Applying…</>
                  : <><Check className="w-3.5 h-3.5" /> Apply All Results</>
                }
              </Button>
            )}
            {applied && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Applied
              </span>
            )}
          </div>

          <div className="border border-border rounded-xl overflow-hidden bg-card divide-y divide-border/60">
            {results.map((r, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-4">
                <span className="text-xs font-mono text-muted-foreground/40 mt-0.5 w-4">{r.index || i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{r.business_name || r.prospect_name || `Item ${i + 1}`}</p>
                  {r.reason && <p className="text-xs text-muted-foreground mt-0.5">{r.reason}</p>}
                  {r.classification && (
                    <span className="inline-block mt-1 text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded capitalize">
                      {r.classification.replace(/_/g, " ")}
                    </span>
                  )}
                  {r.suggested_response && <p className="text-xs text-muted-foreground mt-1 italic">"{r.suggested_response}"</p>}
                  {r.message && <p className="text-xs text-foreground mt-1 bg-muted/30 rounded p-2">{r.message}</p>}
                </div>
                {r.score !== undefined && (
                  <span className={cn(
                    "text-lg font-bold font-mono flex-shrink-0",
                    r.score >= 80 ? "text-emerald-400" : r.score >= 60 ? "text-amber-400" : r.score >= 40 ? "text-primary" : "text-muted-foreground"
                  )}>
                    {r.score}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}