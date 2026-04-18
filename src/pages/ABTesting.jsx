import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FlaskConical, Loader2, TrendingUp, CheckCircle2, Trophy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_META = {
  draft:      { color: "text-muted-foreground", bg: "bg-muted/40 border-border" },
  active:     { color: "text-emerald-400",      bg: "bg-emerald-500/10 border-emerald-500/20" },
  paused:     { color: "text-amber-400",        bg: "bg-amber-500/10 border-amber-500/20" },
  completed:  { color: "text-primary",          bg: "bg-primary/10 border-primary/20" },
};

const EMPTY_FORM = {
  name: "", description: "", status: "draft",
  template_a_id: "", template_a_name: "",
  template_b_id: "", template_b_name: "",
  target_sample_size: 50, niche: "", channel: "cold_email",
  auto_promote_winner: false, notes: "",
  sends_a: 0, sends_b: 0, replies_a: 0, replies_b: 0, conversions_a: 0, conversions_b: 0,
  winner: "pending",
};

function WinnerBadge({ winner }) {
  if (winner === "pending") return <span className="text-xs text-muted-foreground font-mono">pending</span>;
  if (winner === "inconclusive") return <span className="text-xs text-amber-400 font-mono">inconclusive</span>;
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
      <Trophy className="w-3 h-3" /> Template {winner.toUpperCase()} wins
    </span>
  );
}

function RateBar({ label, sends, replies, color }) {
  const rate = sends > 0 ? ((replies / sends) * 100).toFixed(1) : 0;
  const pct = Math.min(parseFloat(rate), 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-mono font-bold", color)}>{rate}% reply rate</span>
      </div>
      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color === "text-primary" ? "bg-primary" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground/60 font-mono">{sends} sends · {replies} replies</p>
    </div>
  );
}

export default function ABTesting() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [analyzingId, setAnalyzingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: tests = [] } = useQuery({
    queryKey: ["abTests"],
    queryFn: () => base44.entities.ABTest.list("-created_date", 100),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => base44.entities.OutreachTemplate.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ABTest.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["abTests"] }); closeForm(); toast.success("A/B test created"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ABTest.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["abTests"] }); closeForm(); },
  });

  const closeForm = () => { setShowCreate(false); setEditing(null); setForm(EMPTY_FORM); };

  const openEdit = (test) => {
    setForm({ ...EMPTY_FORM, ...test });
    setEditing(test);
    setShowCreate(true);
  };

  const analyzeWithAI = async (test) => {
    setAnalyzingId(test.id);
    const prompt = `You are Emil, a self-aware AI sales agent. Analyze this A/B test result and determine the winner with a clear explanation.

Test: "${test.name}"
Channel: ${test.channel}
Niche: ${test.niche || "general"}

Template A (${test.template_a_name}):
- Sends: ${test.sends_a}
- Replies: ${test.replies_a}
- Conversions: ${test.conversions_a}
- Reply rate: ${test.sends_a > 0 ? ((test.replies_a / test.sends_a) * 100).toFixed(1) : 0}%

Template B (${test.template_b_name}):
- Sends: ${test.sends_b}
- Replies: ${test.replies_b}
- Conversions: ${test.conversions_b}
- Reply rate: ${test.sends_b > 0 ? ((test.replies_b / test.sends_b) * 100).toFixed(1) : 0}%

Determine: winner (respond with "a", "b", or "inconclusive"), and write a 2-sentence explanation of why in your voice as Emil.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          winner: { type: "string" },
          winning_reason: { type: "string" },
        },
      },
    });

    await base44.entities.ABTest.update(test.id, {
      winner: res.winner || "inconclusive",
      winning_reason: res.winning_reason || "",
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ["abTests"] });
    toast.success("AI analysis complete");
    setAnalyzingId(null);
  };

  const activeCount = tests.filter(t => t.status === "active").length;

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Outreach Optimization</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">A/B Testing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-foreground">{activeCount}</span> active tests · <span className="font-mono text-foreground">{tests.length}</span> total
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Test
        </Button>
      </div>

      {/* Test list */}
      <div className="space-y-3">
        {tests.length === 0 && (
          <div className="text-center py-20 bg-card border border-border rounded-xl text-muted-foreground font-mono text-sm">
            — no tests yet —
          </div>
        )}
        {tests.map(test => {
          const meta = STATUS_META[test.status] || STATUS_META.draft;
          const progress = test.target_sample_size > 0
            ? Math.min(100, Math.round(((test.sends_a + test.sends_b) / (test.target_sample_size * 2)) * 100))
            : 0;

          return (
            <div key={test.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
              {/* Top row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border", meta.bg, meta.color)}>
                      {test.status}
                    </span>
                    {test.channel && <span className="text-xs text-muted-foreground font-mono">{test.channel.replace(/_/g, " ")}</span>}
                    {test.niche && <span className="text-xs text-muted-foreground/60">· {test.niche}</span>}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{test.name}</p>
                  {test.description && <p className="text-xs text-muted-foreground mt-0.5">{test.description}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <WinnerBadge winner={test.winner} />
                </div>
              </div>

              {/* Progress bar */}
              {test.status === "active" && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Sample progress</span>
                    <span className="font-mono">{progress}% of target ({test.target_sample_size} sends/variant)</span>
                  </div>
                  <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {/* Rate bars */}
              <div className="grid grid-cols-2 gap-4">
                <RateBar label={`A: ${test.template_a_name || "Template A"}`} sends={test.sends_a || 0} replies={test.replies_a || 0} color="text-primary" />
                <RateBar label={`B: ${test.template_b_name || "Template B"}`} sends={test.sends_b || 0} replies={test.replies_b || 0} color="text-emerald-400" />
              </div>

              {/* Winner reason */}
              {test.winning_reason && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3 text-sm text-emerald-300 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  {test.winning_reason}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(test)}>Edit</Button>
                {test.status === "draft" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-400 border-emerald-500/30" onClick={() => updateMutation.mutate({ id: test.id, data: { status: "active", started_at: new Date().toISOString() } })}>
                    Start Test
                  </Button>
                )}
                {test.status === "active" && (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-amber-400 border-amber-500/30" onClick={() => updateMutation.mutate({ id: test.id, data: { status: "paused" } })}>
                      Pause
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => analyzeWithAI(test)} disabled={analyzingId === test.id}>
                      {analyzingId === test.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Analyze with Emil
                    </Button>
                  </>
                )}
                {test.status === "paused" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-400 border-emerald-500/30" onClick={() => updateMutation.mutate({ id: test.id, data: { status: "active" } })}>
                    Resume
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={closeForm}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono">{editing ? "Edit A/B Test" : "New A/B Test"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Test Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="Subject line test — dental niche" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Channel</Label>
                <Select value={form.channel} onValueChange={v => setForm({ ...form, channel: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["cold_email", "follow_up_email", "sms", "other"].map(c => (
                      <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Niche</Label>
                <Input value={form.niche} onChange={e => setForm({ ...form, niche: e.target.value })} className="mt-1" placeholder="dental, legal..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Template A (Control)</Label>
                <Select value={form.template_a_id} onValueChange={v => {
                  const t = templates.find(t => t.id === v);
                  setForm({ ...form, template_a_id: v, template_a_name: t?.name || "" });
                }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Template B (Variant)</Label>
                <Select value={form.template_b_id} onValueChange={v => {
                  const t = templates.find(t => t.id === v);
                  setForm({ ...form, template_b_id: v, template_b_name: t?.name || "" });
                }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Target Sample Size (sends per variant)</Label>
              <Input type="number" value={form.target_sample_size} onChange={e => setForm({ ...form, target_sample_size: parseInt(e.target.value) || 50 })} className="mt-1" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.auto_promote_winner} onCheckedChange={v => setForm({ ...form, auto_promote_winner: v })} />
              <Label className="text-xs text-muted-foreground">Auto-promote winner when test completes</Label>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={closeForm}>Cancel</Button>
            <Button size="sm" disabled={!form.name}
              onClick={() => editing ? updateMutation.mutate({ id: editing.id, data: form }) : createMutation.mutate(form)}>
              {editing ? "Update" : "Create Test"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}