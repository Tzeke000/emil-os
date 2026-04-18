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
import { Plus, Edit2, Archive } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const CATEGORIES = [
  "business_model", "niche", "offer", "pricing", "milestone",
  "blocker", "strategic_rule", "script_angle", "next_action",
  "distilled_update", "archived_truth"
];

const catColors = {
  business_model: "bg-blue-500/10 text-blue-400",
  niche: "bg-cyan-500/10 text-cyan-400",
  offer: "bg-emerald-500/10 text-emerald-400",
  pricing: "bg-amber-500/10 text-amber-400",
  milestone: "bg-purple-500/10 text-purple-400",
  blocker: "bg-red-500/10 text-red-400",
  strategic_rule: "bg-indigo-500/10 text-indigo-400",
  script_angle: "bg-teal-500/10 text-teal-400",
  next_action: "bg-rose-500/10 text-rose-400",
  distilled_update: "bg-slate-500/10 text-slate-400",
  archived_truth: "bg-slate-500/10 text-slate-400",
};

export default function MemoryPanel() {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const { data: memories = [] } = useQuery({
    queryKey: ["memories-all"],
    queryFn: () => base44.entities.Memory.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Memory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories-all"] });
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      setShowCreate(false);
      setForm({});
      toast.success("Memory saved");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Memory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories-all"] });
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      setEditing(null);
      toast.success("Memory updated");
    },
  });

  const activeMemories = memories.filter(m => m.is_active && m.category !== "archived_truth");
  const archivedMemories = memories.filter(m => !m.is_active || m.category === "archived_truth");

  return (
    <div className="space-y-6">
      <PageHeader title="Memory / Truth Panel" description="Emil's compressed working memory">
        <Button size="sm" onClick={() => { setForm({}); setShowCreate(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Memory
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {activeMemories.map(m => (
          <Card key={m.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={`text-xs capitalize ${catColors[m.category] || ""}`}>
                    {m.category?.replace(/_/g, " ")}
                  </Badge>
                  {m.priority && <span className="text-xs text-muted-foreground font-mono">P{m.priority}</span>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setEditing(m); setForm(m); }}>
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
              <CardTitle className="text-sm">{m.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{m.content}</p>
              {m.last_verified && (
                <p className="text-xs text-muted-foreground mt-2">
                  Verified: {format(new Date(m.last_verified), "MMM d, yyyy")}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {archivedMemories.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Archive className="h-3.5 w-3.5" /> Archived ({archivedMemories.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {archivedMemories.map(m => (
              <Card key={m.id} className="opacity-60">
                <CardContent className="py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs capitalize">{m.category?.replace(/_/g, " ")}</Badge>
                    <span className="text-sm font-medium">{m.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{m.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showCreate || !!editing} onOpenChange={() => { setShowCreate(false); setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Memory" : "Add Memory"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Category *</Label>
              <Select value={form.category || ""} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title *</Label>
              <Input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Content *</Label>
              <Textarea value={form.content || ""} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority (1-5)</Label>
                <Input type="number" min={1} max={5} value={form.priority || ""} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={form.is_active !== false} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={() => {
              if (editing) {
                const { id, created_date, updated_date, created_by, ...updates } = form;
                updateMutation.mutate({ id: editing.id, data: updates });
              } else {
                createMutation.mutate({ ...form, is_active: form.is_active !== false });
              }
            }} disabled={!form.category || !form.title || !form.content}>
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}