import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Brain, Pencil, ChevronDown, ChevronUp, Archive } from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = ["business_model", "niche", "offer", "pricing", "milestone", "blocker", "strategic_rule", "script_angle", "next_action", "distilled_update", "archived_truth"];

const CAT_META = {
  business_model: { color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
  niche: { color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  offer: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  pricing: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  milestone: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  blocker: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  strategic_rule: { color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  script_angle: { color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/20" },
  next_action: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  distilled_update: { color: "text-muted-foreground", bg: "bg-muted/50 border-border" },
  archived_truth: { color: "text-muted-foreground", bg: "bg-muted/30 border-border" },
};

const PRIORITY_DOT = {
  1: "bg-red-400", 2: "bg-amber-400", 3: "bg-primary", 4: "bg-muted-foreground", 5: "bg-muted-foreground/40",
};

const EMPTY_FORM = { category: "business_model", title: "", content: "", is_active: true, priority: 3 };

export default function Memory() {
  const [catFilter, setCatFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expandedCats, setExpandedCats] = useState({});
  const queryClient = useQueryClient();

  const { data: memories = [] } = useQuery({
    queryKey: ["memories"],
    queryFn: () => base44.entities.Memory.list("-priority", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Memory.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["memories"] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Memory.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["memories"] }); closeForm(); },
  });

  const closeForm = () => { setShowCreate(false); setEditingId(null); setForm(EMPTY_FORM); };
  const openEdit = (m) => { setForm({ category: m.category, title: m.title, content: m.content, is_active: m.is_active !== false, priority: m.priority || 3 }); setEditingId(m.id); setShowCreate(true); };
  const handleSave = () => { if (editingId) { updateMutation.mutate({ id: editingId, data: form }); } else { createMutation.mutate(form); } };
  const toggleCat = (cat) => setExpandedCats(p => ({ ...p, [cat]: !p[cat] }));

  const activeMemories = memories.filter(m => m.is_active !== false && catFilter === "all" || (m.is_active !== false && m.category === catFilter));
  const finalFiltered = catFilter === "archived"
    ? memories.filter(m => m.is_active === false)
    : memories.filter(m => m.is_active !== false && (catFilter === "all" || m.category === catFilter));

  const grouped = {};
  finalFiltered.forEach(m => {
    const cat = m.category || "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(m);
  });

  const totalActive = memories.filter(m => m.is_active !== false).length;

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Agent State</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Memory / Truth Panel</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-foreground">{totalActive}</span> active truths loaded into context
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Inject Truth
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {["all", "archived", ...CATEGORIES.filter(c => c !== "archived_truth")].map(c => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${catFilter === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {c === "all" ? `All (${memories.filter(m => m.is_active !== false).length})` : c.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Memory groups — terminal card style */}
      <div className="space-y-3">
        {Object.entries(grouped).map(([cat, items]) => {
          const meta = CAT_META[cat] || CAT_META.distilled_update;
          const isExpanded = expandedCats[cat] !== false;
          return (
            <div key={cat} className="border border-border rounded-xl overflow-hidden bg-card">
              {/* Category header */}
              <button
                onClick={() => toggleCat(cat)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
              >
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest ${meta.color}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {cat.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-muted-foreground font-mono ml-1">{items.length}</span>
                <span className="ml-auto text-muted-foreground">
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>

              {/* Memory rows */}
              {isExpanded && (
                <div className="divide-y divide-border/50">
                  {items.map(m => (
                    <div
                      key={m.id}
                      onClick={() => openEdit(m)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 cursor-pointer group transition-colors"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[m.priority] || "bg-muted-foreground/40"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground font-mono">{m.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{m.content}</p>
                        {m.last_verified && (
                          <p className="text-xs text-muted-foreground/60 mt-1 font-mono">verified {format(new Date(m.last_verified), "MMM d")}</p>
                        )}
                      </div>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-sm font-mono">
            — no memory entries match this filter —
          </div>
        )}
      </div>

      {/* Edit / Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono text-sm">
              <Brain className="w-4 h-4 text-primary" />
              {editingId ? "Edit Truth" : "Inject New Truth"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Title / Key *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1 font-mono" placeholder="e.g. current_primary_offer" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Priority (1=critical)</Label>
                <Select value={String(form.priority)} onValueChange={v => setForm({ ...form, priority: Number(v) })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map(p => <SelectItem key={p} value={String(p)}>P{p}{p===1?" — critical":p===2?" — high":""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Content *</Label>
              <Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="mt-1" rows={4} placeholder="State the truth clearly and concisely..." />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label className="text-xs text-muted-foreground">{form.is_active ? "Active — loaded into context" : "Archived — excluded from context"}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeForm}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!form.title || !form.content}>{editingId ? "Update" : "Inject"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}