import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Plus, Search, Archive, Star, Tag, ArrowRight, Copy } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const IMPORTANCE_META = {
  critical: { color: "text-red-400",          bg: "bg-red-500/10 border-red-500/20" },
  high:     { color: "text-amber-400",         bg: "bg-amber-500/10 border-amber-500/20" },
  medium:   { color: "text-primary",           bg: "bg-primary/10 border-primary/20" },
  low:      { color: "text-muted-foreground",  bg: "bg-muted/50 border-border" },
  noise:    { color: "text-muted-foreground/40", bg: "bg-muted/20 border-border/40" },
};

const TYPE_META = {
  reflection: "text-violet-400", decision: "text-sky-400", insight: "text-emerald-400",
  event: "text-amber-400", rule: "text-primary", observation: "text-teal-400",
  distilled: "text-emerald-400", raw: "text-muted-foreground",
};

const MEMORY_TYPES = ["reflection","decision","insight","event","rule","observation","distilled","raw"];
const IMPORTANCES = ["critical","high","medium","low","noise"];
const STATUSES = ["active","archived","stale","durable","migrated"];

const EMPTY_FORM = { title: "", memory_type: "reflection", source: "", importance: "medium", status: "active", tags: [], summary: "", full_content: "", linked_project: "", is_durable: false, memory_date: new Date().toISOString().split("T")[0] };

export default function MemoryBrowser() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [importanceFilter, setImportanceFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const queryClient = useQueryClient();

  const { data: memories = [] } = useQuery({
    queryKey: ["memoryRecords"],
    queryFn: () => base44.entities.MemoryRecord.list("-memory_date", 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MemoryRecord.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["memoryRecords"] }); setSelected(prev => prev ? { ...prev, ...arguments[0]?.variables?.data } : null); },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MemoryRecord.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["memoryRecords"] }); setShowCreate(false); setForm(EMPTY_FORM); toast.success("Memory created"); },
  });

  const quickUpdate = (id, data) => { updateMutation.mutate({ id, data }); toast.success("Updated"); };

  const filtered = memories.filter(m => {
    const matchSearch = !search || m.title?.toLowerCase().includes(search.toLowerCase()) || m.summary?.toLowerCase().includes(search.toLowerCase()) || m.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === "all" || m.memory_type === typeFilter;
    const matchImportance = importanceFilter === "all" || m.importance === importanceFilter;
    return matchSearch && matchType && matchImportance;
  });

  const durableCount = memories.filter(m => m.is_durable).length;
  const activeCount = memories.filter(m => m.status === "active").length;

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Memory Archive</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Memory Browser</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-foreground">{activeCount}</span> active · <span className="font-mono text-foreground">{durableCount}</span> durable · <span className="font-mono text-foreground">{memories.length}</span> total
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Memory
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search memories..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 bg-card text-sm" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 h-9 bg-card"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {MEMORY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={importanceFilter} onValueChange={setImportanceFilter}>
          <SelectTrigger className="w-36 h-9 bg-card"><SelectValue placeholder="Importance" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Importance</SelectItem>
            {IMPORTANCES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs font-mono text-muted-foreground">{filtered.length} shown</span>
      </div>

      {/* Memory list */}
      <div className="border border-border rounded-xl overflow-hidden bg-card divide-y divide-border/60">
        {filtered.length === 0 && <div className="text-center py-16 text-sm text-muted-foreground font-mono">— no memories match —</div>}
        {filtered.map(m => {
          const impMeta = IMPORTANCE_META[m.importance] || IMPORTANCE_META.medium;
          return (
            <div key={m.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/10 group cursor-pointer" onClick={() => setSelected(m)}>
              <div className="flex-shrink-0 w-20 text-right">
                <span className="text-xs font-mono text-muted-foreground/60">{m.memory_date && format(new Date(m.memory_date), "MMM d")}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-foreground">{m.title}</p>
                  {m.is_durable && <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">{m.summary}</p>
                {m.tags?.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {m.tags.slice(0,3).map(t => <span key={t} className="text-xs text-muted-foreground/60 bg-muted/40 px-1.5 py-0.5 rounded">#{t}</span>)}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs font-mono ${TYPE_META[m.memory_type] || "text-muted-foreground"}`}>{m.memory_type}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${impMeta.bg} ${impMeta.color}`}>{m.importance}</span>
                {m.status !== "active" && <span className="text-xs text-muted-foreground/60 capitalize">{m.status}</span>}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => quickUpdate(m.id, { is_durable: !m.is_durable })}>
                  <Star className={`w-3 h-3 ${m.is_durable ? "text-amber-400" : ""}`} />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => quickUpdate(m.id, { status: "archived" })}>
                  <Archive className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-xl bg-card max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              {selected?.title}
              {selected?.is_durable && <Star className="w-3.5 h-3.5 text-amber-400" />}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs font-mono ${TYPE_META[selected.memory_type] || ""}`}>{selected.memory_type}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${(IMPORTANCE_META[selected.importance] || IMPORTANCE_META.medium).bg} ${(IMPORTANCE_META[selected.importance] || IMPORTANCE_META.medium).color}`}>{selected.importance}</span>
                <span className="text-xs text-muted-foreground">{selected.memory_date}</span>
                {selected.source && <span className="text-xs text-muted-foreground">· {selected.source}</span>}
              </div>
              {selected.summary && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1.5">Summary</p>
                  <p className="text-sm">{selected.summary}</p>
                </div>
              )}
              {selected.full_content && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1.5">Full Content</p>
                  <div className="bg-muted/40 border border-border rounded-lg p-3 max-h-48 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">{selected.full_content}</p>
                  </div>
                </div>
              )}
              {selected.tags?.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {selected.tags.map(t => <span key={t} className="text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">#{t}</span>)}
                </div>
              )}
              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap pt-2 border-t border-border">
                <Button size="sm" variant="outline" className="text-xs" onClick={() => { quickUpdate(selected.id, { is_durable: true, status: "durable" }); setSelected(p => ({...p, is_durable: true, status: "durable"})); }}>
                  <Star className="w-3 h-3 mr-1" /> Mark Durable
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => { quickUpdate(selected.id, { status: "stale" }); setSelected(p => ({...p, status: "stale"})); }}>
                  Mark Stale
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => { quickUpdate(selected.id, { status: "archived" }); setSelected(null); }}>
                  <Archive className="w-3 h-3 mr-1" /> Archive
                </Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => { navigator.clipboard.writeText(selected.full_content || selected.summary || ""); toast.success("Copied"); }}>
                  <Copy className="w-3 h-3 mr-1" /> Copy
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>
        <DialogContent className="max-w-lg bg-card max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-sm font-mono">Add Memory</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Title *</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="mt-1" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={form.memory_type} onValueChange={v => setForm({...form, memory_type: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{MEMORY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Importance</Label>
                <Select value={form.importance} onValueChange={v => setForm({...form, importance: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{IMPORTANCES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input type="date" value={form.memory_date} onChange={e => setForm({...form, memory_date: e.target.value})} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Summary</Label>
              <Textarea value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} className="mt-1" rows={2} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Full Content</Label>
              <Textarea value={form.full_content} onChange={e => setForm({...form, full_content: e.target.value})} className="mt-1" rows={5} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Source</Label>
              <Input value={form.source} onChange={e => setForm({...form, source: e.target.value})} className="mt-1" placeholder="conversation, reflection, file..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={() => createMutation.mutate(form)} disabled={!form.title}>Save Memory</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}