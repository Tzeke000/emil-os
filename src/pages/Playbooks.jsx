import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "../components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, BookOpen, CheckCircle, Trash2 } from "lucide-react";

const CATEGORIES = ["scoring", "follow_up", "escalation", "approval", "cost_optimization", "disqualification", "qualification", "general"];
const PRIORITIES = ["critical", "high", "medium", "low"];

export default function Playbooks() {
  const [catFilter, setCatFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", category: "general", description: "", rule_steps: [""], trigger_condition: "", priority: "medium", approved: false });

  const queryClient = useQueryClient();
  const { data: playbooks = [] } = useQuery({
    queryKey: ["playbooks"],
    queryFn: () => base44.entities.Playbook.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Playbook.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["playbooks"] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Playbook.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["playbooks"] }); closeForm(); },
  });

  const closeForm = () => { setShowCreate(false); setEditingId(null); setForm({ name: "", category: "general", description: "", rule_steps: [""], trigger_condition: "", priority: "medium", approved: false }); };

  const openEdit = (p) => {
    setForm({ name: p.name, category: p.category, description: p.description || "", rule_steps: p.rule_steps?.length ? p.rule_steps : [""], trigger_condition: p.trigger_condition || "", priority: p.priority || "medium", approved: p.approved || false });
    setEditingId(p.id); setShowCreate(true);
  };

  const handleSave = () => {
    if (editingId) { updateMutation.mutate({ id: editingId, data: form }); } else { createMutation.mutate(form); }
  };

  const addStep = () => {
    setForm({ ...form, rule_steps: [...form.rule_steps, ""] });
  };

  const updateStep = (index, value) => {
    const steps = [...form.rule_steps];
    steps[index] = value;
    setForm({ ...form, rule_steps: steps });
  };

  const removeStep = (index) => {
    setForm({ ...form, rule_steps: form.rule_steps.filter((_, i) => i !== index) });
  };

  const filtered = playbooks.filter(p => catFilter === "all" || p.category === catFilter);

  return (
    <div className="p-6 max-w-7xl">
      <PageHeader title="Playbooks" subtitle="Operational decision rules">
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Playbook</Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4">
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-48 h-9 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(p => (
          <Card key={p.id} className="bg-card border-border hover:border-primary/20 transition-colors cursor-pointer" onClick={() => openEdit(p)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                </div>
                {p.approved && <CheckCircle className="w-3.5 h-3.5 text-success" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">{p.category?.replace(/_/g, " ")}</Badge>
                <Badge variant="outline" className="text-xs">{p.priority}</Badge>
                {p.rule_steps?.length > 0 && <span className="text-xs text-muted-foreground">{p.rule_steps.length} step{p.rule_steps.length !== 1 ? "s" : ""}</span>}
              </div>
              {p.trigger_condition && <p className="text-xs text-primary/70 mt-2 font-mono">Trigger: {p.trigger_condition}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-lg bg-card max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit Playbook" : "New Playbook"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1 bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1 bg-background" rows={2} />
            </div>
            <div>
              <Label className="text-xs">Trigger Condition</Label>
              <Input value={form.trigger_condition} onChange={e => setForm({...form, trigger_condition: e.target.value})} className="mt-1 bg-background font-mono text-sm" placeholder="When should this playbook activate?" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Rule Steps</Label>
                <Button size="sm" variant="outline" onClick={addStep}><Plus className="w-3 h-3 mr-1" /> Step</Button>
              </div>
              <div className="space-y-2">
                {form.rule_steps.map((step, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-xs text-muted-foreground w-6 font-mono">{i + 1}.</span>
                    <Input value={step} onChange={e => updateStep(i, e.target.value)} className="bg-background text-sm h-8 flex-1" placeholder="Rule step instruction" />
                    {form.rule_steps.length > 1 && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeStep(i)}>
                        <Trash2 className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.approved} onCheckedChange={v => setForm({...form, approved: v})} />
              <Label className="text-xs">Approved</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name}>{editingId ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}