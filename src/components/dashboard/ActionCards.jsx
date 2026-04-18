import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "../shared/StatusBadge";
import { Zap, Clock, AlertTriangle, PauseCircle, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

function WidgetCard({ title, icon: Icon, children, linkTo }) {
  const Wrapper = linkTo ? Link : "div";
  return (
    <Card className="bg-card border-border hover:border-primary/20 transition-colors">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {children}
      </CardContent>
    </Card>
  );
}

function ProspectRow({ prospect }) {
  return (
    <Link to={`/prospects/${prospect.id}`} className="flex items-center justify-between py-1.5 hover:bg-muted/50 rounded px-1.5 -mx-1.5 transition-colors">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{prospect.business_name}</p>
        <p className="text-xs text-muted-foreground">{prospect.contact_name}</p>
      </div>
      <StatusBadge status={prospect.status} />
    </Link>
  );
}

export default function ActionCards({ prospects, replies, approvals, activities }) {
  const today = new Date().toISOString().split("T")[0];
  
  const followUpsDue = prospects
    .filter(p => p.next_follow_up_date && p.next_follow_up_date <= today && !["closed_won", "closed_lost", "archived"].includes(p.status))
    .slice(0, 5);

  const stalledProspects = prospects
    .filter(p => p.status === "contacted" && p.last_contacted_date && new Date(p.last_contacted_date) < new Date(Date.now() - 5 * 24 * 60 * 60 * 1000))
    .slice(0, 5);

  const pendingApprovals = approvals.filter(a => a.status === "pending").slice(0, 5);

  const newReplies = replies.filter(r => r.status === "new").slice(0, 5);

  const nextBestAction = getNextBestAction(prospects, replies, approvals);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {/* Next Best Action */}
      <Card className="bg-primary/5 border-primary/20 md:col-span-2 lg:col-span-1">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Next Best Action
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-sm text-foreground font-medium">{nextBestAction.action}</p>
          <p className="text-xs text-muted-foreground mt-1">{nextBestAction.reason}</p>
        </CardContent>
      </Card>

      {/* Follow-ups Due */}
      <WidgetCard title="Follow-ups Due" icon={Clock}>
        {followUpsDue.length === 0 ? (
          <p className="text-xs text-muted-foreground">No follow-ups due today</p>
        ) : (
          followUpsDue.map(p => <ProspectRow key={p.id} prospect={p} />)
        )}
      </WidgetCard>

      {/* Urgent Replies */}
      <WidgetCard title="New Replies" icon={Activity}>
        {newReplies.length === 0 ? (
          <p className="text-xs text-muted-foreground">No new replies</p>
        ) : (
          newReplies.map(r => (
            <Link key={r.id} to="/inbox" className="block py-1.5 hover:bg-muted/50 rounded px-1.5 -mx-1.5 transition-colors">
              <p className="text-sm font-medium text-foreground truncate">{r.prospect_name}</p>
              <p className="text-xs text-muted-foreground truncate">{r.reply_text}</p>
            </Link>
          ))
        )}
      </WidgetCard>

      {/* Stalled Leads */}
      <WidgetCard title="Stalled Leads" icon={PauseCircle}>
        {stalledProspects.length === 0 ? (
          <p className="text-xs text-muted-foreground">No stalled leads</p>
        ) : (
          stalledProspects.map(p => <ProspectRow key={p.id} prospect={p} />)
        )}
      </WidgetCard>

      {/* Awaiting Approval */}
      <WidgetCard title="Awaiting Approval" icon={AlertTriangle}>
        {pendingApprovals.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing pending</p>
        ) : (
          pendingApprovals.map(a => (
            <Link key={a.id} to="/approvals" className="block py-1.5 hover:bg-muted/50 rounded px-1.5 -mx-1.5 transition-colors">
              <p className="text-sm font-medium text-foreground">{a.item_type?.replace(/_/g, " ")}</p>
              <p className="text-xs text-muted-foreground truncate">{a.reason}</p>
            </Link>
          ))
        )}
      </WidgetCard>

      {/* Activity Log */}
      <WidgetCard title="Recent Activity" icon={Activity}>
        {(!activities || activities.length === 0) ? (
          <p className="text-xs text-muted-foreground">No recent activity</p>
        ) : (
          activities.slice(0, 5).map(a => (
            <div key={a.id} className="py-1">
              <p className="text-xs text-foreground">{a.action}</p>
              <p className="text-xs text-muted-foreground">{a.module} · {format(new Date(a.created_date), "h:mm a")}</p>
            </div>
          ))
        )}
      </WidgetCard>
    </div>
  );
}

function getNextBestAction(prospects, replies, approvals) {
  const pendingApprovals = approvals.filter(a => a.status === "pending");
  if (pendingApprovals.length > 0) {
    return { action: `Review ${pendingApprovals.length} pending approval(s)`, reason: "Approvals block automated actions" };
  }
  const newReplies = replies.filter(r => r.status === "new");
  if (newReplies.length > 0) {
    return { action: `Process ${newReplies.length} new reply/replies`, reason: "Hot leads cool fast — respond now" };
  }
  const readyForOutreach = prospects.filter(p => p.status === "ready_for_outreach");
  if (readyForOutreach.length > 0) {
    return { action: `Send outreach to ${readyForOutreach.length} ready prospects`, reason: "Scored and ready — time to reach out" };
  }
  const unscored = prospects.filter(p => p.status === "found");
  if (unscored.length > 0) {
    return { action: `Score ${unscored.length} new prospects`, reason: "Move found leads through the pipeline" };
  }
  return { action: "Find new prospects", reason: "Pipeline needs fresh leads to keep moving" };
}