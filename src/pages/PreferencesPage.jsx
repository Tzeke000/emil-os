import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SlidersHorizontal, Plus, Pencil, Check, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const CATEGORY_META = {
  communication:    { color: "text-sky-400",     bg: "bg-sky-500/10 border-sky-500/20" },
  decision_making:  { color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20" },
  output_format:    { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  escalation:       { color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  workflow:         { color: "text-primary",      bg: "bg-primary/10 border-primary/20" },
  tone:             { color: "text-rose-400",     bg: "bg-rose-500/10 border-rose-500/20" },
  other:            { color: "text-muted-foreground", bg: "bg-muted/40 border-border" },
};

const STRENGTH_META = {
  weak:     "text-muted-foreground",
  moderate: "text-foreground",
  strong:   "text-primary",
  absolute: "text-red-400 font-semibold",
};

const CATEGORIES = Object.keys(CATEGORY_META);
const STRENGTHS = ["weak","moderate","strong","absolute"];

const EMPTY_FORM = {
  preference: "", category: "communication", strength: "strong",
  source: "", last_reinforced: new Date().toISOString().split("T")[0],
  notes: "", is_active: true,
};

export default function PreferencesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [catFilter, setCatFilter] = useState("all");

  const { data: prefs = [] } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => base44.entities.Preference.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Preference.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["preferences"] }); setShowCreate(false); setForm(EMPTY_FORM); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Preference.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["preferences"] }); setEditingId(null); },
  });

  const filtered = catFilter === "all" ? prefs : prefs.filter(p => p.category === catFilter);
  const active = filtered.filter(p => p.is_active !== false);
  const inactive = filtered.filter(p => p.is_active === false);

  const openEdit = (p) => {
    setForm({ ...EMPTY_FORM, ...p });
    setEditingId(p.id);
    setShowCreate(true);
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Operating Preferences</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Preferences</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{active.length} active preferences shaping how Emil operates.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowCreate(true); }}>
          <Plus className="w-4 h-4" /> Add Preference
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        {["all", ...CATEGORIES].map(c => {
          const meta = CATEGORY_META[c];
          return (
            <button key={c} onClick={() => setCatFilter(c)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors",
                catFilter === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              )}>
              {c.replace(/_/g, " ")}
            </button>
          );
        })}
      </div>

      {/* Active list */}
      <div className="border border-border rounded-xl bg-card divide-y divide-border/60 overflow-hidden mb-4">
        {active.length === 0 && (
          <p className="px-5 py-8 text-sm text-muted-foreground/50 font-mono text-center">— no preferences defined —</p>
        )}
        {active.map(p => {
          const meta = CATEGORY_META[p.category] || CATEGORY_META.other;
          return (
            <div key={p.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/10 group">
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded border capitalize flex-shrink-0", meta.bg, meta.color)}>
                {p.category?.replace(/_/g, " ")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{p.preference}</p>
                {p.notes && <p className="text-xs text-muted-foreground/60 mt-0.5">{p.notes}</p>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs capitalize ${STRENGTH_META[p.strength] || ""}`}>{p.strength}</span>
                {p.last_reinforced && (
                  <span className="text-xs font-mono text-muted-foreground/50">{format(new Date(p.last_reinforced), "MMM d")}</span>
                )}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => openEdit(p)}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                  onClick={() => updateMutation.mutate({ id: p.id, data: { is_active: false } })}>
                  Disable
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {inactive.length > 0 && (
        <p className="text-xs text-muted-foreground/50 font-mono">{inactive.length} inactive preferences hidden</p>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={showCreate} onOpenChange={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono">{editingId ? "Edit Preference" : "New Preference"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Preference *</Label>
              <Input value={form.preference} onChange={e => setForm({ ...form, preference: e.target.value })} placeholder="Prefers concise bullet-point updates..." className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g," ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Strength</Label>
                <Select value={form.strength} onValueChange={v => setForm({ ...form, strength: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STRENGTHS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Source</Label>
              <Input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="User feedback, observed pattern, explicit rule..." className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Context or exceptions..." rows={2} className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Last Reinforced</Label>
              <Input type="date" value={form.last_reinforced} onChange={e => setForm({ ...form, last_reinforced: e.target.value })} className="mt-1 text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>Cancel</Button>
              <Button size="sm" disabled={!form.preference}
                onClick={() => editingId
                  ? updateMutation.mutate({ id: editingId, data: form })
                  : createMutation.mutate(form)}>
                {editingId ? "Update" : "Add Preference"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}