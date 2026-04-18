import StatCard from "../shared/StatCard";
import {
  Target, DollarSign, Users, Search, Send,
  MessageSquare, CheckCircle, AlertTriangle, Zap
} from "lucide-react";

export default function MetricsGrid({ prospects, settings, replies, approvals }) {
  const found = prospects.filter(p => p.status === "found").length;
  const scored = prospects.filter(p => p.score > 0).length;
  const outreachSent = prospects.filter(p => ["contacted", "follow_up_due", "replied", "interested", "closed_won", "closed_lost"].includes(p.status)).length;
  const repliesWaiting = replies.filter(r => r.status === "new").length;
  const pilotsClosed = prospects.filter(p => p.status === "closed_won").length;
  const blockers = approvals.filter(a => a.status === "pending").length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <StatCard label="Revenue" value={`$${(settings?.revenue_collected || 0).toLocaleString()}`} icon={DollarSign} color="success" />
      <StatCard label="Prospects" value={found} icon={Users} color="primary" subtitle="found today" />
      <StatCard label="Scored" value={scored} icon={Search} color="primary" />
      <StatCard label="Outreach" value={outreachSent} icon={Send} color="warning" subtitle="messages sent" />
      <StatCard label="Replies" value={repliesWaiting} icon={MessageSquare} color="success" subtitle="waiting" />
      <StatCard label="Pilots Won" value={pilotsClosed} icon={CheckCircle} color="success" />
      <StatCard label="Blockers" value={blockers} icon={AlertTriangle} color="destructive" subtitle="need review" />
      <StatCard label="Milestone" value={settings?.active_milestone || "—"} icon={Target} color="primary" />
      <StatCard label="Daily Target" value={settings?.daily_prospect_target || 20} icon={Zap} color="warning" subtitle="prospects/day" />
      <StatCard label="Outreach Target" value={settings?.daily_outreach_target || 15} icon={Send} color="warning" subtitle="messages/day" />
    </div>
  );
}