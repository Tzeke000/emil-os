import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart2, Users, Inbox, Zap, Brain, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">{label}</p>
        {Icon && <Icon className={cn("w-4 h-4", color || "text-muted-foreground")} />}
      </div>
      <p className="text-2xl font-bold font-mono text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 mt-6 mb-3">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
    </div>
  );
}

export default function Analytics() {
  const { data: prospects = [] } = useQuery({ queryKey: ["prospects"], queryFn: () => base44.entities.Prospect.list("-created_date", 500) });
  const { data: replies = [] } = useQuery({ queryKey: ["replies"], queryFn: () => base44.entities.Reply.list("-created_date", 200) });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => base44.entities.Task.list("-created_date", 200) });
  const { data: logs = [] } = useQuery({ queryKey: ["runtimeLogsHealth"], queryFn: () => base44.entities.RuntimeLog.list("-created_date", 500) });
  const { data: approvals = [] } = useQuery({ queryKey: ["approvals"], queryFn: () => base44.entities.Approval.list("-created_date", 200) });
  const { data: reflections = [] } = useQuery({ queryKey: ["reflections"], queryFn: () => base44.entities.Reflection.list("-date", 100) });

  // Prospect pipeline distribution
  const prospectByStatus = Object.entries(
    prospects.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

  // Prospect score distribution buckets
  const scoreBuckets = [
    { range: "0-20", count: prospects.filter(p => (p.score || 0) < 20).length },
    { range: "20-40", count: prospects.filter(p => (p.score || 0) >= 20 && p.score < 40).length },
    { range: "40-60", count: prospects.filter(p => (p.score || 0) >= 40 && p.score < 60).length },
    { range: "60-80", count: prospects.filter(p => (p.score || 0) >= 60 && p.score < 80).length },
    { range: "80-100", count: prospects.filter(p => (p.score || 0) >= 80).length },
  ];

  // Prospects added per day (last 14 days)
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(new Date(), 13 - i);
    const dateStr = format(d, "yyyy-MM-dd");
    return {
      date: format(d, "MMM d"),
      count: prospects.filter(p => p.created_date?.startsWith(dateStr)).length,
    };
  });

  // Reply classification breakdown
  const replyByClass = Object.entries(
    replies.reduce((acc, r) => { const k = r.classification || "unclassified"; acc[k] = (acc[k] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

  // Token usage by source (last 500 logs)
  const tokenBySource = Object.entries(
    logs.filter(l => l.tokens_used > 0).reduce((acc, l) => {
      acc[l.source] = (acc[l.source] || 0) + (l.tokens_used || 0);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Task state breakdown
  const taskByState = Object.entries(
    tasks.reduce((acc, t) => { acc[t.state || "unknown"] = (acc[t.state || "unknown"] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  // Token usage over last 7 days
  const tokenTrend = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = format(d, "yyyy-MM-dd");
    return {
      date: format(d, "MMM d"),
      tokens: logs.filter(l => l.created_date?.startsWith(dateStr)).reduce((s, l) => s + (l.tokens_used || 0), 0),
      errors: logs.filter(l => l.created_date?.startsWith(dateStr) && l.level === "error").length,
    };
  });

  // KPIs
  const totalTokens = logs.reduce((s, l) => s + (l.tokens_used || 0), 0);
  const errorRate = logs.length ? ((logs.filter(l => l.level === "error").length / logs.length) * 100).toFixed(1) : 0;
  const conversionRate = prospects.length
    ? ((prospects.filter(p => ["interested", "closed_won"].includes(p.status)).length / prospects.length) * 100).toFixed(1)
    : 0;
  const replyRate = prospects.filter(p => p.status !== "found").length
    ? ((replies.length / prospects.filter(p => p.status !== "found").length) * 100).toFixed(1)
    : 0;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center gap-2 mb-1">
        <BarChart2 className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Overview</span>
      </div>
      <h1 className="text-xl font-bold text-foreground mb-0.5">Cross-Module Analytics</h1>
      <p className="text-sm text-muted-foreground mb-5">A holistic view of Emil's performance across all modules.</p>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
        <StatCard label="Total Prospects" value={prospects.length} sub={`${prospects.filter(p => p.status === "ready_for_outreach").length} ready for outreach`} icon={Users} color="text-primary" />
        <StatCard label="Conversion Rate" value={`${conversionRate}%`} sub="interested or won" icon={TrendingUp} color="text-emerald-400" />
        <StatCard label="Reply Rate" value={`${replyRate}%`} sub="of contacted prospects" icon={Inbox} color="text-amber-400" />
        <StatCard label="Error Rate" value={`${errorRate}%`} sub={`${logs.filter(l => l.level === "error").length} errors in last 500 logs`} icon={AlertTriangle} color="text-red-400" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Tokens Used" value={totalTokens > 9999 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens} sub="across all runtime logs" icon={Zap} color="text-violet-400" />
        <StatCard label="Tasks Total" value={tasks.length} sub={`${tasks.filter(t => t.state === "completed").length} completed`} icon={CheckCircle} color="text-sky-400" />
        <StatCard label="Approvals Pending" value={approvals.filter(a => a.status === "pending").length} sub={`${approvals.length} total`} icon={Clock} color="text-amber-400" />
        <StatCard label="Reflections" value={reflections.length} sub={`${reflections.filter(r => r.reflection_type === "failure").length} failure logs`} icon={Brain} color="text-rose-400" />
      </div>

      {/* Prospect Pipeline */}
      <SectionHeader title="Prospect Pipeline" icon={Users} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-widest">Status Distribution</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={prospectByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name} (${value})`} labelLine={false} fontSize={10}>
                {prospectByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-widest">Score Distribution</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scoreBuckets}>
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 md:col-span-2">
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-widest">Prospects Added — Last 14 Days</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={last14}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Replies */}
      <SectionHeader title="Inbox & Replies" icon={Inbox} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-widest">Reply Classification Breakdown</p>
          {replyByClass.length === 0
            ? <p className="text-sm text-muted-foreground font-mono py-6 text-center">No replies yet</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={replyByClass} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}>
                    {replyByClass.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )
          }
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-widest">Task State Breakdown</p>
          {taskByState.length === 0
            ? <p className="text-sm text-muted-foreground font-mono py-6 text-center">No tasks yet</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={taskByState} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={80} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>
      </div>

      {/* Runtime */}
      <SectionHeader title="Runtime & Token Usage" icon={Zap} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-widest">Token Usage by Source</p>
          {tokenBySource.length === 0
            ? <p className="text-sm text-muted-foreground font-mono py-6 text-center">No token data</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={tokenBySource} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={90} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="value" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-widest">Tokens + Errors — Last 7 Days</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={tokenTrend}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Line yAxisId="left" type="monotone" dataKey="tokens" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="tokens" />
              <Line yAxisId="right" type="monotone" dataKey="errors" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} name="errors" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}