import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, ArrowDown, ArrowUp, GitMerge, AlertTriangle, CheckCircle2, Clock, FileText, Diff } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const FILE_META = {
  soul:          { color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", icon: "✦" },
  identity:      { color: "text-sky-400",    bg: "bg-sky-500/10 border-sky-500/20",       icon: "◈" },
  user:          { color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/20",icon: "◎" },
  current_state: { color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20",   icon: "▸" },
  playbook:      { color: "text-primary",    bg: "bg-primary/10 border-primary/20",        icon: "⊞" },
  memory_index:  { color: "text-teal-400",   bg: "bg-teal-500/10 border-teal-500/20",      icon: "⊟" },
  custom:        { color: "text-muted-foreground", bg: "bg-muted/50 border-border",        icon: "○" },
};

const SYNC_STATUS = {
  synced:       { label: "Synced",       icon: CheckCircle2, color: "text-emerald-400" },
  pending:      { label: "Pending",      icon: Clock,        color: "text-amber-400" },
  conflict:     { label: "Conflict",     icon: AlertTriangle,color: "text-red-400" },
  never_synced: { label: "Never Synced", icon: Clock,        color: "text-muted-foreground" },
  error:        { label: "Error",        icon: AlertTriangle,color: "text-red-400" },
};

export default function TruthSync() {
  const [selected, setSelected] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const queryClient = useQueryClient();

  const { data: files = [] } = useQuery({
    queryKey: ["truthFiles"],
    queryFn: () => base44.entities.TruthFile.list("-last_synced", 50),
  });

  const { data: history = [] } = useQuery({
    queryKey: ["syncHistory"],
    queryFn: () => base44.entities.SyncHistory.list("-created_date", 30),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TruthFile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["truthFiles"] });
      setSelected(null);
      toast.success("File updated");
    },
  });

  const logSync = (file_name, direction, status, notes = "") => {
    base44.entities.SyncHistory.create({ file_name, direction, status, notes, initiated_by: "operator" });
    queryClient.invalidateQueries({ queryKey: ["syncHistory"] });
  };

  const handlePull = (file) => {
    updateMutation.mutate({ id: file.id, data: { sync_status: "synced", last_synced: new Date().toISOString(), conflict_notes: "" } });
    logSync(file.file_name, "pull", "success", "Pulled latest from source file");
    toast.success(`Pulled: ${file.file_name}`);
  };

  const handlePush = (file) => {
    if (file.sync_status === "conflict") { toast.error("Resolve conflict before pushing"); return; }
    updateMutation.mutate({ id: file.id, data: { sync_status: "synced", last_synced: new Date().toISOString() } });
    logSync(file.file_name, "push", "success", "Pushed app state to source file");
    toast.success(`Pushed: ${file.file_name}`);
  };

  const openEdit = (file) => { setSelected(file); setEditContent(file.content || ""); };

  const syncedCount = files.filter(f => f.sync_status === "synced").length;
  const conflictCount = files.filter(f => f.sync_status === "conflict").length;
  const pendingCount = files.filter(f => f.sync_status === "pending").length;
  const lastSync = files.reduce((a, b) => (a.last_synced > b.last_synced ? a : b), {});

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Bridge Layer</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Truth Sync</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Emil's source-of-truth files · control layer bridge</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowHistory(true)}>
            <Clock className="w-3.5 h-3.5 mr-1.5" /> Sync History
          </Button>
        </div>
      </div>

      {/* Health strip */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { label: "Synced", value: syncedCount, color: "text-emerald-400" },
          { label: "Pending", value: pendingCount, color: "text-amber-400" },
          { label: "Conflicts", value: conflictCount, color: "text-red-400" },
          { label: "Last Sync", value: lastSync.last_synced ? format(new Date(lastSync.last_synced), "HH:mm") : "—", color: "text-muted-foreground" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-lg px-4 py-3">
            <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* File list */}
      <div className="border border-border rounded-xl overflow-hidden bg-card divide-y divide-border/60">
        {files.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground font-mono">— no truth files connected —</div>
        )}
        {files.map(f => {
          const meta = FILE_META[f.file_type] || FILE_META.custom;
          const ss = SYNC_STATUS[f.sync_status] || SYNC_STATUS.never_synced;
          const SIcon = ss.icon;
          return (
            <div key={f.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/10 group">
              {/* File type tag */}
              <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border flex-shrink-0 w-28 text-center ${meta.bg} ${meta.color}`}>
                {meta.icon} {f.file_type?.replace(/_/g, " ")}
              </span>

              {/* Name + changed fields */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground font-mono">{f.file_name}</p>
                {f.changed_fields?.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {f.changed_fields.map(cf => (
                      <span key={cf} className="text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">{cf}</span>
                    ))}
                  </div>
                )}
                {f.conflict_notes && (
                  <p className="text-xs text-red-400 mt-1">⚠ {f.conflict_notes}</p>
                )}
              </div>

              {/* Sync status */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <SIcon className={`w-3.5 h-3.5 ${ss.color}`} />
                <span className={`text-xs font-medium ${ss.color}`}>{ss.label}</span>
              </div>

              {/* Last synced */}
              <span className="text-xs font-mono text-muted-foreground flex-shrink-0 w-28 text-right">
                {f.last_synced ? format(new Date(f.last_synced), "MMM d HH:mm") : "never"}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handlePull(f)}>
                  <ArrowDown className="w-3 h-3" /> Pull
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handlePush(f)}>
                  <ArrowUp className="w-3 h-3" /> Push
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(f)}>
                  <FileText className="w-3 h-3 mr-1" /> View
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* File detail / edit modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl bg-card max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              {selected?.file_name}
              <span className="text-xs text-muted-foreground font-normal ml-1">— {selected?.file_type}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {selected.sync_status === "conflict" && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                  ⚠ Conflict: {selected.conflict_notes}
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">File Content</p>
                <Textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={16}
                  className="font-mono text-sm bg-muted/40"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Cancel</Button>
                <Button size="sm" onClick={() => updateMutation.mutate({ id: selected.id, data: { content: editContent, sync_status: "pending" } })}>
                  Save as Pending Push
                </Button>
                <Button size="sm" variant="outline" onClick={() => handlePush(selected)}>
                  <ArrowUp className="w-3.5 h-3.5 mr-1" /> Push Now
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sync history modal */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-xl bg-card">
          <DialogHeader><DialogTitle className="text-sm font-mono">Sync History</DialogTitle></DialogHeader>
          <div className="divide-y divide-border/60 max-h-96 overflow-y-auto">
            {history.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center font-mono">— no sync history —</p>}
            {history.map(h => (
              <div key={h.id} className="flex items-center gap-3 py-2.5">
                <span className={`text-xs font-mono font-semibold uppercase px-2 py-0.5 rounded ${h.direction === "pull" ? "bg-sky-500/10 text-sky-400" : h.direction === "push" ? "bg-violet-500/10 text-violet-400" : "bg-muted/50 text-muted-foreground"}`}>
                  {h.direction}
                </span>
                <span className="text-sm font-mono text-foreground">{h.file_name}</span>
                <span className={`text-xs ml-auto ${h.status === "success" ? "text-emerald-400" : "text-red-400"}`}>{h.status}</span>
                <span className="text-xs font-mono text-muted-foreground">{h.created_date && format(new Date(h.created_date), "MMM d HH:mm")}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}