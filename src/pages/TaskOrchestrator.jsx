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
import { Plus, ListTodo, Play, Clock, AlertTriangle, CheckCircle2, XCircle, Loader2, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const STATE_META = {
  queued:    { color: "text-muted-foreground", bg: "bg-muted/50 border-border",              icon: Clock,        dot: "bg-muted-foreground/40" },
  running:   { color: "text-sky-400",          bg: "bg-sky-500/10 border-sky-500/20",         icon: Loader2,      dot: "bg-sky-400", spin: true },
  waiting:   { color: "text-amber-400",        bg: "bg-amber-500/10 border-amber-500/20",     icon: Clock,        dot: "bg-amber-400" },
  blocked:   { color: "text-red-400",          bg: "bg-red-500/10 border-red-500/20",         icon: XCircle,      dot: "bg-red-400" },
  completed: { color: "text-emerald-400",      bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2, dot: "bg-emerald-400" },
  failed:    { color: "text-red-400",          bg: "bg-red-500/10 border-red-500/20",         icon: XCircle,      dot: "bg-red-500" },
  escalated: { color: "text-violet-400",       bg: "bg-violet-500/10 border-violet-500/20",   icon: AlertTriangle,dot: "bg-violet-400" },
};

const VIEWS = [
  { key: "all",      label: "All",              filter: () => true },
  { key: "running",  label: "Running",          filter: t => t.state === "running" },
  { key: "waiting",  label: "Waiting",          filter: t => ["waiting","blocked"].includes(t.state) },
  { key: "approval", label: "Needs Approval",   filter: t => t.approval_status === "pending" },
  { key: "failed",   label: "Failed",           filter: t => ["failed","escalated"].includes(t.state) },
  { key: "done",     label: "Completed Today",  filter: t => { if (t.state !== "completed") return false; if (!t.last_updated) return false; const d = new Date(t.last_updated); const today = new Date(); return d.toDateString() === today.toDateString(); } },
];

const STATES = ["queued","running","waiting","blocked","completed","failed","escalated"];
const EMPTY_FORM = { task_name: "", module: "", assigned_model: "", parent_task: "", priority: "3", state: "queued", approval_status: "not_required", error_notes: "" };

export default function TaskOrchestrator() {
  const [view, setView] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-created_date", 200),
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["modules"],
    queryFn: () => base44.entities.Module.list("-created_date", 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create({ ...data, started_at: new Date().toISOString(), last_updated: new Date().toISOString() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); setShowCreate(false); setForm(EMPTY_FORM); toast.success("Task queued"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, { ...data, last_updated: new Date().toISOString() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); },
  });

  const setTaskState = (id, state) => { updateMutation.mutate({ id, data: { state } }); toast.success(`→ ${state}`); };

  const currentFilter = VIEWS.find(v => v.key === view)?.filter || (() => true);
  const filtered = tasks.filter(currentFilter);

  const viewCounts = VIEWS.reduce((acc, v) => { acc[v.key] = tasks.filter(v.filter).length; return acc; }, {});

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ListTodo className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Multitask Runtime</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Task Orchestrator</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-foreground">{tasks.filter(t => t.state === "running").length}</span> running · <span className="font-mono text-foreground">{tasks.filter(t => ["queued","waiting"].includes(t.state)).length}</span> queued
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Queue Task
        </Button>
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {VIEWS.map(v => (
          <button key={v.key} onClick={() => setView(v.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === v.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {v.label}
            {viewCounts[v.key] > 0 && <span className={`font-mono text-xs font-bold ${view === v.key ? "text-primary-foreground/70" : ""}`}>{viewCounts[v.key]}</span>}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="border border-border rounded-xl overflow-hidden bg-card divide-y divide-border/60">
        {filtered.length === 0 && <div className="text-center py-16 text-sm text-muted-foreground font-mono">— no tasks in this view —</div>}
        {filtered.map(t => {
          const meta = STATE_META[t.state] || STATE_META.queued;
          const Icon = meta.icon;
          return (
            <div key={t.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/10 group cursor-pointer" onClick={() => setSelected(t)}>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot} ${t.state === "running" ? "animate-pulse" : ""}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{t.task_name}</p>
                  {t.parent_task && <span className="text-xs text-muted-foreground/50">↳ {t.parent_task}</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {t.module && <code className="text-xs text-muted-foreground/70">{t.module}</code>}
                  {t.assigned_model && <span className="text-xs text-primary/60 font-mono">{t.assigned_model}</span>}
                </div>
                {t.result_summary && <p className="text-xs text-muted-foreground/60 mt-1 truncate">{t.result_summary}</p>}
                {t.error_notes && <p className="text-xs text-red-400 mt-0.5 truncate">⚠ {t.error_notes}</p>}
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {t.priority && <span className="text-xs font-mono text-muted-foreground/60">P{t.priority}</span>}
                {t.approval_status === "pending" && <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">approval</span>}
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${meta.bg} ${meta.color}`}>{t.state}</span>
                {t.last_updated && <span className="text-xs font-mono text-muted-foreground/50">{format(new Date(t.last_updated), "HH:mm")}</span>}
              </div>

              {/* Quick state change */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                <Select value={t.state} onValueChange={v => setTaskState(t.id, v)}>
                  <SelectTrigger className="h-7 w-28 text-xs border-border bg-muted/30"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader><DialogTitle className="text-sm font-mono">{selected?.task_name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              {[
                ["Module", selected.module],
                ["Model", selected.assigned_model],
                ["Parent Task", selected.parent_task],
                ["Priority", selected.priority ? `P${selected.priority}` : null],
                ["State", selected.state],
                ["Approval", selected.approval_status?.replace(/_/g," ")],
                ["Started", selected.started_at && format(new Date(selected.started_at), "MMM d, HH:mm")],
                ["Last Updated", selected.last_updated && format(new Date(selected.last_updated), "MMM d, HH:mm")],
              ].filter(([,v]) => v).map(([k,v]) => (
                <div key={k} className="grid grid-cols-3 gap-2">
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="text-sm text-foreground col-span-2 font-mono">{v}</p>
                </div>
              ))}
              {selected.result_summary && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Result Summary</p>
                  <p className="text-sm bg-muted/40 rounded-lg px-3 py-2">{selected.result_summary}</p>
                </div>
              )}
              {selected.error_notes && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-400">{selected.error_notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2 flex-wrap">
                {["queued","running","waiting","completed","failed"].map(s => (
                  <Button key={s} size="sm" variant={selected.state === s ? "default" : "outline"} className="text-xs h-7"
                    onClick={() => { setTaskState(selected.id, s); setSelected(prev => ({...prev, state: s})); }}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader><DialogTitle className="text-sm font-mono">Queue New Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Task Name *</Label>
              <Input value={form.task_name} onChange={e => setForm({...form, task_name: e.target.value})} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Module</Label>
                <Select value={form.module} onValueChange={v => setForm({...form, module: v})}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{modules.map(m => <SelectItem key={m.id} value={m.module_name}>{m.module_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{["1","2","3","4","5"].map(p => <SelectItem key={p} value={p}>P{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Assigned Model</Label>
              <Input value={form.assigned_model} onChange={e => setForm({...form, assigned_model: e.target.value})} className="mt-1 font-mono text-sm" placeholder="llama3.1:8b" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Parent Task (optional)</Label>
              <Input value={form.parent_task} onChange={e => setForm({...form, parent_task: e.target.value})} className="mt-1 font-mono text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={() => createMutation.mutate(form)} disabled={!form.task_name}>Queue</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}