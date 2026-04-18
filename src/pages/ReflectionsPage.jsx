import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Plus, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const TYPE_META = {
  daily:    { color: "text-primary",     bg: "bg-primary/10 border-primary/20",      label: "Daily" },
  task:     { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Task" },
  failure:  { color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",       label: "Failure" },
  strategy: { color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20", label: "Strategy" },
};

const IMPORTANCE_META = {
  low:      "text-muted-foreground",
  medium:   "text-foreground",
  high:     "text-amber-400",
  critical: "text-red-400",
};

const WRITE_FIELDS = [
  { key: "what_happened",  label: "What happened", placeholder: "Describe the situation or event..." },
  { key: "what_worked",    label: "What worked",   placeholder: "What went well, even partially..." },
  { key: "what_failed",    label: "What failed",   placeholder: "What didn't work or fell short..." },
  { key: "what_surprised", label: "What surprised Emil", placeholder: "Anything unexpected..." },
  { key: "what_learned",   label: "What Emil learned", placeholder: "The actual insight or pattern..." },
  { key: "what_to_change", label: "What Emil should change next", placeholder: "Concrete adjustment or rule..." },
];

const EMPTY_FORM = {
  date: new Date().toISOString().split("T")[0],
  reflection_type: "daily",
  trigger: "",
  what_happened: "", what_worked: "", what_failed: "",
  what_surprised: "", what_learned: "", what_to_change: "",
  importance: "medium",
};

export default function ReflectionsPage() {
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: reflections = [] } = useQuery({
    queryKey: ["reflections"],
    queryFn: () => base44.entities.Reflection.list("-date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Reflection.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reflections"] }); setShowNew(false); setForm(EMPTY_FORM); },
  });

  const filtered = typeFilter === "all" ? reflections : reflections.filter(r => r.reflection_type === typeFilter);

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Emil's Inner Work</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Reflections</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{reflections.length} entries — patterns, failures, and growth.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4" /> New Reflection
        </Button>
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        {["all", "daily", "task", "failure", "strategy"].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors",
              typeFilter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            )}>
            {t}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm font-mono bg-card border border-border rounded-xl">— no reflections yet —</div>
        )}
        {filtered.map(r => {
          const meta = TYPE_META[r.reflection_type] || TYPE_META.daily;
          return (
            <button key={r.id} onClick={() => setSelected(r)}
              className="w-full text-left border border-border rounded-xl bg-card px-5 py-4 hover:bg-muted/10 transition-colors group">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded border capitalize", meta.bg, meta.color)}>{meta.label}</span>
                    <span className={`text-xs font-semibold capitalize ${IMPORTANCE_META[r.importance] || ""}`}>{r.importance}</span>
                    <span className="text-xs font-mono text-muted-foreground ml-auto">{r.date ? format(new Date(r.date), "MMM d, yyyy") : ""}</span>
                  </div>
                  {r.trigger && <p className="text-sm font-medium text-foreground mb-1">{r.trigger}</p>}
                  {r.what_learned && <p className="text-sm text-muted-foreground truncate">{r.what_learned}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground mt-1 flex-shrink-0" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl bg-card max-h-[85vh] overflow-y-auto">
          {selected && (() => {
            const meta = TYPE_META[selected.reflection_type] || TYPE_META.daily;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-sm">
                    <span className={cn("px-2 py-0.5 rounded border text-xs", meta.bg, meta.color)}>{meta.label}</span>
                    {selected.date && format(new Date(selected.date), "MMMM d, yyyy")}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  {selected.trigger && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Trigger</p>
                      <p className="text-sm text-foreground">{selected.trigger}</p>
                    </div>
                  )}
                  {WRITE_FIELDS.map(f => selected[f.key] && (
                    <div key={f.key}>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">{f.label}</p>
                      <p className="text-sm text-foreground leading-relaxed">{selected[f.key]}</p>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* New reflection dialog */}
      <Dialog open={showNew} onOpenChange={() => { setShowNew(false); setForm(EMPTY_FORM); }}>
        <DialogContent className="max-w-2xl bg-card max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono">New Reflection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={form.reflection_type} onValueChange={v => setForm({ ...form, reflection_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Importance</Label>
                <Select value={form.importance} onValueChange={v => setForm({ ...form, importance: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low","medium","high","critical"].map(v => <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Trigger</Label>
              <Input value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })} placeholder="What prompted this..." className="mt-1" />
            </div>
            {WRITE_FIELDS.map(f => (
              <div key={f.key}>
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <Textarea value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} rows={2} className="mt-1 text-sm" />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => { setShowNew(false); setForm(EMPTY_FORM); }}>Cancel</Button>
              <Button size="sm" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>Save Reflection</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}