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
import { Plus, Zap, Copy, Play, Pencil, CheckCircle2, XCircle, Clock, ChevronRight, Globe, Mail, FileInput } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const SOURCE_META = {
  email_provider:  { color: "text-sky-400",          bg: "bg-sky-500/10 border-sky-500/20",         icon: Mail },
  website_form:    { color: "text-emerald-400",       bg: "bg-emerald-500/10 border-emerald-500/20", icon: FileInput },
  zapier:          { color: "text-orange-400",        bg: "bg-orange-500/10 border-orange-500/20",   icon: Zap },
  make:            { color: "text-violet-400",        bg: "bg-violet-500/10 border-violet-500/20",   icon: Zap },
  typeform:        { color: "text-teal-400",          bg: "bg-teal-500/10 border-teal-500/20",       icon: FileInput },
  custom_webhook:  { color: "text-primary",           bg: "bg-primary/10 border-primary/20",         icon: Globe },
  other:           { color: "text-muted-foreground",  bg: "bg-muted/50 border-border",               icon: Globe },
};

const SOURCE_TYPES = ["email_provider","website_form","zapier","make","typeform","custom_webhook","other"];
const TARGET_TYPES = ["task","module"];
const PRIORITIES = ["1","2","3","4","5"];

const EMPTY_FORM = {
  name: "", description: "", source_type: "custom_webhook", webhook_slug: "",
  secret_token: "", target_type: "task", target_module: "",
  task_template: { task_name_template: "Triggered: {{source}}", module: "", assigned_model: "llama3.1:8b", priority: "2" },
  payload_mapping: [], filter_condition: "", requires_approval: false, is_active: true,
};

const EMPTY_MAPPING = { source_field: "", target_field: "", transform: "" };

function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).substring(2, 6);
}

export default function TriggerIntegrations() {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [testSlug, setTestSlug] = useState("");
  const [testPayload, setTestPayload] = useState('{\n  "source": "website_form",\n  "email": "dr.smith@example.com",\n  "score": 75\n}');
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: triggers = [] } = useQuery({
    queryKey: ["triggerIntegrations"],
    queryFn: () => base44.entities.TriggerIntegration.list("-created_date", 100),
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["modules"],
    queryFn: () => base44.entities.Module.list("-created_date", 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TriggerIntegration.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["triggerIntegrations"] }); closeForm(); toast.success("Trigger created"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TriggerIntegration.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["triggerIntegrations"] }); closeForm(); toast.success("Updated"); },
  });

  const closeForm = () => { setShowCreate(false); setEditing(null); setForm(EMPTY_FORM); };

  const openEdit = (t) => {
    setForm({
      name: t.name, description: t.description || "", source_type: t.source_type,
      webhook_slug: t.webhook_slug, secret_token: t.secret_token || "",
      target_type: t.target_type, target_module: t.target_module || "",
      task_template: t.task_template || EMPTY_FORM.task_template,
      payload_mapping: t.payload_mapping || [],
      filter_condition: t.filter_condition || "",
      requires_approval: t.requires_approval || false,
      is_active: t.is_active !== false,
    });
    setEditing(t);
    setShowCreate(true);
  };

  const handleNameBlur = () => {
    if (form.name && !form.webhook_slug) {
      setForm(f => ({ ...f, webhook_slug: generateSlug(f.name) }));
    }
  };

  const addMapping = () => setForm(f => ({ ...f, payload_mapping: [...(f.payload_mapping || []), { ...EMPTY_MAPPING }] }));
  const removeMapping = (i) => setForm(f => ({ ...f, payload_mapping: f.payload_mapping.filter((_, idx) => idx !== i) }));
  const updateMapping = (i, field, val) => setForm(f => {
    const m = [...(f.payload_mapping || [])];
    m[i] = { ...m[i], [field]: val };
    return { ...f, payload_mapping: m };
  });

  const handleTest = async (trigger) => {
    setTestSlug(trigger.webhook_slug);
    setTestResult(null);
    setSelected(trigger);
  };

  const runTest = async () => {
    setTestLoading(true);
    try {
      let payload = {};
      try { payload = JSON.parse(testPayload); } catch { toast.error("Invalid JSON payload"); setTestLoading(false); return; }
      const res = await base44.functions.invoke("webhookTrigger", {
        slug: testSlug,
        secret: selected?.secret_token || "",
        payload,
      });
      setTestResult({ success: true, data: res.data });
      queryClient.invalidateQueries({ queryKey: ["triggerIntegrations"] });
      toast.success("Test fired successfully");
    } catch (e) {
      setTestResult({ success: false, error: e.message });
      toast.error("Test failed");
    }
    setTestLoading(false);
  };

  const copyWebhookUrl = (slug) => {
    navigator.clipboard.writeText(`[Your Function URL]/webhookTrigger?slug=${slug}`);
    toast.success("Webhook URL copied");
  };

  const activeCount = triggers.filter(t => t.is_active).length;
  const totalFires = triggers.reduce((a, t) => a + (t.trigger_count || 0), 0);

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Event-Driven Runtime</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Trigger Integrations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-foreground">{activeCount}</span> active triggers ·{" "}
            <span className="font-mono text-foreground">{totalFires}</span> total fires
          </p>
        </div>
        <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setShowCreate(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Trigger
        </Button>
      </div>

      {/* How it works strip */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-4 mb-5 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">How it works</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground font-mono">
          <span className="bg-muted/60 px-2 py-1 rounded">Inbound webhook</span>
          <ChevronRight className="w-3 h-3" />
          <span className="bg-muted/60 px-2 py-1 rounded">webhookTrigger function</span>
          <ChevronRight className="w-3 h-3" />
          <span className="bg-muted/60 px-2 py-1 rounded">Match slug</span>
          <ChevronRight className="w-3 h-3" />
          <span className="bg-muted/60 px-2 py-1 rounded">Apply filters + mapping</span>
          <ChevronRight className="w-3 h-3" />
          <span className="bg-primary/20 text-primary px-2 py-1 rounded border border-primary/30">Spawn Task or invoke Module</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Send a POST to your <code className="bg-muted px-1 rounded">webhookTrigger</code> function with <code className="bg-muted px-1 rounded">{"{ slug, secret, payload }"}</code></p>
      </div>

      {/* Trigger list */}
      <div className="border border-border rounded-xl overflow-hidden bg-card divide-y divide-border/60">
        {triggers.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground font-mono">— no triggers defined —</div>
        )}
        {triggers.map(t => {
          const meta = SOURCE_META[t.source_type] || SOURCE_META.other;
          const SrcIcon = meta.icon;
          return (
            <div key={t.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/10 group">
              {/* Active dot */}
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.is_active ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />

              {/* Source badge */}
              <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border flex-shrink-0 flex items-center gap-1 ${meta.bg} ${meta.color}`}>
                <SrcIcon className="w-3 h-3" />
                {t.source_type?.replace(/_/g, " ")}
              </span>

              {/* Name + slug */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <code className="text-xs text-muted-foreground/60 bg-muted/40 px-1.5 py-0.5 rounded border border-border/60">{t.webhook_slug}</code>
                  <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
                  <span className="text-xs text-primary/80 font-mono">{t.target_type === "task" ? (t.task_template?.module || "task") : t.target_module}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 flex-shrink-0 text-xs font-mono text-muted-foreground">
                {t.requires_approval && <span className="text-amber-400">approval</span>}
                <span>{t.trigger_count || 0} fires</span>
                {t.last_triggered_at && (
                  <span className="text-muted-foreground/50">{format(new Date(t.last_triggered_at), "MMM d HH:mm")}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => copyWebhookUrl(t.webhook_slug)}>
                  <Copy className="w-3 h-3" /> URL
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-emerald-400" onClick={() => handleTest(t)}>
                  <Play className="w-3 h-3" /> Test
                </Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => openEdit(t)}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateMutation.mutate({ id: t.id, data: { is_active: !t.is_active } })}>
                  {t.is_active ? "Disable" : "Enable"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Test panel modal */}
      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setTestResult(null); }}>
        <DialogContent className="max-w-xl bg-card">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              Test: {selected?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Slug</Label>
              <code className="block mt-1 text-xs bg-muted/40 border border-border rounded px-3 py-2 font-mono">{testSlug}</code>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Test Payload (JSON)</Label>
              <Textarea value={testPayload} onChange={e => setTestPayload(e.target.value)} rows={6} className="font-mono text-sm mt-1 bg-muted/30" />
            </div>
            {testResult && (
              <div className={`rounded-lg border p-3 ${testResult.success ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                  <span className={`text-xs font-semibold ${testResult.success ? "text-emerald-400" : "text-red-400"}`}>
                    {testResult.success ? "Success" : "Failed"}
                  </span>
                </div>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono overflow-auto max-h-32">
                  {JSON.stringify(testResult.data || testResult.error, null, 2)}
                </pre>
              </div>
            )}
            {selected?.last_payload_preview && !testResult && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Last Received Payload</p>
                <pre className="text-xs bg-muted/30 border border-border rounded p-3 font-mono overflow-auto max-h-24 text-muted-foreground">{selected.last_payload_preview}</pre>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setSelected(null); setTestResult(null); }}>Close</Button>
              <Button size="sm" onClick={runTest} disabled={testLoading} className="gap-1.5">
                {testLoading ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Fire Test
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit dialog */}
      <Dialog open={showCreate} onOpenChange={closeForm}>
        <DialogContent className="max-w-2xl bg-card max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono">{editing ? "Edit Trigger" : "New Trigger"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* Basic */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Name *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} onBlur={handleNameBlur} className="mt-1" placeholder="New Lead from Contact Form" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Source Type</Label>
                <Select value={form.source_type} onValueChange={v => setForm({...form, source_type: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCE_TYPES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Webhook Slug * (auto-generated)</Label>
                <Input value={form.webhook_slug} onChange={e => setForm({...form, webhook_slug: e.target.value})} className="mt-1 font-mono text-sm" placeholder="new-lead-contact-form-a1b2" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Secret Token (optional)</Label>
                <Input value={form.secret_token} onChange={e => setForm({...form, secret_token: e.target.value})} className="mt-1 font-mono text-sm" placeholder="sk_..." />
              </div>
            </div>

            {/* Target */}
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Target</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Target Type</Label>
                  <Select value={form.target_type} onValueChange={v => setForm({...form, target_type: v})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task">Spawn Task</SelectItem>
                      <SelectItem value="module">Invoke Module</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.target_type === "module" && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Target Module</Label>
                    <Select value={form.target_module} onValueChange={v => setForm({...form, target_module: v})}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select module" /></SelectTrigger>
                      <SelectContent>{modules.map(m => <SelectItem key={m.id} value={m.module_name}>{m.module_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {form.target_type === "task" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Task Name Template — use <code className="bg-muted px-1 rounded">{`{{field}}`}</code> from payload</Label>
                    <Input value={form.task_template?.task_name_template || ""} onChange={e => setForm({...form, task_template: {...form.task_template, task_name_template: e.target.value}})} className="mt-1 font-mono text-sm" placeholder="New lead: {{email}}" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Module</Label>
                      <Select value={form.task_template?.module || ""} onValueChange={v => setForm({...form, task_template: {...form.task_template, module: v}})}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Module" /></SelectTrigger>
                        <SelectContent>{modules.map(m => <SelectItem key={m.id} value={m.module_name}>{m.module_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Model</Label>
                      <Input value={form.task_template?.assigned_model || ""} onChange={e => setForm({...form, task_template: {...form.task_template, assigned_model: e.target.value}})} className="mt-1 font-mono text-sm" placeholder="llama3.1:8b" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Priority</Label>
                      <Select value={form.task_template?.priority || "2"} onValueChange={v => setForm({...form, task_template: {...form.task_template, priority: v}})}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>P{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payload Mapping */}
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Payload Mapping</p>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addMapping}>
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
              {(form.payload_mapping || []).length === 0 && (
                <p className="text-xs text-muted-foreground/60 font-mono">No mappings — payload passed through as-is</p>
              )}
              {(form.payload_mapping || []).map((m, i) => (
                <div key={i} className="grid grid-cols-7 gap-2 items-center">
                  <Input value={m.source_field} onChange={e => updateMapping(i, "source_field", e.target.value)} placeholder="payload.email" className="col-span-2 font-mono text-xs h-8" />
                  <ChevronRight className="w-3 h-3 text-muted-foreground col-span-1 mx-auto" />
                  <Input value={m.target_field} onChange={e => updateMapping(i, "target_field", e.target.value)} placeholder="prospect_email" className="col-span-2 font-mono text-xs h-8" />
                  <Select value={m.transform || ""} onValueChange={v => updateMapping(i, "transform", v)}>
                    <SelectTrigger className="h-8 text-xs col-span-1"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>none</SelectItem>
                      <SelectItem value="trim">trim</SelectItem>
                      <SelectItem value="lowercase">lowercase</SelectItem>
                      <SelectItem value="uppercase">uppercase</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" className="h-7 col-span-1 text-red-400" onClick={() => removeMapping(i)}>×</Button>
                </div>
              ))}
            </div>

            {/* Filter condition */}
            <div>
              <Label className="text-xs text-muted-foreground">Filter Condition <span className="text-muted-foreground/50">(optional JS expression, e.g. <code className="bg-muted px-1 rounded">payload.score &gt; 50</code>)</span></Label>
              <Input value={form.filter_condition} onChange={e => setForm({...form, filter_condition: e.target.value})} className="mt-1 font-mono text-sm" placeholder="payload.score > 50 && payload.niche === 'dental'" />
            </div>

            <div className="flex items-center gap-6">
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

          <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={closeForm}>Cancel</Button>
            <Button size="sm" disabled={!form.name || !form.webhook_slug}
              onClick={() => editing ? updateMutation.mutate({ id: editing.id, data: form }) : createMutation.mutate(form)}>
              {editing ? "Update" : "Create Trigger"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}