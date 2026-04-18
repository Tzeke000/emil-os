import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Check, BookOpen, Zap, GitBranch, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["lead_scoring", "follow_up", "escalation", "approval", "cost_saving", "disqualification", "qualification", "pricing", "outreach"];

const CAT_META = {
  lead_scoring: { color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
  follow_up: { color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  escalation: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  approval: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  cost_saving: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  disqualification: { color: "text-muted-foreground", bg: "bg-muted/50 border-border" },
  qualification: { color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  pricing: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  outreach: { color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/20" },
};

export default function Playbooks() {
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [catFilter, setCatFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: playbooks = [] } = useQuery({
    queryKey: ["playbooks"],
    queryFn: () => base44.entities.Playbook.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Playbook.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["playbooks"] }); setShowCreate(false); setForm({}); toast.success("Playbook created"); },
  });

  const filtered = catFilter === "all" ? playbooks : playbooks.filter(p => p.category === catFilter);
  const approvedCount = playbooks.filter(p => p.approved).length;

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitBranch className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Decision Engine</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Playbooks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-foreground">{approvedCount}</span> active · <span className="font-mono text-foreground">{playbooks.length}</span> total playbooks
          </p>
        </div>
        <Button size="sm" onClick={() => { setForm({}); setShowCreate(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Playbook
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button onClick={() => setCatFilter("all")} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${catFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>All</button>
        {CATEGORIES.map(c => {
          const count = playbooks.filter(p => p.category === c).length;
          if (count === 0) return null;
          return (
            <button key={c} onClick={() => setCatFilter(c)} className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${catFilter === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {c.replace(/_/g, " ")} <span className="font-mono opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Playbook list */}
      <div className="border border-border rounded-xl overflow-hidden bg-card divide-y divide-border/60">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground font-mono">— no playbooks —</div>
        )}
        {filtered.map(p => {
          const meta = CAT_META[p.category] || {};
          return (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors text-left group"
            >
              {/* Category tag */}
              <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border flex-shrink-0 ${meta.bg} ${meta.color}`}>
                {p.category?.replace(/_/g, " ")}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  {p.approved && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                </div>
                {p.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{p.description}</p>}
                {p.trigger_condition && (
                  <p className="text-xs text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Trigger: {p.trigger_condition}
                  </p>
                )}
              </div>

              {/* Right meta */}
              <div className="flex items-center gap-4 flex-shrink-0 text-xs font-mono text-muted-foreground">
                {p.priority && <span className="text-muted-foreground/70">P{p.priority}</span>}
                {p.times_applied > 0 && <span>{p.times_applied}x applied</span>}
                {p.rule_steps?.length > 0 && <span>{p.rule_steps.length} steps</span>}
                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              {selected?.name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {(() => { const meta = CAT_META[selected.category] || {}; return (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${meta.bg} ${meta.color}`}>{selected.category?.replace(/_/g, " ")}</span>
                ); })()}
                {selected.approved && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs"><Check className="h-3 w-3 mr-1" /> Active</Badge>}
                {selected.priority && <Badge variant="secondary" className="text-xs font-mono">P{selected.priority}</Badge>}
                {selected.times_applied > 0 && <Badge variant="secondary" className="text-xs font-mono">{selected.times_applied}x applied</Badge>}
              </div>

              {selected.description && <p className="text-sm text-foreground">{selected.description}</p>}

              {selected.trigger_condition && (
                <div className="bg-muted/40 border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1.5"><Zap className="w-3 h-3" /> Trigger Condition</p>
                  <p className="text-sm font-mono text-foreground">{selected.trigger_condition}</p>
                </div>
              )}

              {selected.rule_steps?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Execution Steps</p>
                  <div className="space-y-1.5">
                    {selected.rule_steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3 bg-muted/30 rounded-md px-3 py-2">
                        <span className="text-xs font-bold font-mono text-primary flex-shrink-0 mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                        <p className="text-sm text-foreground leading-snug">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader><DialogTitle className="text-sm font-mono">New Playbook</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={form.category || ""} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Select value={form.priority || ""} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{["1","2","3","4","5"].map(p => <SelectItem key={p} value={p}>P{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Trigger Condition</Label>
              <Input value={form.trigger_condition || ""} onChange={e => setForm({ ...form, trigger_condition: e.target.value })} className="mt-1 font-mono text-sm" placeholder="When does this run?" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Rule Steps (one per line)</Label>
              <Textarea
                value={Array.isArray(form.rule_steps) ? form.rule_steps.join("\n") : (form.rule_steps || "")}
                onChange={e => setForm({ ...form, rule_steps: e.target.value.split("\n").filter(Boolean) })}
                rows={5}
                className="font-mono text-sm mt-1"
                placeholder="Step 1&#10;Step 2&#10;Step 3"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.approved || false} onCheckedChange={v => setForm({ ...form, approved: v })} />
              <Label className="text-xs text-muted-foreground">Approved for use</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.category}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}