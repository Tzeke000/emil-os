import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Cpu, Check, ChevronRight, Zap, Settings } from "lucide-react";
import { toast } from "sonner";

const MODELS = ["llama3.1:8b", "llama3.1:70b", "mistral:7b", "gemma2:9b", "phi3:14b", "deepseek-r1:8b", "qwen2.5:14b"];
const PRIORITIES = ["1","2","3","4","5"];

const EMPTY_FORM = { module_name: "", description: "", purpose: "", input_type: "", output_type: "", trigger_condition: "", assigned_model: "llama3.1:8b", fallback_model: "mistral:7b", priority: "3", token_budget: 2000, allowed_tools: [], requires_approval: false, is_active: true, notes: "" };

export default function ModuleBuilder() {
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toolInput, setToolInput] = useState("");
  const queryClient = useQueryClient();

  const { data: modules = [] } = useQuery({
    queryKey: ["modules"],
    queryFn: () => base44.entities.Module.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Module.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["modules"] }); setShowCreate(false); setForm(EMPTY_FORM); toast.success("Module created"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Module.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["modules"] }); setSelected(null); toast.success("Module updated"); },
  });

  const toggleActive = (m) => updateMutation.mutate({ id: m.id, data: { is_active: !m.is_active } });

  const addTool = () => { if (toolInput.trim()) { setForm(f => ({ ...f, allowed_tools: [...(f.allowed_tools||[]), toolInput.trim()] })); setToolInput(""); } };

  const activeCount = modules.filter(m => m.is_active).length;

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Execution Engine</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Module Builder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-foreground">{activeCount}</span> active · <span className="font-mono text-foreground">{modules.length}</span> total modules
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Module
        </Button>
      </div>

      {/* Module table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card divide-y divide-border/60">
        {modules.length === 0 && <div className="text-center py-16 text-sm text-muted-foreground font-mono">— no modules defined —</div>}
        {modules.map(m => (
          <div key={m.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/10 group">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`w-1.5 h-1.5 rounded-full ${m.is_active ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />
              <code className="text-sm font-mono font-semibold text-foreground">{m.module_name}</code>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{m.description}</p>
              {m.trigger_condition && (
                <p className="text-xs text-muted-foreground/50 mt-0.5 flex items-center gap-1"><Zap className="w-3 h-3" />{m.trigger_condition}</p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 text-xs font-mono text-muted-foreground">
              <span className="text-primary/80">{m.assigned_model}</span>
              {m.token_budget && <span>{m.token_budget.toLocaleString()} tok</span>}
              {m.priority && <span className="text-muted-foreground/60">P{m.priority}</span>}
              {m.requires_approval && <span className="text-amber-400">approval</span>}
              {m.times_run > 0 && <span>{m.times_run}x run</span>}
            </div>
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(m)}><Settings className="w-3 h-3" /></Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleActive(m)}>
                {m.is_active ? "Disable" : "Enable"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-xl bg-card max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-mono text-sm">{selected?.module_name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              {[
                ["Purpose", selected.purpose],
                ["Input Type", selected.input_type],
                ["Output Type", selected.output_type],
                ["Trigger", selected.trigger_condition],
                ["Model", selected.assigned_model],
                ["Fallback", selected.fallback_model],
                ["Token Budget", selected.token_budget],
                ["Priority", selected.priority ? `P${selected.priority}` : null],
              ].filter(([,v]) => v).map(([k, v]) => (
                <div key={k} className="grid grid-cols-3 gap-2">
                  <p className="text-xs text-muted-foreground col-span-1">{k}</p>
                  <p className="text-sm text-foreground col-span-2 font-mono">{v}</p>
                </div>
              ))}
              {selected.allowed_tools?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Allowed Tools</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {selected.allowed_tools.map(t => <code key={t} className="text-xs bg-muted px-2 py-0.5 rounded border border-border">{t}</code>)}
                  </div>
                </div>
              )}
              {selected.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{selected.notes}</p>
                </div>
              )}
              <div className="flex items-center gap-2 pt-2">
                <div className={`w-1.5 h-1.5 rounded-full ${selected.is_active ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
                <span className="text-xs text-muted-foreground">{selected.is_active ? "Active" : "Inactive"}</span>
                {selected.requires_approval && <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/20 ml-2">Requires Approval</Badge>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>
        <DialogContent className="max-w-lg bg-card max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-sm font-mono">New Module</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Module Name * (snake_case)</Label>
              <Input value={form.module_name} onChange={e => setForm({...form, module_name: e.target.value})} className="mt-1 font-mono" placeholder="e.g. outreach_writer" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Input Type</Label>
                <Input value={form.input_type} onChange={e => setForm({...form, input_type: e.target.value})} className="mt-1 font-mono text-sm" placeholder="prospect_record" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Output Type</Label>
                <Input value={form.output_type} onChange={e => setForm({...form, output_type: e.target.value})} className="mt-1 font-mono text-sm" placeholder="email_draft" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Trigger Condition</Label>
              <Input value={form.trigger_condition} onChange={e => setForm({...form, trigger_condition: e.target.value})} className="mt-1 font-mono text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Assigned Model</Label>
                <Select value={form.assigned_model} onValueChange={v => setForm({...form, assigned_model: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>P{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Token Budget</Label>
                <Input type="number" value={form.token_budget} onChange={e => setForm({...form, token_budget: Number(e.target.value)})} className="mt-1 font-mono" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Allowed Tools (add one at a time)</Label>
              <div className="flex gap-2 mt-1">
                <Input value={toolInput} onChange={e => setToolInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTool()} className="font-mono text-sm" placeholder="search, read_file..." />
                <Button size="sm" variant="outline" onClick={addTool}>Add</Button>
              </div>
              {form.allowed_tools?.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {form.allowed_tools.map(t => (
                    <code key={t} className="text-xs bg-muted px-2 py-0.5 rounded border border-border cursor-pointer hover:bg-destructive/10" onClick={() => setForm(f => ({...f, allowed_tools: f.allowed_tools.filter(x => x !== t)}))}>
                      {t} ×
                    </code>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1" rows={2} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.requires_approval} onCheckedChange={v => setForm({...form, requires_approval: v})} />
                <Label className="text-xs text-muted-foreground">Requires Approval</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} />
                <Label className="text-xs text-muted-foreground">Active</Label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={() => createMutation.mutate(form)} disabled={!form.module_name}>Create Module</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}