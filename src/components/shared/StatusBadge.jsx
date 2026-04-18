import { cn } from "@/lib/utils";

const statusStyles = {
  found: "bg-muted-foreground/10 text-muted-foreground",
  scored: "bg-primary/10 text-primary",
  ready_for_outreach: "bg-primary/20 text-primary",
  contacted: "bg-warning/10 text-warning",
  follow_up_due: "bg-warning/20 text-warning",
  replied: "bg-success/10 text-success",
  interested: "bg-success/20 text-success",
  closed_won: "bg-success/10 text-success",
  closed_lost: "bg-destructive/10 text-destructive",
  archived: "bg-muted-foreground/10 text-muted-foreground",
  // Inbox
  new: "bg-primary/10 text-primary",
  reviewed: "bg-warning/10 text-warning",
  responded: "bg-success/10 text-success",
  escalated: "bg-destructive/10 text-destructive",
  // Approval
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  denied: "bg-destructive/10 text-destructive",
  deferred: "bg-muted-foreground/10 text-muted-foreground",
};

export default function StatusBadge({ status }) {
  const formatted = (status || "").replace(/_/g, " ");
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize",
      statusStyles[status] || "bg-muted text-muted-foreground"
    )}>
      {formatted}
    </span>
  );
}