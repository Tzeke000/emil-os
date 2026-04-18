import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Zap, Clock, AlertTriangle, PauseCircle, MessageSquare, ArrowRight, Activity, Target, Users, Send, CheckCircle, TrendingUp } from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";

function getNextBestAction(prospects, replies, approvals) {
  const pendingApprovals = approvals.filter(a => a.status === "pending");
  if (pendingApprovals.length > 0) return { action: `Review ${pendingApprovals.length} pending approval(s)`, reason: "Approvals are blocking automated actions. Unblock the queue to resume.", link: "/approvals", urgency: "critical" };
  const newReplies = replies.filter(r => r.status === "new");
  if (newReplies.length > 0) return { action: `Process ${newReplies.length} new ${newReplies.length === 1 ? "reply" : "replies"} in inbox`, reason: "Hot leads cool fast. Every hour without a response drops conversion by ~15%.", link: "/inbox", urgency: "high" };
  const readyForOutreach = prospects.filter(p => p.status === "ready_for_outreach");
  if (readyForOutreach.length > 0) return { action: `Send outreach to ${readyForOutreach.length} ready prospects`, reason: "These leads are scored and waiting. Send now to maintain pipeline velocity.", link: "/prospects", urgency: "medium" };
  const unscored = prospects.filter(p => p.status === "found");
  if (unscored.length > 0) return { action: `Score ${unscored.length} new prospect(s)`, reason: "Unscored leads don't move. Run scoring to unlock outreach.", link: "/prospects", urgency: "medium" };
  return { action: "Find new prospects", reason: "Pipeline needs fresh leads. Target: 20 new per day.", link: "/prospects", urgency: "low" };
}

const urgencyStyle = {
  critical: { bar: "bg-destructive", label: "CRITICAL", labelClass: "text-destructive", border: "border-destructive/30 bg-destructive/5" },
  high: { bar: "bg-amber-500", label: "HIGH PRIORITY", labelClass: "text-amber-400", border: "border-amber-500/30 bg-amber-500/5" },
  medium: { bar: "bg-primary", label: "NEXT UP", labelClass: "text-primary", border: "border-primary/30 bg-primary/5" },
  low: { bar: "bg-muted-foreground", label: "QUEUED", labelClass: "text-muted-foreground", border: "border-border bg-card" },
};

function SectionLabel({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{children}</p>;
}

function ProspectRow({ prospect }) {
  return (
    <Link to={`/prospects/${prospect.id}`} className="flex items-center justify-between py-2 hover:bg-muted/40 rounded-md px-2 -mx-2 transition-colors group">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{prospect.business_name}</p>
        <p className="text-xs text-muted-foreground">{prospect.city}{prospect.state ? `, ${prospect.state}` : ""}</p>
      </div>
      <StatusBadge status={prospect.status} />
    </Link>
  );
}

function WidgetPanel({ title, icon: Icon, children, linkTo, linkLabel }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Icon className="w-3.5 h-3.5" />
          {title}
        </div>
        {linkTo && <Link to={linkTo} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">{linkLabel || "View all"} <ArrowRight className="w-3 h-3" /></Link>}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const { data: prospects = [] } = useQuery({ queryKey: ["prospects"], queryFn: () => base44.entities.Prospect.list("-created_date", 100) });
  const { data: settings } = useQuery({ queryKey: ["agentSettings"], queryFn: async () => { const l = await base44.entities.AgentSettings.list("-created_date", 1); return l[0] || null; } });
  const { data: replies = [] } = useQuery({ queryKey: ["replies"], queryFn: () => base44.entities.Reply.list("-created_date", 50) });
  const { data: approvals = [] } = useQuery({ queryKey: ["approvals"], queryFn: () => base44.entities.Approval.list("-created_date", 50) });

  const { data: activities = [] } = useQuery({ queryKey: ["activityLog"], queryFn: () => base44.entities.ActivityLog.list("-created_date", 20) });

  const nba = getNextBestAction(prospects, replies, approvals);
  const style = urgencyStyle[nba.urgency];
  const today = new Date().toISOString().split("T")[0];

  const totalProspects = prospects.length;
  const inPipeline = prospects.filter(p => !["archived", "closed_lost"].includes(p.status)).length;
  const closedWon = prospects.filter(p => p.status === "closed_won").length;
  const newRepliesCount = replies.filter(r => r.status === "new").length;
  const pendingApprovalsCount = approvals.filter(a => a.status === "pending").length;
  const outreachSent = prospects.filter(p => ["contacted", "follow_up_due", "replied", "interested", "closed_won", "closed_lost"].includes(p.status)).length;

  const followUpsDue = prospects.filter(p => p.next_followup_date && p.next_followup_date <= today && !["closed_won", "closed_lost", "archived"].includes(p.status)).slice(0, 5);
  const stalledProspects = prospects.filter(p => p.status === "contacted" && p.last_contacted_date && new Date(p.last_contacted_date) < new Date(Date.now() - 5 * 86400000)).slice(0, 5);
  const newReplies = replies.filter(r => r.status === "new").slice(0, 4);
  const pendingApprovals = approvals.filter(a => a.status === "pending").slice(0, 4);

  return (
    <div className="p-6 space-y-6 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Emil OS · Live</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Command Center</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground font-mono">{format(new Date(), "EEE, MMM d yyyy")}</p>
          <p className="text-xs text-muted-foreground font-mono">{format(new Date(), "HH:mm")}</p>
        </div>
      </div>

      {/* Next Best Action — Hero Block */}
      <Link to={nba.link} className={`block border rounded-xl p-5 transition-all hover:shadow-md ${style.border}`}>
        <div className="flex items-start gap-4">
          <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${style.bar}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className={`w-4 h-4 ${style.labelClass}`} />
              <span className={`text-xs font-bold tracking-widest uppercase font-mono ${style.labelClass}`}>{style.label}</span>
            </div>
            <p className="text-lg font-semibold text-foreground leading-snug">{nba.action}</p>
            <p className="text-sm text-muted-foreground mt-1">{nba.reason}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
        </div>
      </Link>

      {/* Pulse Metrics Strip */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: "In Pipeline", value: inPipeline, icon: TrendingUp, alert: false },
          { label: "Outreach Sent", value: outreachSent, icon: Send, alert: false },
          { label: "New Replies", value: newRepliesCount, icon: MessageSquare, alert: newRepliesCount > 0 },
          { label: "Follow-ups Due", value: followUpsDue.length, icon: Clock, alert: followUpsDue.length > 0 },
          { label: "Pending Approval", value: pendingApprovalsCount, icon: AlertTriangle, alert: pendingApprovalsCount > 0 },
          { label: "Closed Won", value: closedWon, icon: CheckCircle, alert: false },
        ].map(({ label, value, icon: Icon, alert }) => (
          <div key={label} className={`bg-card border rounded-lg p-3 ${alert && value > 0 ? "border-amber-500/30" : "border-border"}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={`w-3.5 h-3.5 ${alert && value > 0 ? "text-amber-400" : "text-muted-foreground"}`} />
            </div>
            <p className={`text-xl font-bold font-mono ${alert && value > 0 ? "text-amber-400" : "text-foreground"}`}>{value}</p>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Queue Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <WidgetPanel title="New Replies" icon={MessageSquare} linkTo="/inbox" linkLabel="Inbox">
          {newReplies.length === 0 ? <p className="text-xs text-muted-foreground py-2">No new replies</p> : newReplies.map(r => (
            <Link key={r.id} to="/inbox" className="block py-2 px-2 -mx-2 hover:bg-muted/40 rounded transition-colors">
              <p className="text-sm font-medium text-foreground truncate">{r.prospect_name}</p>
              <p className="text-xs text-muted-foreground truncate">{r.classification?.replace(/_/g, " ")} · {r.channel}</p>
            </Link>
          ))}
        </WidgetPanel>

        <WidgetPanel title="Awaiting Approval" icon={AlertTriangle} linkTo="/approvals">
          {pendingApprovals.length === 0 ? <p className="text-xs text-muted-foreground py-2">Queue clear</p> : pendingApprovals.map(a => (
            <Link key={a.id} to="/approvals" className="block py-2 px-2 -mx-2 hover:bg-muted/40 rounded transition-colors">
              <p className="text-sm font-medium text-foreground capitalize">{a.item_type?.replace(/_/g, " ")}</p>
              <p className="text-xs text-muted-foreground truncate">{a.reason}</p>
            </Link>
          ))}
        </WidgetPanel>

        <WidgetPanel title="Follow-ups Due" icon={Clock} linkTo="/prospects">
          {followUpsDue.length === 0 ? <p className="text-xs text-muted-foreground py-2">All clear</p> : followUpsDue.map(p => <ProspectRow key={p.id} prospect={p} />)}
        </WidgetPanel>

        <WidgetPanel title="Stalled Leads" icon={PauseCircle} linkTo="/prospects">
          {stalledProspects.length === 0 ? <p className="text-xs text-muted-foreground py-2">No stalled leads</p> : stalledProspects.map(p => <ProspectRow key={p.id} prospect={p} />)}
        </WidgetPanel>
      </div>

      {/* Activity Log */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Activity className="w-3.5 h-3.5" />
            Agent Activity Log
          </div>
        </div>
        {activities.length === 0 ? (
          <p className="text-xs text-muted-foreground">No activity recorded</p>
        ) : (
          <div className="space-y-0">
            {activities.slice(0, 8).map((a, i) => (
              <div key={a.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{a.action}</p>
                  {a.related_entity_name && <p className="text-xs text-muted-foreground">{a.related_entity_name}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{a.module}</span>
                  {a.created_date && <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(a.created_date), "h:mm a")}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}