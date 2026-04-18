import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Wrench, CheckCircle2, XCircle, Clock, Zap, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const PROPOSAL_TYPES = ["new_module","model_change","rule_update","memory_change","system_improvement","other"];
const RISK_LEVELS = ["low","medium","high"];
const STATUSES = ["draft","pending_review","approved","rejected","implemented"];

const TYPE_META = {
  new_module:          { color: "text-sky-400",          bg: "bg-sky-500/10 border-sky-500/20" },
  model_change:        { color: "text-violet-400",        bg: "bg-violet-500/10 border-violet-500/20" },
  rule_update:         { color: "text-amber-400",         bg: "bg-amber-500/10 border-amber-500/20" },
  memory_change:       { color: "text-teal-400",          bg: "bg-teal-500/10 border-teal-500/20" },
  system_improvement:  { color: "text-emerald-400",       bg: "bg-emerald-500/10 border-emerald-500/20" },
  other:               { color: "text-muted-foreground",  bg: "bg-muted/50 border-border" },
};

const RISK_META = {
  low:    "text-emerald-400",
  medium: "text-amber-400",
  high:   "text-red-400",
};

const EMPTY_FORM = { title: "", proposal_type: "new_module", problem_noticed: "", proposed_change: "", why_it_matters: "", estimated_token_savings: 0, model_suggestion: "", risk_level: "low", requires_approval: true, status: "draft", review_notes: "" };

export default function Workbench() {
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const queryClient = useQueryClient();

  const { data: proposals = [] } = useQuery({
    queryKey: ["proposals"],
    queryFn: () => base44.entities.Proposal.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Proposal.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["proposals"] }); setShowCreate(false); setForm(EMPTY_FORM); toast.success("Proposal submitted"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Proposal.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["proposals"] }); setSelected(null); },
  });

  const decide = (id, status, review_notes = "") => {
    updateMutation.mutate({ id, data: { status, review_notes } });
    toast.success(`Status → ${status}`);
  };

  const filtered = proposals.filter(p => filter === "all" || p.status === filter);
  const pendingCount = proposals.filter(p => p.status === "pending_review").length;
  const totalSavings = proposals.filter(p => p.status === "implemented" && p.estimated_token_savings).reduce((a, p) => a + p.estimated_token_savings, 0);

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Self-Improvement Layer</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Workbench</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-foreground">{pendingCount}</span> pending review · <span className="font-mono text-foreground">{totalSavings.toLocaleString()}</span> tokens saved via implemented proposals
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Proposal
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {[["all","All",proposals.length], ...STATUSES.map(s => [s, s.replace(/_/g," "), proposals.filter(p => p.status === s).length])].map(([key, label, count]) => (
          <button key={key} onClick={() => setFilter(key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === key ? "bg-primary text-primary-foreground" : key === "pending_review" && count > 0 ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {label} {count > 0 && <span className="font-mono">{count}</span>}
          </button>
        ))}
      </div>

      {/* Proposal list */}
      <div className="border border-border rounded-xl overflow-hidden bg-card divide-y divide-border/60">
        {filtered.length === 0 && <div className="text-center py-16 text-sm text-muted-foreground font-mono">— no proposals —</div>}
        {filtered.map(p => {
          const meta = TYPE_META[p.proposal_type] || TYPE_META.other;
          return (
            <button key={p.id} onClick={() => setSelected(p)} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/10 text-left group transition-colors">
              <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border flex-shrink-0 ${meta.bg} ${meta.color}`}>
                {p.proposal_type?.replace(/_/g," ")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{p.title}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{p.problem_noticed}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                {p.risk_level && <span className={`font-medium ${RISK_META[p.risk_level]}`}>{p.risk_level} risk</span>}
                {p.estimated_token_savings > 0 && <span className="font-mono text-emerald-400">-{p.estimated_token_savings.toLocaleString()} tok</span>}
                <span className={`px-2 py-0.5 rounded font-medium capitalize ${p.status === "approved" || p.status === "implemented" ? "text-emerald-400 bg-emerald-500/10" : p.status === "pending_review" ? "text-amber-400 bg-amber-500/10" : p.status === "rejected" ? "text-red-400 bg-red-500/10" : "text-muted-foreground bg-muted/50"}`}>
                  {p.status?.replace(/_/g," ")}
                </span>
                {p.created_date && <span className="text-muted-foreground/50 font-mono">{format(new Date(p.created_date), "MMM d")}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-xl bg-card max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-sm">{selected?.title}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="flex gap-2 flex-wrap">
                {(() => { const meta = TYPE_META[selected.proposal_type] || TYPE_META.other; return <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${meta.bg} ${meta.color}`}>{selected.proposal_type?.replace(/_/g," ")}</span>; })()}
                {selected.risk_level && <span className={`text-xs font-medium ${RISK_META[selected.risk_level]}`}>{selected.risk_level} risk</span>}
                {selected.model_suggestion && <code className="text-xs bg-muted px-2 py-0.5 rounded border border-border">{selected.model_suggestion}</code>}
              </div>
              {[["Problem Noticed", selected.problem_noticed], ["Proposed Change", selected.proposed_change], ["Why It Matters", selected.why_it_matters]].map(([k,v]) => v ? (
                <div key={k}>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1.5">{k}</p>
                  <p className="text-sm bg-muted/30 rounded-lg px-3 py-2">{v}</p>
                </div>
              ) : null)}
              {selected.estimated_token_savings > 0 && (
                <div className="flex items-center gap-2 text-emerald-400">
                  <Zap className="w-3.5 h-3.5" />
                  <span className="text-sm font-mono">~{selected.estimated_token_savings.toLocaleString()} tokens saved</span>
                </div>
              )}
              {selected.review_notes && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Review Notes</p>
                  <p className="text-sm">{selected.review_notes}</p>
                </div>
              )}
              {selected.status === "pending_review" && (
                <div className="flex gap-2 pt-2 border-t border-border flex-wrap">
                  <Button size="sm" onClick={() => decide(selected.id, "approved")}><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => decide(selected.id, "implemented")}>Mark Implemented</Button>
                  <Button size="sm" variant="destructive" onClick={() => decide(selected.id, "rejected")}><XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject</Button>
                </div>
              )}
              {selected.status === "approved" && (
                <Button size="sm" variant="outline" className="text-xs" onClick={() => decide(selected.id, "implemented")}>Mark Implemented</Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>
        <DialogContent className="max-w-lg bg-card max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-sm font-mono">New Proposal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Title *</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={form.proposal_type} onValueChange={v => setForm({...form, proposal_type: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PROPOSAL_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Risk Level</Label>
                <Select value={form.risk_level} onValueChange={v => setForm({...form, risk_level: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Problem Noticed</Label>
              <Textarea value={form.problem_noticed} onChange={e => setForm({...form, problem_noticed: e.target.value})} className="mt-1" rows={2} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Proposed Change</Label>
              <Textarea value={form.proposed_change} onChange={e => setForm({...form, proposed_change: e.target.value})} className="mt-1" rows={3} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Why It Matters</Label>
              <Textarea value={form.why_it_matters} onChange={e => setForm({...form, why_it_matters: e.target.value})} className="mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Est. Token Savings</Label>
                <Input type="number" value={form.estimated_token_savings} onChange={e => setForm({...form, estimated_token_savings: Number(e.target.value)})} className="mt-1 font-mono" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Model Suggestion</Label>
                <Input value={form.model_suggestion} onChange={e => setForm({...form, model_suggestion: e.target.value})} className="mt-1 font-mono text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.requires_approval} onCheckedChange={v => setForm({...form, requires_approval: v})} />
              <Label className="text-xs text-muted-foreground">Requires Approval</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={() => createMutation.mutate(form)} disabled={!form.title}>Submit</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}