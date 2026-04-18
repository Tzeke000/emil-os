import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Zap, Clock, AlertTriangle, PauseCircle, MessageSquare,
  ArrowRight, RefreshCw, BookOpen, CheckCircle
} from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";
import PresencePanel from "../components/dashboard/PresencePanel";

function getNextBestAction(prospects, replies, approvals) {
  const pendingApprovals = approvals.filter(a => a.status === "pending");
  if (pendingApprovals.length > 0) return { action: `Review ${pendingApprovals.length} pending approval(s)`, reason: "Approvals are blocking automated actions. Unblock the queue to resume.", link: "/approvals", urgency: "critical" };
  const newReplies = replies.filter(r => r.status === "new");
  if (newReplies.length > 0) return { action: `Process ${newReplies.length} new ${newReplies.length === 1 ? "reply" : "replies"} in inbox`, reason: "Hot leads cool fast. Every hour without a response drops conversion ~15%.", link: "/inbox", urgency: "high" };
  const readyForOutreach = prospects.filter(p => p.status === "ready_for_outreach");
  if (readyForOutreach.length > 0) return { action: `Send outreach to ${readyForOutreach.length} ready prospect(s)`, reason: "These leads are scored and waiting. Send now to maintain pipeline velocity.", link: "/prospects", urgency: "medium" };
  const unscored = prospects.filter(p => p.status === "found");
  if (unscored.length > 0) return { action: `Score ${unscored.length} new prospect(s)`, reason: "Unscored leads don't move. Run scoring to unlock outreach.", link: "/prospects", urgency: "medium" };
  return { action: "Find new prospects", reason: "Pipeline needs fresh leads. Target: 20 new per day.", link: "/prospects", urgency: "low" };
}

const urgencyStyle = {
  critical: { bar: "bg-destructive", label: "CRITICAL",    labelClass: "text-destructive", border: "border-destructive/30 bg-destructive/5" },
  high:     { bar: "bg-amber-500",   label: "HIGH PRIORITY",labelClass: "text-amber-400",  border: "border-amber-500/30 bg-amber-500/5" },
  medium:   { bar: "bg-primary",     label: "NEXT UP",      labelClass: "text-primary",    border: "border-primary/30 bg-primary/5" },
  low:      { bar: "bg-muted-foreground", label: "QUEUED",  labelClass: "text-muted-foreground", border: "border-border bg-card" },
};

function WidgetPanel({ title, icon: Icon, children, linkTo, linkLabel, alert }) {
  return (
    <div className={`bg-card border rounded-xl p-4 ${alert ? "border-amber-500/20" : "border-border"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest ${alert ? "text-amber-400" : "text-muted-foreground"}`}>
          <Icon className="w-3.5 h-3.5" />
          {title}
        </div>
        {linkTo && (
          <Link to={linkTo} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">
            {linkLabel || "View all"} <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
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

export default function Dashboard() {
  const { data: prospects = [] } = useQuery({ queryKey: ["prospects"], queryFn: () => base44.entities.Prospect.list("-created_date", 100) });
  const { data: replies = [] } = useQuery({ queryKey: ["replies"], queryFn: () => base44.entities.Reply.list("-created_date", 50) });
  const { data: approvals = [] } = useQuery({ queryKey: ["approvals"], queryFn: () => base44.entities.Approval.list("-created_date", 50) });
  const { data: truthFiles = [] } = useQuery({ queryKey: ["truthFiles"], queryFn: () => base44.entities.TruthFile.list("-created_date", 20), staleTime: 60000 });
  const { data: reflections = [] } = useQuery({ queryKey: ["reflections"], queryFn: () => base44.entities.Reflection.list("-date", 5) });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => base44.entities.Task.list("-created_date", 100) });
  const { data: stateList = [] } = useQuery({ queryKey: ["mindState"], queryFn: () => base44.entities.MindState.list("-updated_date", 1) });

  const mindState = stateList[0] || null;
  const nba = getNextBestAction(prospects, replies, approvals);
  const style = urgencyStyle[nba.urgency];
  const today = new Date().toISOString().split("T")[0];

  const newReplies = replies.filter(r => r.status === "new");
  const pendingApprovals = approvals.filter(a => a.status === "pending");
  const followUpsDue = prospects.filter(p => p.next_followup_date && p.next_followup_date <= today && !["closed_won", "closed_lost", "archived"].includes(p.status)).slice(0, 5);
  const syncConflicts = truthFiles.filter(f => f.sync_status === "conflict");
  const reviewTasks = tasks.filter(t => ["blocked", "escalated", "waiting"].includes(t.state)).slice(0, 4);
  const recentReflections = reflections.slice(0, 3);

  return (
    <div className="p-6 space-y-5 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Emil · Online</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {format(new Date(), "EEEE")}
          </h1>
          <p className="text-sm text-muted-foreground font-mono">{format(new Date(), "MMMM d, yyyy")}</p>
        </div>
        <div className="text-right text-xs font-mono text-muted-foreground">
          <p>{format(new Date(), "h:mm a")} CT</p>
        </div>
      </div>

      {/* Next Best Action */}
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

      {/* Presence Panel */}
      <PresencePanel state={mindState} />

      {/* Objective / Blocker callout from mind state */}
      {(mindState?.current_objective || mindState?.current_blocker) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mindState.current_objective && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Current Objective</p>
              <p className="text-sm text-foreground">{mindState.current_objective}</p>
            </div>
          )}
          {mindState.current_blocker && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-1">Current Blocker</p>
              <p className="text-sm text-foreground">{mindState.current_blocker}</p>
            </div>
          )}
        </div>
      )}

      {/* Action Queue Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <WidgetPanel title="Replies Waiting" icon={MessageSquare} linkTo="/inbox" alert={newReplies.length > 0}>
          {newReplies.length === 0
            ? <p className="text-xs text-muted-foreground py-2">Inbox clear</p>
            : newReplies.slice(0, 4).map(r => (
              <Link key={r.id} to="/inbox" className="block py-2 px-2 -mx-2 hover:bg-muted/40 rounded transition-colors">
                <p className="text-sm font-medium text-foreground truncate">{r.prospect_name}</p>
                <p className="text-xs text-muted-foreground truncate">{r.classification?.replace(/_/g, " ")} · {r.channel}</p>
              </Link>
            ))}
        </WidgetPanel>

        <WidgetPanel title="Needs Approval" icon={AlertTriangle} linkTo="/approvals" alert={pendingApprovals.length > 0}>
          {pendingApprovals.length === 0
            ? <p className="text-xs text-muted-foreground py-2">Queue clear</p>
            : pendingApprovals.slice(0, 4).map(a => (
              <Link key={a.id} to="/approvals" className="block py-2 px-2 -mx-2 hover:bg-muted/40 rounded transition-colors">
                <p className="text-sm font-medium text-foreground capitalize">{a.item_type?.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground truncate">{a.reason}</p>
              </Link>
            ))}
        </WidgetPanel>

        <WidgetPanel title="Follow-ups Due" icon={Clock} linkTo="/prospects" alert={followUpsDue.length > 0}>
          {followUpsDue.length === 0
            ? <p className="text-xs text-muted-foreground py-2">All clear</p>
            : followUpsDue.map(p => <ProspectRow key={p.id} prospect={p} />)}
        </WidgetPanel>

        <WidgetPanel
          title={syncConflicts.length > 0 ? `${syncConflicts.length} Sync Conflict${syncConflicts.length > 1 ? "s" : ""}` : "Sync Status"}
          icon={RefreshCw}
          linkTo="/truth-sync"
          alert={syncConflicts.length > 0}
        >
          {syncConflicts.length === 0
            ? <p className="text-xs text-muted-foreground py-2">All files synced</p>
            : syncConflicts.slice(0, 4).map(f => (
              <Link key={f.id} to="/truth-sync" className="block py-2 px-2 -mx-2 hover:bg-muted/40 rounded transition-colors">
                <p className="text-sm font-medium text-foreground">{f.file_name}</p>
                <p className="text-xs text-amber-400">conflict</p>
              </Link>
            ))}
        </WidgetPanel>
      </div>

      {/* Tasks needing review */}
      {reviewTasks.length > 0 && (
        <WidgetPanel title="Tasks Needing Review" icon={PauseCircle} linkTo="/tasks" alert>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {reviewTasks.map(t => (
              <Link key={t.id} to="/tasks" className="flex items-center gap-2 py-2 px-2 -mx-2 hover:bg-muted/40 rounded transition-colors">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.state === "escalated" ? "bg-red-400" : t.state === "blocked" ? "bg-amber-400" : "bg-muted-foreground/40"}`} />
                <p className="text-sm text-foreground truncate">{t.task_name}</p>
                <span className="text-xs font-mono text-muted-foreground ml-auto capitalize">{t.state}</span>
              </Link>
            ))}
          </div>
        </WidgetPanel>
      )}

      {/* Recent reflections */}
      {recentReflections.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <BookOpen className="w-3.5 h-3.5" />
              Recent Reflections
            </div>
            <Link to="/reflections" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentReflections.map(r => (
              <div key={r.id} className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0">
                <span className={`mt-0.5 text-xs font-semibold px-1.5 py-0.5 rounded capitalize leading-none ${
                  r.reflection_type === "failure" ? "bg-red-500/10 text-red-400" :
                  r.reflection_type === "strategy" ? "bg-violet-500/10 text-violet-400" :
                  "bg-primary/10 text-primary"
                }`}>{r.reflection_type}</span>
                <div className="flex-1 min-w-0">
                  {r.trigger && <p className="text-sm text-foreground">{r.trigger}</p>}
                  {r.what_learned && <p className="text-xs text-muted-foreground truncate">{r.what_learned}</p>}
                </div>
                <span className="text-xs font-mono text-muted-foreground flex-shrink-0">{r.date ? format(new Date(r.date), "MMM d") : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}