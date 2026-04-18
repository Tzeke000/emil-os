import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import StatusBadge from "../components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, ShieldCheck, ExternalLink, Zap } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const ITEM_TYPE_META = {
  risky_reply: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  pricing_change: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  refund: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  sensitive_language: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  strategy_shift: { color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  unusual_request: { color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
  high_value_outreach: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  other: { color: "text-muted-foreground", bg: "bg-muted/50 border-border" },
};

export default function Approvals() {
  const [filter, setFilter] = useState("pending");
  const [reviewNotes, setReviewNotes] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  const queryClient = useQueryClient();
  const { data: approvals = [] } = useQuery({
    queryKey: ["approvals"],
    queryFn: () => base44.entities.Approval.list("-created_date", 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Approval.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["approvals"] }),
  });

  const handleDecision = (id, status) => {
    updateMutation.mutate({ id, data: { status, reviewer_notes: reviewNotes[id] || "" } });
    toast.success(`Decision: ${status}`);
    setExpandedId(null);
  };

  const filtered = approvals.filter(a => filter === "all" || a.status === filter);

  const counts = {
    pending: approvals.filter(a => a.status === "pending").length,
    approved: approvals.filter(a => a.status === "approved").length,
    denied: approvals.filter(a => a.status === "denied").length,
    deferred: approvals.filter(a => a.status === "deferred").length,
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Human in the Loop</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Approval Queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-foreground">{counts.pending}</span> pending review
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {[
          { key: "pending", label: "Pending", count: counts.pending, alert: true },
          { key: "approved", label: "Approved", count: counts.approved },
          { key: "denied", label: "Denied", count: counts.denied },
          { key: "deferred", label: "Deferred", count: counts.deferred },
          { key: "all", label: "All", count: approvals.length },
        ].map(({ key, label, count, alert }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === key
                ? "bg-primary text-primary-foreground"
                : alert && count > 0
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {count > 0 && <span className={`font-mono font-bold ${filter === key ? "text-primary-foreground/80" : ""}`}>{count}</span>}
          </button>
        ))}
      </div>

      {/* Queue */}
      <div className="space-y-2">
        {filtered.map(a => {
          const meta = ITEM_TYPE_META[a.item_type] || ITEM_TYPE_META.other;
          const isExpanded = expandedId === a.id;

          return (
            <div key={a.id} className={`border rounded-xl bg-card overflow-hidden transition-all ${a.status === "pending" ? "border-amber-500/20" : "border-border"}`}>
              {/* Row header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : a.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors text-left"
              >
                {/* Type tag */}
                <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border flex-shrink-0 ${meta.bg} ${meta.color}`}>
                  {a.item_type?.replace(/_/g, " ")}
                </span>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {a.linked_prospect_name && (
                      <p className="text-sm font-semibold text-foreground">{a.linked_prospect_name}</p>
                    )}
                    <p className="text-sm text-muted-foreground truncate">{a.reason}</p>
                  </div>
                  {!isExpanded && a.proposed_action && (
                    <p className="text-xs text-muted-foreground/60 truncate mt-0.5 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {a.proposed_action}
                    </p>
                  )}
                </div>

                {/* Right meta */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {a.created_date && <span className="text-xs font-mono text-muted-foreground">{format(new Date(a.created_date), "MMM d")}</span>}
                  <StatusBadge status={a.status} />
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-border/60 space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1.5">Reason</p>
                      <p className="text-sm text-foreground">{a.reason}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Proposed Action
                      </p>
                      <p className="text-sm text-foreground bg-muted/40 rounded-lg px-3 py-2">{a.proposed_action}</p>
                    </div>
                  </div>

                  {a.linked_prospect_id && (
                    <div>
                      <Link to={`/prospects/${a.linked_prospect_id}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                        <ExternalLink className="w-3 h-3" /> View Prospect: {a.linked_prospect_name}
                      </Link>
                    </div>
                  )}

                  {a.status === "pending" && (
                    <div className="space-y-3 pt-2 border-t border-border/60">
                      <Textarea
                        placeholder="Reviewer notes (optional)..."
                        value={reviewNotes[a.id] || ""}
                        onChange={e => setReviewNotes({ ...reviewNotes, [a.id]: e.target.value })}
                        className="text-sm"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleDecision(a.id, "approved")}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDecision(a.id, "denied")}>
                          <XCircle className="w-3.5 h-3.5 mr-1.5" /> Deny
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDecision(a.id, "deferred")}>
                          <Clock className="w-3.5 h-3.5 mr-1.5" /> Defer
                        </Button>
                      </div>
                    </div>
                  )}

                  {a.reviewer_notes && a.status !== "pending" && (
                    <div className="pt-2 border-t border-border/60">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Reviewer Notes</p>
                      <p className="text-sm text-foreground/80">{a.reviewer_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-sm font-mono bg-card border border-border rounded-xl">
            — {filter === "pending" ? "queue is clear" : "no items"} —
          </div>
        )}
      </div>
    </div>
  );
}