import React from "react";
import MetricCard from "../shared/MetricCard";
import {
  Target, DollarSign, Search, BarChart3, Send, MessageSquare,
  Trophy, AlertTriangle, Zap
} from "lucide-react";

export default function DashboardMetrics({ prospects, replies, approvals }) {
  const revenue = prospects.filter(p => p.status === "closed_won").length * 497;
  const scored = prospects.filter(p => p.score > 0).length;
  const outreachSent = prospects.filter(p => ["contacted", "follow_up_due", "replied", "interested", "closed_won", "closed_lost"].includes(p.status)).length;
  const repliesWaiting = replies.filter(r => r.status === "new").length;
  const pilotsClosed = prospects.filter(p => p.status === "closed_won").length;
  const blockers = approvals.filter(a => a.status === "pending").length;

  const metrics = [
    { label: "Revenue Collected", value: `$${revenue.toLocaleString()}`, icon: DollarSign, trend: "This month" },
    { label: "Prospects Found", value: prospects.length, icon: Search },
    { label: "Scored", value: scored, icon: BarChart3 },
    { label: "Outreach Sent", value: outreachSent, icon: Send },
    { label: "Replies Waiting", value: repliesWaiting, icon: MessageSquare },
    { label: "Pilots Closed", value: pilotsClosed, icon: Trophy },
    { label: "Blockers", value: blockers, icon: AlertTriangle },
    { label: "Daily Target", value: "15", icon: Target },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map(m => (
        <MetricCard key={m.label} {...m} />
      ))}
    </div>
  );
}