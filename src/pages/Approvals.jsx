import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "../components/shared/PageHeader";
import StatusBadge from "../components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, ShieldCheck } from "lucide-react";

export default function Approvals() {
  const [filter, setFilter] = useState("pending");
  const [reviewNotes, setReviewNotes] = useState({});

  const queryClient = useQueryClient();
  const { data: approvals = [] } = useQuery({
    queryKey: ["approvalItems"],
    queryFn: () => base44.entities.ApprovalItem.list("-created_date", 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ApprovalItem.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["approvalItems"] }),
  });

  const handleDecision = (id, status) => {
    updateMutation.mutate({ id, data: { status, reviewer_notes: reviewNotes[id] || "" } });
  };

  const filtered = approvals.filter(a => filter === "all" || a.status === filter);

  const urgencyColors = {
    critical: "bg-destructive/10 text-destructive border-destructive/30",
    high: "bg-warning/10 text-warning border-warning/30",
    medium: "bg-primary/10 text-primary border-primary/30",
    low: "bg-muted-foreground/10 text-muted-foreground",
  };

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader title="Approval Queue" subtitle={`${approvals.filter(a => a.status === "pending").length} pending`} />

      <div className="flex items-center gap-3 mb-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36 h-9 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
            <SelectItem value="deferred">Deferred</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map(a => (
          <Card key={a.id} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium capitalize">{a.item_type?.replace(/_/g, " ")}</span>
                  {a.linked_prospect_name && <span className="text-xs text-muted-foreground">· {a.linked_prospect_name}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${urgencyColors[a.urgency] || urgencyColors.medium}`}>{a.urgency}</Badge>
                  <StatusBadge status={a.status} />
                </div>
              </div>
              <div className="space-y-2 mt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Reason</p>
                  <p className="text-sm text-foreground">{a.reason}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Proposed Action</p>
                  <p className="text-sm text-foreground">{a.proposed_action}</p>
                </div>
                {a.context && (
                  <div>
                    <p className="text-xs text-muted-foreground">Context</p>
                    <p className="text-sm text-foreground/80">{a.context}</p>
                  </div>
                )}
              </div>
              {a.status === "pending" && (
                <div className="mt-3 pt-3 border-t border-border">
                  <Textarea
                    placeholder="Reviewer notes..."
                    value={reviewNotes[a.id] || ""}
                    onChange={e => setReviewNotes({ ...reviewNotes, [a.id]: e.target.value })}
                    className="bg-background text-sm mb-2"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleDecision(a.id, "approved")}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDecision(a.id, "denied")}>
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Deny
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDecision(a.id, "deferred")}>
                      <Clock className="w-3.5 h-3.5 mr-1" /> Defer
                    </Button>
                  </div>
                </div>
              )}
              {a.reviewer_notes && a.status !== "pending" && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">Reviewer Notes</p>
                  <p className="text-sm text-foreground/80">{a.reviewer_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">No items in queue</div>
        )}
      </div>
    </div>
  );
}