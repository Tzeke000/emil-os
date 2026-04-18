import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import StatusBadge from "../components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, AlertTriangle, Check, Archive, Search, ExternalLink, Copy, Inbox as InboxIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const CLASSIFICATION_META = {
  interested: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  not_now: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  wrong_contact: { color: "text-muted-foreground", bg: "bg-muted/50 border-border" },
  question: { color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
  price_objection: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  no_thanks: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  spam: { color: "text-muted-foreground", bg: "bg-muted/50 border-border" },
  needs_human_review: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

export default function Inbox() {
  const [filter, setFilter] = useState("new");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [editResponse, setEditResponse] = useState("");

  const queryClient = useQueryClient();
  const { data: replies = [] } = useQuery({
    queryKey: ["replies"],
    queryFn: () => base44.entities.Reply.list("-date_received", 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Reply.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["replies"] }),
  });

  const filtered = replies.filter(r => {
    const matchFilter = filter === "all" || r.status === filter;
    const matchSearch = !search || r.prospect_name?.toLowerCase().includes(search.toLowerCase()) || r.reply_text?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const selected = replies.find(r => r.id === selectedId);

  const markStatus = (id, status) => {
    updateMutation.mutate({ id, data: { status } });
    toast.success(`Marked as ${status}`);
    // Auto-advance to next in queue
    const idx = filtered.findIndex(r => r.id === id);
    const next = filtered[idx + 1] || filtered[idx - 1];
    if (next && next.id !== id) setSelectedId(next.id);
    else if (filtered.length <= 1) setSelectedId(null);
  };

  const statusCounts = {
    new: replies.filter(r => r.status === "new").length,
    in_review: replies.filter(r => r.status === "in_review").length,
    responded: replies.filter(r => r.status === "responded").length,
    escalated: replies.filter(r => r.status === "escalated").length,
    archived: replies.filter(r => r.status === "archived").length,
  };

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <InboxIcon className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Reply Queue</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Inbox</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-foreground">{statusCounts.new}</span> new · <span className="font-mono text-foreground">{replies.length}</span> total
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[
          { key: "new", label: "New", count: statusCounts.new },
          { key: "in_review", label: "In Review", count: statusCounts.in_review },
          { key: "responded", label: "Responded", count: statusCounts.responded },
          { key: "escalated", label: "Escalated", count: statusCounts.escalated },
          { key: "all", label: "All", count: replies.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {label}
            {count > 0 && <span className={`font-mono font-bold text-xs ${filter === key ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{count}</span>}
          </button>
        ))}

        <div className="relative ml-auto min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm bg-card" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Queue list */}
        <div className="lg:col-span-2 space-y-1 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
          {filtered.map(r => {
            const meta = CLASSIFICATION_META[r.classification] || {};
            return (
              <button
                key={r.id}
                onClick={() => { setSelectedId(r.id); setEditResponse(r.suggested_response || ""); }}
                className={`w-full text-left rounded-xl border p-3 transition-all ${selectedId === r.id ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-primary/20 hover:bg-muted/20"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-foreground">{r.prospect_name}</p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{r.reply_text}</p>
                <div className="flex items-center gap-1.5">
                  {r.classification && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${meta.bg} ${meta.color}`}>
                      {r.classification.replace(/_/g, " ")}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground/60 capitalize ml-1">{r.channel}</span>
                  {r.date_received && <span className="text-xs text-muted-foreground/60 ml-auto font-mono">{format(new Date(r.date_received), "MMM d")}</span>}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm font-mono">— queue empty —</div>
          )}
        </div>

        {/* Detail pane */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 sticky top-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground">{selected.prospect_name}</h3>
                    {selected.prospect_id && (
                      <Link to={`/prospects/${selected.prospect_id}`} className="text-muted-foreground hover:text-primary transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {selected.channel} · {selected.date_received && format(new Date(selected.date_received), "MMM d, h:mm a")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selected.classification && (() => { const meta = CLASSIFICATION_META[selected.classification] || {}; return (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${meta.bg} ${meta.color}`}>{selected.classification.replace(/_/g, " ")}</span>
                  ); })()}
                  <StatusBadge status={selected.status} />
                </div>
              </div>

              {/* Incoming message */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1.5">Incoming Message</p>
                <div className="bg-muted/50 border border-border rounded-lg p-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selected.reply_text}</p>
                </div>
              </div>

              {/* Suggested response */}
              {selected.suggested_response && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Suggested Response</p>
                    <button
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                      onClick={() => { navigator.clipboard.writeText(editResponse); toast.success("Copied"); }}
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <Textarea
                    value={editResponse}
                    onChange={e => setEditResponse(e.target.value)}
                    rows={5}
                    className="text-sm bg-primary/5 border-primary/20 font-sans"
                  />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap pt-1 border-t border-border">
                <Button size="sm" onClick={() => markStatus(selected.id, "responded")} disabled={selected.status === "responded"}>
                  <Send className="w-3.5 h-3.5 mr-1.5" /> Mark Sent
                </Button>
                <Button size="sm" variant="outline" onClick={() => markStatus(selected.id, "in_review")} disabled={selected.status === "in_review"}>
                  <Check className="w-3.5 h-3.5 mr-1.5" /> In Review
                </Button>
                <Button size="sm" variant="outline" onClick={() => markStatus(selected.id, "escalated")} disabled={selected.status === "escalated"}>
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Escalate
                </Button>
                <Button size="sm" variant="ghost" onClick={() => markStatus(selected.id, "archived")} disabled={selected.status === "archived"}>
                  <Archive className="w-3.5 h-3.5 mr-1.5" /> Archive
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm bg-card border border-border rounded-xl">
              <MessageSquare className="w-5 h-5 mr-2 opacity-40" /> Select a reply to view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}