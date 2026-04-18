import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GitCommit, Plus, Search, RotateCcw, Eye, Trash2, ChevronRight, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CHANGE_TYPE_META = {
  create_page:           { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  edit_page:             { color: "text-primary",     bg: "bg-primary/10 border-primary/20" },
  delete_page:           { color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
  create_module:         { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  edit_module:           { color: "text-primary",     bg: "bg-primary/10 border-primary/20" },
  delete_module:         { color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
  create_field:          { color: "text-teal-400",    bg: "bg-teal-500/10 border-teal-500/20" },
  edit_field:            { color: "text-sky-400",     bg: "bg-sky-500/10 border-sky-500/20" },
  delete_field:          { color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
  schema_change:         { color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20" },
  layout_change:         { color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  routing_change:        { color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  prompt_template_change:{ color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20" },
  playbook_change:       { color: "text-indigo-400",  bg: "bg-indigo-500/10 border-indigo-500/20" },
  memory_rule_change:    { color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/20" },
  dashboard_change:      { color: "text-primary",     bg: "bg-primary/10 border-primary/20" },
  settings_change:       { color: "text-muted-foreground", bg: "bg-muted/40 border-border" },
};

const RISK_META = {
  low:    "text-emerald-400",
  medium: "text-amber-400",
  high:   "text-red-400",
};

const CHANGE_TYPES = Object.keys(CHANGE_TYPE_META);
const AREAS = ["identity","memory","outreach","pipeline","runtime","system","dashboard","triggers","reflections","relationship","preferences","other"];
const REASONS = ["obsolete","replaced_by_better_version","reduced_token_waste","simplified_workflow","merged_duplicate_systems","improved_clarity","no_longer_useful","improved_execution","bug_fix","new_capability","user_request","other"];

const EMPTY_FORM = {
  change_type: "edit_page", area_affected: "dashboard", entity_affected: "",
  reason_for_change: "improved_clarity", reason_notes: "",
  old_snapshot: "", new_snapshot: "",
  replaced_something: false, replaced_what: "",
  risk_level: "low", tags: [],
};

export default function EvolutionLogPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [showDeleted, setShowDeleted] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(null);

  const { data: logs = [] } = useQuery({
    queryKey: ["evolutionLog"],
    queryFn: () => base44.entities.EvolutionLog.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EvolutionLog.create({
      ...data,
      change_id: `CHG-${String(Date.now()).slice(-4)}`,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["evolutionLog"] }); setShowCreate(false); setForm(EMPTY_FORM); toast.success("Change logged"); },
  });

  const softDeleteMutation = useMutation({
    mutationFn: ({ id, reason }) => base44.entities.EvolutionLog.update(id, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: "Emil",
      deletion_reason: reason,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["evolutionLog"] }); setSelected(null); toast.success("Archived (soft deleted)"); },
  });

  const rollbackMutation = useMutation({
    mutationFn: (id) => base44.entities.EvolutionLog.update(id, {
      is_rolled_back: true,
      rolled_back_at: new Date().toISOString(),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["evolutionLog"] }); setShowRollbackConfirm(null); setSelected(null); toast.success("Marked as rolled back"); },
  });

  const filtered = logs.filter(l => {
    if (!showDeleted && l.is_deleted) return false;
    if (typeFilter !== "all" && l.change_type !== typeFilter) return false;
    if (areaFilter !== "all" && l.area_affected !== areaFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.entity_affected || "").toLowerCase().includes(q) ||
        (l.reason_notes || "").toLowerCase().includes(q) ||
        (l.change_id || "").toLowerCase().includes(q);
    }
    return true;
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter(l => l.created_date?.startsWith(todayStr));
  const deletedCount = logs.filter(l => l.is_deleted).length;
  const replacements = logs.filter(l => l.replaced_something).length;

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitCommit className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Self-Evolution</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Evolution Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-foreground">{logs.filter(l => !l.is_deleted).length}</span> changes ·{" "}
            <span className="font-mono text-foreground">{todayLogs.length}</span> today ·{" "}
            <span className="font-mono text-amber-400">{deletedCount}</span> archived ·{" "}
            <span className="font-mono text-violet-400">{replacements}</span> replacements
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY_FORM); setShowCreate(true); }}>
          <Plus className="w-4 h-4" /> Log Change
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entity, notes..." className="pl-8 h-8 text-sm" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {CHANGE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All areas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All areas</SelectItem>
            {AREAS.map(a => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <button
          onClick={() => setShowDeleted(!showDeleted)}
          className={cn("px-3 py-1.5 rounded text-xs font-mono transition-colors",
            showDeleted ? "bg-red-500/15 text-red-400 border border-red-500/30" : "bg-muted text-muted-foreground hover:text-foreground"
          )}>
          {showDeleted ? "Hiding archived" : "Show archived"}
        </button>
      </div>

      {/* Timeline */}
      <div className="border border-border rounded-xl overflow-hidden bg-card divide-y divide-border/60">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground font-mono">— no changes logged —</div>
        )}
        {filtered.map(log => {
          const meta = CHANGE_TYPE_META[log.change_type] || CHANGE_TYPE_META.settings_change;
          return (
            <div key={log.id}
              className={cn("flex items-center gap-4 px-5 py-3 hover:bg-muted/10 cursor-pointer group transition-colors",
                log.is_deleted && "opacity-50",
                log.is_rolled_back && "bg-violet-500/5"
              )}
              onClick={() => setSelected(log)}
            >
              {/* Change type badge */}
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded border flex-shrink-0 capitalize", meta.bg, meta.color)}>
                {log.change_type?.replace(/_/g, " ")}
              </span>

              {/* Entity + reason */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{log.entity_affected}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {log.reason_for_change?.replace(/_/g, " ")}
                  {log.reason_notes && ` — ${log.reason_notes}`}
                </p>
              </div>

              {/* Right meta */}
              <div className="flex items-center gap-3 flex-shrink-0 text-xs font-mono">
                {log.replaced_something && <span className="text-violet-400">replaced</span>}
                {log.is_deleted && <span className="text-red-400">archived</span>}
                {log.is_rolled_back && <span className="text-amber-400">rolled back</span>}
                <span className={`capitalize ${RISK_META[log.risk_level] || ""}`}>{log.risk_level}</span>
                <span className="text-muted-foreground/50 text-xs">
                  {log.created_date ? format(new Date(log.created_date), "MMM d, HH:mm") : "—"}
                </span>
                <span className="text-muted-foreground/40 font-mono text-xs">{log.change_id}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground flex-shrink-0" />
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl bg-card max-h-[90vh] overflow-y-auto">
          {selected && (() => {
            const meta = CHANGE_TYPE_META[selected.change_type] || CHANGE_TYPE_META.settings_change;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-sm">
                    <span className={cn("px-2 py-0.5 rounded border text-xs capitalize", meta.bg, meta.color)}>
                      {selected.change_type?.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-muted-foreground">{selected.change_id}</span>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground uppercase tracking-widest font-semibold mb-1">Entity</p>
                      <p className="text-foreground">{selected.entity_affected}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground uppercase tracking-widest font-semibold mb-1">Area</p>
                      <p className="text-foreground capitalize">{selected.area_affected}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground uppercase tracking-widest font-semibold mb-1">Risk</p>
                      <p className={`capitalize font-semibold ${RISK_META[selected.risk_level]}`}>{selected.risk_level}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Reason</p>
                    <p className="text-sm text-foreground capitalize">{selected.reason_for_change?.replace(/_/g, " ")}</p>
                    {selected.reason_notes && <p className="text-sm text-muted-foreground mt-1">{selected.reason_notes}</p>}
                  </div>

                  {selected.replaced_something && selected.replaced_what && (
                    <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg px-3 py-2">
                      <p className="text-xs text-violet-400 font-semibold uppercase tracking-widest mb-1">Replaced</p>
                      <p className="text-sm text-foreground">{selected.replaced_what}</p>
                    </div>
                  )}

                  {/* Before / After snapshots */}
                  {(selected.old_snapshot || selected.new_snapshot) && (
                    <div className="grid grid-cols-2 gap-3">
                      {selected.old_snapshot && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1.5">Before</p>
                          <pre className="text-xs bg-muted/40 border border-border rounded px-3 py-2.5 font-mono whitespace-pre-wrap overflow-auto max-h-48 text-muted-foreground">
                            {(() => { try { return JSON.stringify(JSON.parse(selected.old_snapshot), null, 2); } catch { return selected.old_snapshot; } })()}
                          </pre>
                        </div>
                      )}
                      {selected.new_snapshot && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1.5">After</p>
                          <pre className="text-xs bg-muted/40 border border-border rounded px-3 py-2.5 font-mono whitespace-pre-wrap overflow-auto max-h-48 text-muted-foreground">
                            {(() => { try { return JSON.stringify(JSON.parse(selected.new_snapshot), null, 2); } catch { return selected.new_snapshot; } })()}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {selected.rollback_snapshot_id && (
                    <div className="text-xs text-muted-foreground font-mono">
                      Rollback snapshot: <span className="text-primary">{selected.rollback_snapshot_id}</span>
                    </div>
                  )}

                  {selected.is_deleted && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2 text-xs">
                      <p className="text-red-400 font-semibold mb-0.5">Archived</p>
                      <p className="text-muted-foreground">{selected.deletion_reason}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    {!selected.is_rolled_back && !selected.is_deleted && (
                      <Button size="sm" variant="outline" className="gap-1.5 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                        onClick={() => { setShowRollbackConfirm(selected); setSelected(null); }}>
                        <RotateCcw className="w-3.5 h-3.5" /> Mark Rolled Back
                      </Button>
                    )}
                    {!selected.is_deleted && (
                      <Button size="sm" variant="outline" className="gap-1.5 text-red-400 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => softDeleteMutation.mutate({ id: selected.id, reason: "Manually archived via Evolution Log" })}>
                        <Trash2 className="w-3.5 h-3.5" /> Archive
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(null)}>Close</Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Rollback confirm */}
      <Dialog open={!!showRollbackConfirm} onOpenChange={() => setShowRollbackConfirm(null)}>
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Confirm Rollback
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Mark <span className="text-foreground font-semibold">{showRollbackConfirm?.entity_affected}</span> as rolled back? This records the intent to restore prior state.</p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setShowRollbackConfirm(null)}>Cancel</Button>
            <Button size="sm" className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30"
              onClick={() => rollbackMutation.mutate(showRollbackConfirm.id)}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Confirm Rollback
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Change dialog */}
      <Dialog open={showCreate} onOpenChange={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>
        <DialogContent className="max-w-xl bg-card max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono">Log a Change</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Change Type *</Label>
                <Select value={form.change_type} onValueChange={v => setForm({ ...form, change_type: v })}>
                  <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANGE_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Area Affected *</Label>
                <Select value={form.area_affected} onValueChange={v => setForm({ ...form, area_affected: v })}>
                  <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{AREAS.map(a => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Entity / Page / Module Affected *</Label>
              <Input value={form.entity_affected} onChange={e => setForm({ ...form, entity_affected: e.target.value })} placeholder="e.g. Dashboard, Module.outreach_writer, Prospect entity" className="mt-1 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Reason *</Label>
                <Select value={form.reason_for_change} onValueChange={v => setForm({ ...form, reason_for_change: v })}>
                  <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{REASONS.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Risk Level</Label>
                <Select value={form.risk_level} onValueChange={v => setForm({ ...form, risk_level: v })}>
                  <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Reason Notes (required for high risk)</Label>
              <Textarea value={form.reason_notes} onChange={e => setForm({ ...form, reason_notes: e.target.value })} placeholder="Explain what changed and why in plain language..." rows={3} className="mt-1 text-sm" />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="replaced" checked={form.replaced_something} onChange={e => setForm({ ...form, replaced_something: e.target.checked })} className="rounded" />
              <Label htmlFor="replaced" className="text-xs text-muted-foreground cursor-pointer">This change replaced something older</Label>
            </div>

            {form.replaced_something && (
              <div>
                <Label className="text-xs text-muted-foreground">What was replaced?</Label>
                <Input value={form.replaced_what} onChange={e => setForm({ ...form, replaced_what: e.target.value })} placeholder="Name or description of what was replaced..." className="mt-1 text-sm" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Before Snapshot (optional JSON)</Label>
                <Textarea value={form.old_snapshot} onChange={e => setForm({ ...form, old_snapshot: e.target.value })} placeholder='{"field": "old_value"}' rows={3} className="mt-1 text-xs font-mono" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">After Snapshot (optional JSON)</Label>
                <Textarea value={form.new_snapshot} onChange={e => setForm({ ...form, new_snapshot: e.target.value })} placeholder='{"field": "new_value"}' rows={3} className="mt-1 text-xs font-mono" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>Cancel</Button>
              <Button size="sm" disabled={!form.entity_affected || !form.reason_notes}
                onClick={() => createMutation.mutate(form)}>
                Log Change
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}