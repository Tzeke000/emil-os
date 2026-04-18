import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ArrowRight, CheckCircle2, XCircle, Clock, GitMerge } from "lucide-react";
import { toast } from "sonner";

const DESTINATIONS = ["active_memory","current_state","soul","identity","playbook","archive_only"];
const RELEVANCE = ["still_relevant","partially_relevant","outdated","unknown"];
const STATUSES = ["pending_review","approved","rejected","completed"];

const DEST_META = {
  active_memory:  { color: "text-sky-400",          bg: "bg-sky-500/10 border-sky-500/20" },
  current_state:  { color: "text-amber-400",         bg: "bg-amber-500/10 border-amber-500/20" },
  soul:           { color: "text-violet-400",        bg: "bg-violet-500/10 border-violet-500/20" },
  identity:       { color: "text-emerald-400",       bg: "bg-emerald-500/10 border-emerald-500/20" },
  playbook:       { color: "text-primary",           bg: "bg-primary/10 border-primary/20" },
  archive_only:   { color: "text-muted-foreground",  bg: "bg-muted/50 border-border" },
};

const EMPTY_FORM = { old_memory_title: "", old_memory_id: "", current_relevance: "unknown", suggested_destination: "active_memory", merge_conflict_note: "", rewritten_version: "", copy_approved: false, status: "pending_review" };

export default function MemoryMigration() {
  const [filter, setFilter] = useState("pending_review");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const queryClient = useQueryClient();

  const { data: migrations = [] } = useQuery({
    queryKey: ["migrations"],
    queryFn: () => base44.entities.MemoryMigration.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MemoryMigration.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["migrations"] }); setShowCreate(false); setForm(EMPTY_FORM); toast.success("Migration queued"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MemoryMigration.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["migrations"] }); setSelected(null); },
  });

  const decide = (id, status, final_destination) => {
    updateMutation.mutate({ id, data: { status, copy_approved: status === "approved", final_destination } });
    toast.success(status === "approved" ? `Approved → ${final_destination?.replace(/_/g," ")}` : "Rejected");
  };

  const filtered = migrations.filter(m => filter === "all" || m.status === filter);

  const counts = STATUSES.reduce((a, s) => { a[s] = migrations.filter(m => m.status === s).length; return a; }, {});

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitMerge className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Copy Forward Layer</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Memory Migration</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Review old memories and selectively carry them forward</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Queue Migration
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5">
        {[["all", "All", migrations.length], ...STATUSES.map(s => [s, s.replace(/_/g," "), counts[s]])].map(([key, label, count]) => (
          <button key={key} onClick={() => setFilter(key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {label} {count > 0 && <span className="font-mono">{count}</span>}
          </button>
        ))}
      </div>

      {/* Migration list */}
      <div className="space-y-2">
        {filtered.length === 0 && <div className="text-center py-16 text-sm text-muted-foreground font-mono bg-card border border-border rounded-xl">— no migrations —</div>}
        {filtered.map(m => {
          const destMeta = DEST_META[m.suggested_destination] || DEST_META.archive_only;
          const finalMeta = DEST_META[m.final_destination] || null;
          return (
            <div key={m.id} className={`border rounded-xl bg-card overflow-hidden ${m.status === "pending_review" ? "border-amber-500/20" : "border-border"}`}>
              <button className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/10 text-left" onClick={() => setSelected(m)}>
                {/* Relevance dot */}
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.current_relevance === "still_relevant" ? "bg-emerald-400" : m.current_relevance === "partially_relevant" ? "bg-amber-400" : m.current_relevance === "outdated" ? "bg-red-400" : "bg-muted-foreground/40"}`} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{m.old_memory_title}</p>
                  {m.rewritten_version && <p className="text-xs text-muted-foreground mt-0.5 truncate">{m.rewritten_version}</p>}
                  {m.merge_conflict_note && <p className="text-xs text-red-400 mt-0.5">⚠ {m.merge_conflict_note}</p>}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground capitalize">{m.current_relevance?.replace(/_/g," ")}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded border ${destMeta.bg} ${destMeta.color}`}>{m.suggested_destination?.replace(/_/g," ")}</span>
                  {finalMeta && m.status === "completed" && (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className={`text-xs font-medium px-2 py-0.5 rounded border ${finalMeta.bg} ${finalMeta.color}`}>{m.final_destination?.replace(/_/g," ")}</span>
                    </>
                  )}
                  {m.status === "rejected" && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                  {m.status === "pending_review" && <Clock className="w-3.5 h-3.5 text-amber-400" />}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-xl bg-card max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-sm font-mono">{selected?.old_memory_title}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Relevance</p><p className="capitalize">{selected.current_relevance?.replace(/_/g," ")}</p></div>
                <div><p className="text-xs text-muted-foreground">Suggested Destination</p><p className="capitalize">{selected.suggested_destination?.replace(/_/g," ")}</p></div>
              </div>
              {selected.rewritten_version && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1.5">Rewritten Version</p>
                  <div className="bg-muted/40 border border-border rounded-lg p-3 text-sm whitespace-pre-wrap">{selected.rewritten_version}</div>
                </div>
              )}
              {selected.merge_conflict_note && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">⚠ {selected.merge_conflict_note}</div>
              )}
              {selected.status === "pending_review" && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Choose Destination & Decide</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DESTINATIONS.map(d => {
                      const meta = DEST_META[d];
                      return (
                        <Button key={d} size="sm" variant="outline" className={`text-xs h-8 capitalize ${meta.color}`} onClick={() => decide(selected.id, "approved", d)}>
                          {d.replace(/_/g," ")}
                        </Button>
                      );
                    })}
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs text-red-400 w-full" onClick={() => decide(selected.id, "rejected", null)}>
                    <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject / Archive Only
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader><DialogTitle className="text-sm font-mono">Queue Memory Migration</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Old Memory Title *</Label>
              <Input value={form.old_memory_title} onChange={e => setForm({...form, old_memory_title: e.target.value})} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Current Relevance</Label>
                <Select value={form.current_relevance} onValueChange={v => setForm({...form, current_relevance: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{RELEVANCE.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Suggested Destination</Label>
                <Select value={form.suggested_destination} onValueChange={v => setForm({...form, suggested_destination: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{DESTINATIONS.map(d => <SelectItem key={d} value={d}>{d.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Rewritten / Cleaned Version</Label>
              <Textarea value={form.rewritten_version} onChange={e => setForm({...form, rewritten_version: e.target.value})} className="mt-1" rows={4} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Merge Conflict Note (optional)</Label>
              <Input value={form.merge_conflict_note} onChange={e => setForm({...form, merge_conflict_note: e.target.value})} className="mt-1" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={() => createMutation.mutate(form)} disabled={!form.old_memory_title}>Queue</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}