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
import { Plus, Brain, Archive, Pencil } from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = ["business_model", "niche", "offer", "pricing", "milestone", "blocker", "strategy_rule", "script_angle", "next_action", "distilled_update", "archived_truth"];
const PRIORITIES = ["critical", "high", "medium", "low"];

const priorityColors = {
  critical: "bg-destructive/10 text-destructive",
  high: "bg-warning/10 text-warning",
  medium: "bg-primary/10 text-primary",
  low: "bg-muted-foreground/10 text-muted-foreground",
};

export default function Memory() {
  const [catFilter, setCatFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ key: "", category: "business_model", value: "", priority: "medium", is_active: true, source: "" });

  const queryClient = useQueryClient();
  const { data: memories = [] } = useQuery({
    queryKey: ["memories"],
    queryFn: () => base44.entities.MemoryTruth.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MemoryTruth.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["memories"] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MemoryTruth.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["memories"] }); closeForm(); },
  });

  const closeForm = () => { setShowCreate(false); setEditingId(null); setForm({ key: "", category: "business_model", value: "", priority: "medium", is_active: true, source: "" }); };

  const openEdit = (m) => {
    setForm({ key: m.key, category: m.category, value: m.value, priority: m.priority || "medium", is_active: m.is_active !== false, source: m.source || "" });
    setEditingId(m.id); setShowCreate(true);
  };

  const handleSave = () => {
    const data = { ...form, last_distilled: new Date().toISOString() };
    if (editingId) { updateMutation.mutate({ id: editingId, data }); } else { createMutation.mutate(data); }
  };

  const activeMemories = memories.filter(m => m.is_active !== false);
  const archivedMemories = memories.filter(m => m.is_active === false);

  const filtered = (catFilter === "archived" ? archivedMemories : activeMemories).filter(m => {
    return catFilter === "all" || catFilter === "archived" || m.category === catFilter;
  });

  // Group by category
  const grouped = {};
  filtered.forEach(m => {
    const cat = m.category || "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(m);
  });

  return (
    <div className="p-6 max-w-7xl">
      <PageHeader title="Memory / Truth Panel" subtitle="Emil's compressed working memory">
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> Add Truth</Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-48 h-9 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            {CATEGORIES.filter(c => c !== "archived_truth").map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Brain className="w-3 h-3" /> {cat.replace(/_/g, " ")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map(m => (
                <Card key={m.id} className="bg-card border-border hover:border-primary/20 transition-colors cursor-pointer" onClick={() => openEdit(m)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-medium text-foreground font-mono">{m.key}</p>
                      <Badge className={`text-xs ${priorityColors[m.priority] || priorityColors.medium}`}>{m.priority}</Badge>
                    </div>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap mt-1">{m.value}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {m.source && <span className="text-xs text-muted-foreground">Source: {m.source}</span>}
                      {m.last_distilled && <span className="text-xs text-muted-foreground ml-auto">Updated {format(new Date(m.last_distilled), "MMM d")}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">No memory entries found</div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader><DialogTitle>{editingId ? "Edit Truth" : "New Truth"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Key *</Label>
              <Input value={form.key} onChange={e => setForm({...form, key: e.target.value})} className="mt-1 bg-background font-mono" placeholder="e.g. current_niche" />
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
              <Label className="text-xs">Value *</Label>
              <Textarea value={form.value} onChange={e => setForm({...form, value: e.target.value})} className="mt-1 bg-background" rows={4} />
            </div>
            <div>
              <Label className="text-xs">Source</Label>
              <Input value={form.source} onChange={e => setForm({...form, source: e.target.value})} className="mt-1 bg-background" placeholder="Where this truth came from" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} />
              <Label className="text-xs">Active (uncheck to archive)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.key || !form.value}>{editingId ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}