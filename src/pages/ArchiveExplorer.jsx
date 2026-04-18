import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Archive, Star, Calendar, Tag, Layers } from "lucide-react";
import { format, parseISO } from "date-fns";

const IMPORTANCE_META = {
  critical: "text-red-400", high: "text-amber-400", medium: "text-primary",
  low: "text-muted-foreground", noise: "text-muted-foreground/30",
};

const GROUP_BY_OPTIONS = ["date", "category", "importance", "source"];

export default function ArchiveExplorer() {
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState("date");
  const [selected, setSelected] = useState(null);

  const { data: memories = [] } = useQuery({
    queryKey: ["memoryRecords"],
    queryFn: () => base44.entities.MemoryRecord.list("-memory_date", 500),
  });

  const { data: migrations = [] } = useQuery({
    queryKey: ["migrations"],
    queryFn: () => base44.entities.MemoryMigration.list("-created_date", 100),
  });

  const { data: syncHistory = [] } = useQuery({
    queryKey: ["syncHistory"],
    queryFn: () => base44.entities.SyncHistory.list("-created_date", 50),
  });

  const archived = memories.filter(m => ["archived","stale","migrated"].includes(m.status) || m.status !== "active");

  const filtered = archived.filter(m => {
    if (!search) return true;
    return m.title?.toLowerCase().includes(search.toLowerCase()) ||
      m.summary?.toLowerCase().includes(search.toLowerCase()) ||
      m.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
  });

  // Group
  const grouped = {};
  filtered.forEach(m => {
    let key = "";
    if (groupBy === "date") key = m.memory_date ? m.memory_date.substring(0, 7) : "unknown";
    else if (groupBy === "category") key = m.memory_type || "unknown";
    else if (groupBy === "importance") key = m.importance || "unknown";
    else if (groupBy === "source") key = m.source || "no source";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (groupBy === "importance") {
      const order = ["critical","high","medium","low","noise","unknown"];
      return order.indexOf(a) - order.indexOf(b);
    }
    return b.localeCompare(a);
  });

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Archive className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Historical Record</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Archive Explorer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-foreground">{archived.length}</span> archived records · <span className="font-mono text-foreground">{memories.filter(m => m.is_durable).length}</span> durable
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <p className="text-lg font-bold font-mono text-foreground">{memories.filter(m => m.is_durable).length}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Star className="w-3 h-3 text-amber-400" /> Durable Memories</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <p className="text-lg font-bold font-mono text-foreground">{memories.filter(m => m.status === "stale").length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Stale Memories</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <p className="text-lg font-bold font-mono text-foreground">{migrations.filter(m => m.status === "completed").length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Migrations Done</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <p className="text-lg font-bold font-mono text-foreground">{syncHistory.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Sync Events</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search archive..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 bg-card text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Group by</span>
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-32 h-9 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>{GROUP_BY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <span className="text-xs font-mono text-muted-foreground">{filtered.length} records</span>
      </div>

      {/* Grouped records */}
      <div className="space-y-4">
        {sortedKeys.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground font-mono bg-card border border-border rounded-xl">— archive is empty —</div>
        )}
        {sortedKeys.map(key => (
          <div key={key} className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-muted/20 border-b border-border/60">
              {groupBy === "date" && <Calendar className="w-3.5 h-3.5 text-muted-foreground" />}
              {groupBy === "importance" && <Star className="w-3.5 h-3.5 text-muted-foreground" />}
              {groupBy === "category" && <Layers className="w-3.5 h-3.5 text-muted-foreground" />}
              {groupBy === "source" && <Tag className="w-3.5 h-3.5 text-muted-foreground" />}
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground font-mono capitalize">{key}</span>
              <span className="text-xs font-mono text-muted-foreground/60 ml-1">{grouped[key].length}</span>
            </div>
            <div className="divide-y divide-border/40">
              {grouped[key].map(m => (
                <button key={m.id} onClick={() => setSelected(m)} className="w-full flex items-center gap-4 px-5 py-3 hover:bg-muted/10 text-left transition-colors group">
                  <div className="flex-shrink-0 w-16">
                    {m.memory_date && <span className="text-xs font-mono text-muted-foreground/50">{format(new Date(m.memory_date), "MMM d")}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{m.title}</p>
                      {m.is_durable && <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                    </div>
                    {m.summary && <p className="text-xs text-muted-foreground truncate mt-0.5">{m.summary}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                    <span className={`font-mono ${IMPORTANCE_META[m.importance] || "text-muted-foreground"}`}>{m.importance}</span>
                    <span className="text-muted-foreground/50 capitalize">{m.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-xl bg-card max-h-[75vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              {selected?.title}
              {selected?.is_durable && <Star className="w-3.5 h-3.5 text-amber-400" />}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="font-mono">{selected.memory_type}</span>
                <span className={IMPORTANCE_META[selected.importance]}>{selected.importance}</span>
                <span className="capitalize">{selected.status}</span>
                {selected.source && <span>{selected.source}</span>}
                {selected.memory_date && <span className="font-mono">{selected.memory_date}</span>}
              </div>
              {selected.summary && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Summary</p>
                  <p className="text-sm">{selected.summary}</p>
                </div>
              )}
              {selected.full_content && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Full Content</p>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}