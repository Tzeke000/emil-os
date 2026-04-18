import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Router, Pencil, Cpu } from "lucide-react";
import { toast } from "sonner";

const MODELS = ["llama3.1:8b", "llama3.1:70b", "mistral:7b", "gemma2:9b", "phi3:14b", "deepseek-r1:8b", "qwen2.5:14b", "nomic-embed-text"];

const MODEL_META = {
  "llama3.1:8b":      { color: "text-sky-400",    note: "fast, light" },
  "llama3.1:70b":     { color: "text-violet-400", note: "deep reasoning" },
  "mistral:7b":       { color: "text-emerald-400",note: "balanced" },
  "gemma2:9b":        { color: "text-teal-400",   note: "structured" },
  "phi3:14b":         { color: "text-amber-400",  note: "efficient" },
  "deepseek-r1:8b":   { color: "text-red-400",    note: "chain-of-thought" },
  "qwen2.5:14b":      { color: "text-primary",    note: "multilingual" },
  "nomic-embed-text": { color: "text-muted-foreground", note: "embeddings" },
};

const EMPTY_FORM = { module_name: "", default_model: "llama3.1:8b", fallback_model: "mistral:7b", use_case: "", max_context: 4096, token_saving_mode: false, escalation_rule: "", notes: "", is_active: true };

export default function ModelRouter() {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const queryClient = useQueryClient();

  const { data: routes = [] } = useQuery({
    queryKey: ["modelRoutes"],
    queryFn: () => base44.entities.ModelRoute.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ModelRoute.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["modelRoutes"] }); setShowCreate(false); setForm(EMPTY_FORM); toast.success("Route created"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ModelRoute.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["modelRoutes"] }); setEditing(null); toast.success("Route updated"); },
  });

  const openEdit = (r) => { setForm({ ...r }); setEditing(r); };

  // Model usage stats
  const modelUsage = routes.reduce((acc, r) => {
    acc[r.default_model] = (acc[r.default_model] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Router className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Ollama Assignment Console</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Model Router</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Assign models to modules and tasks</p>
        </div>
        <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setShowCreate(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Route
        </Button>
      </div>

      {/* Model usage heatmap */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {Object.entries(modelUsage).map(([model, count]) => {
          const meta = MODEL_META[model] || { color: "text-muted-foreground", note: "" };
          return (
            <div key={model} className="bg-card border border-border rounded-lg px-3 py-2 flex items-center gap-2">
              <Cpu className={`w-3.5 h-3.5 ${meta.color}`} />
              <span className={`text-xs font-mono font-semibold ${meta.color}`}>{model}</span>
              <span className="text-xs text-muted-foreground">{count} route{count > 1 ? "s" : ""}</span>
            </div>
          );
        })}
      </div>

      {/* Route table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card divide-y divide-border/60">
        {routes.length === 0 && <div className="text-center py-16 text-sm text-muted-foreground font-mono">— no routes defined —</div>}
        {routes.map(r => {
          const defMeta = MODEL_META[r.default_model] || { color: "text-muted-foreground" };
          const fbMeta = MODEL_META[r.fallback_model] || { color: "text-muted-foreground/50" };
          return (
            <div key={r.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/10 group">
              <code className="text-sm font-mono font-semibold text-foreground flex-shrink-0 w-44">{r.module_name}</code>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{r.use_case}</p>
                {r.escalation_rule && <p className="text-xs text-amber-400/70 mt-0.5">↑ {r.escalation_rule}</p>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 text-xs font-mono">
                <span className={`font-semibold ${defMeta.color}`}>{r.default_model}</span>
                <span className="text-muted-foreground/40">→</span>
                <span className={`${fbMeta.color}`}>{r.fallback_model}</span>
                {r.max_context && <span className="text-muted-foreground/60">{(r.max_context/1000).toFixed(0)}k ctx</span>}
                {r.token_saving_mode && <span className="text-emerald-400">⚡ saving</span>}
              </div>
              <Button size="sm" variant="ghost" className="h-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEdit(r)}>
                <Pencil className="w-3 h-3" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Create / Edit dialog */}
      {(showCreate || editing) && (
        <Dialog open={true} onOpenChange={() => { setShowCreate(false); setEditing(null); setForm(EMPTY_FORM); }}>
          <DialogContent className="max-w-lg bg-card">
            <DialogHeader><DialogTitle className="text-sm font-mono">{editing ? "Edit Route" : "New Route"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Module Name *</Label>
                <Input value={form.module_name} onChange={e => setForm({...form, module_name: e.target.value})} className="mt-1 font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Default Model</Label>
                  <Select value={form.default_model} onValueChange={v => setForm({...form, default_model: v})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{MODELS.map(m => <SelectItem key={m} value={m}><span className={MODEL_META[m]?.color}>{m}</span></SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fallback Model</Label>
                  <Select value={form.fallback_model} onValueChange={v => setForm({...form, fallback_model: v})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Use Case</Label>
                <Input value={form.use_case} onChange={e => setForm({...form, use_case: e.target.value})} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Max Context (tokens)</Label>
                  <Input type="number" value={form.max_context} onChange={e => setForm({...form, max_context: Number(e.target.value)})} className="mt-1 font-mono" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Escalation Rule</Label>
                <Input value={form.escalation_rule} onChange={e => setForm({...form, escalation_rule: e.target.value})} className="mt-1 font-mono text-sm" placeholder="If confidence < 0.6, escalate to 70b" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1" rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.token_saving_mode} onCheckedChange={v => setForm({...form, token_saving_mode: v})} />
                <Label className="text-xs text-muted-foreground">Token Saving Mode</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => { setShowCreate(false); setEditing(null); setForm(EMPTY_FORM); }}>Cancel</Button>
              <Button size="sm" disabled={!form.module_name} onClick={() => editing ? updateMutation.mutate({ id: editing.id, data: form }) : createMutation.mutate(form)}>
                {editing ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}