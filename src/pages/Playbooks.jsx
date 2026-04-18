import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Check, BookOpen } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["lead_scoring", "follow_up", "escalation", "approval", "cost_saving", "disqualification", "qualification", "pricing", "outreach"];

export default function Playbooks() {
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const { data: playbooks = [] } = useQuery({
    queryKey: ["playbooks"],
    queryFn: () => base44.entities.Playbook.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Playbook.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbooks"] });
      setShowCreate(false);
      setForm({});
      toast.success("Playbook created");
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Playbooks" description={`${playbooks.length} operational playbooks`}>
        <Button size="sm" onClick={() => { setForm({}); setShowCreate(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Playbook
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {playbooks.map(p => (
          <Card key={p.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelected(p)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs capitalize">{p.category?.replace(/_/g, " ")}</Badge>
                {p.approved ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                    <Check className="h-3 w-3 mr-1" /> Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Draft</Badge>
                )}
              </div>
              <CardTitle className="text-sm mt-1">{p.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {p.priority && <span className="font-mono">P{p.priority}</span>}

                {p.times_applied > 0 && <span>Used {p.times_applied}x</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> {selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant="secondary" className="capitalize">{selected.category?.replace(/_/g, " ")}</Badge>
                {selected.approved && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>}
              </div>
              {selected.description && <p className="text-sm">{selected.description}</p>}
              {selected.trigger_condition && (
                <div>
                  <Label className="text-xs text-muted-foreground">Trigger</Label>
                  <p className="text-sm mt-1 bg-muted p-2 rounded">{selected.trigger_condition}</p>
                </div>
              )}
              {selected.rule_steps && selected.rule_steps.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Rule Steps</Label>
                  <div className="bg-muted rounded-lg p-4 mt-1 space-y-1">
                    {selected.rule_steps.map((step, i) => (
                      <p key={i} className="text-sm">{i + 1}. {step}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Playbook</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category || ""} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority || ""} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["1","2","3","4","5"].map(p => <SelectItem key={p} value={p}>P{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Trigger Condition</Label>
              <Input value={form.trigger_condition || ""} onChange={e => setForm({ ...form, trigger_condition: e.target.value })} />
            </div>
            <div>
              <Label>Rule Steps (one per line)</Label>
              <Textarea
                value={Array.isArray(form.rule_steps) ? form.rule_steps.join("\n") : (form.rule_steps || "")}
                onChange={e => setForm({ ...form, rule_steps: e.target.value.split("\n").filter(Boolean) })}
                rows={5}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.approved || false} onCheckedChange={v => setForm({ ...form, approved: v })} />
              <Label>Approved for use</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.category}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}