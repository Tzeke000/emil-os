import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, Clock, Zap, Sparkles, ArrowRight, X, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

// Build hourly buckets for the last N hours from a list of logs
function buildHourlyBuckets(logs, hours = 24) {
  const now = Date.now();
  const buckets = Array.from({ length: hours }, (_, i) => ({
    hour: new Date(now - (hours - 1 - i) * 3600000),
    tokens: 0,
    errors: 0,
    totalMs: 0,
    count: 0,
    errorLogs: [],
  }));

  logs.forEach(log => {
    if (!log.created_date) return;
    const ts = new Date(log.created_date).getTime();
    const idx = buckets.findIndex((b, i) => {
      const next = buckets[i + 1];
      return ts >= b.hour.getTime() && (!next || ts < next.hour.getTime());
    });
    if (idx === -1) return;
    buckets[idx].tokens += log.tokens_used || 0;
    buckets[idx].count += 1;
    if (log.duration_ms) { buckets[idx].totalMs += log.duration_ms; }
    if (log.level === "error") {
      buckets[idx].errors += 1;
      buckets[idx].errorLogs.push(log);
    }
  });

  return buckets;
}

function Sparkbar({ value, max, color, isSpike, onClick }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      className={cn("flex-1 flex flex-col justify-end h-12 group", onClick && isSpike ? "cursor-pointer" : "")}
      onClick={isSpike && onClick ? onClick : undefined}
      title={`${value}`}
    >
      <div
        className={cn(
          "w-full rounded-sm transition-all",
          isSpike ? "opacity-100 ring-1 ring-red-400/60" : "opacity-70 group-hover:opacity-100",
          color
        )}
        style={{ height: `${Math.max(pct, 3)}%` }}
      />
    </div>
  );
}

function SparkChart({ buckets, valueKey, color, spikeKey }) {
  const values = buckets.map(b => b[valueKey]);
  const max = Math.max(...values, 1);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const [selected, setSelected] = useState(null);

  return { bars: (onSpike) => (
    <div className="flex items-end gap-px h-12">
      {buckets.map((b, i) => {
        const val = b[valueKey];
        const isSpike = spikeKey ? b[spikeKey] > 0 && val > avg * 1.5 : false;
        return (
          <Sparkbar
            key={i}
            value={val}
            max={max}
            color={isSpike ? "bg-red-400" : color}
            isSpike={isSpike}
            onClick={isSpike ? () => onSpike(b) : null}
          />
        );
      })}
    </div>
  ), max, avg };
}

function StatBox({ label, value, unit, sub, alert }) {
  return (
    <div className={cn("rounded-lg px-3 py-2", alert ? "bg-red-500/10 border border-red-500/20" : "bg-muted/30")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold font-mono leading-tight", alert ? "text-red-400" : "text-foreground")}>
        {value}<span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>
      </p>
      {sub && <p className="text-xs text-muted-foreground/60">{sub}</p>}
    </div>
  );
}

export default function AgentHealthPanel() {
  const [spikeModal, setSpikeModal] = useState(null); // { bucket }
  const [optimization, setOptimization] = useState(null);
  const [optimLoading, setOptimLoading] = useState(false);

  const { data: runtimeLogs = [] } = useQuery({
    queryKey: ["runtimeLogsHealth"],
    queryFn: () => base44.entities.RuntimeLog.list("-created_date", 500),
    staleTime: 60000,
    refetchInterval: 120000,
  });

  const buckets = buildHourlyBuckets(runtimeLogs, 24);

  // Overall stats
  const totalTokens = runtimeLogs.reduce((s, l) => s + (l.tokens_used || 0), 0);
  const errorLogs = runtimeLogs.filter(l => l.level === "error");
  const latencies = runtimeLogs.filter(l => l.duration_ms > 0).map(l => l.duration_ms);
  const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const maxLatency = latencies.length ? Math.max(...latencies) : 0;
  const errorRate = runtimeLogs.length ? Math.round((errorLogs.length / runtimeLogs.length) * 100) : 0;
  const hasErrors = errorLogs.length > 0;

  const tokenMax = Math.max(...buckets.map(b => b.tokens), 1);
  const latencyMax = Math.max(...buckets.map(b => b.totalMs / Math.max(b.count, 1)), 1);
  const errorMax = Math.max(...buckets.map(b => b.errors), 1);
  const avgErrors = buckets.reduce((s, b) => s + b.errors, 0) / buckets.length;

  const handleSpikeClick = (bucket) => {
    setSpikeModal(bucket);
    setOptimization(null);
  };

  const getSuggestion = async (errorLogsSnippet) => {
    setOptimLoading(true);
    const snippet = errorLogsSnippet.slice(0, 3).map(l =>
      `Source: ${l.source}, Module: ${l.module || "unknown"}, Task: ${l.task_name || "none"}, Message: ${l.message}`
    ).join("\n");
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Emil's optimization advisor. Analyze these runtime errors and suggest a concise, actionable optimization Emil can make to reduce recurrence. Be specific about the module or task to fix and what the fix should be. Keep under 80 words.\n\nErrors:\n${snippet}`,
      });
      setOptimization(res);
    } catch {
      setOptimization("Could not generate suggestion — check your integration credits.");
    }
    setOptimLoading(false);
  };

  if (runtimeLogs.length === 0) return null;

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Activity className="w-3.5 h-3.5" />
            Agent Health
          </div>
          <Link to="/logs" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors">
            Full logs <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Stat boxes */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <StatBox label="Tokens (total)" value={totalTokens > 999 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens} unit="" sub="all time" />
          <StatBox label="Avg latency" value={avgLatency} unit="ms" sub={`max ${maxLatency}ms`} />
          <StatBox label="Errors" value={errorLogs.length} unit="" sub={`${errorRate}% error rate`} alert={hasErrors} />
          <StatBox label="Log entries" value={runtimeLogs.length} unit="" sub="last 500" />
        </div>

        {/* Charts */}
        <div className="space-y-3">
          {/* Token usage */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-primary" /> Token usage · 24h
            </p>
            <div className="flex items-end gap-px h-12">
              {buckets.map((b, i) => (
                <Sparkbar key={i} value={b.tokens} max={tokenMax} color="bg-primary/60" isSpike={false} />
              ))}
            </div>
          </div>

          {/* Latency */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-amber-400" /> Avg latency (ms) · 24h
            </p>
            <div className="flex items-end gap-px h-12">
              {buckets.map((b, i) => {
                const val = b.count > 0 ? Math.round(b.totalMs / b.count) : 0;
                return <Sparkbar key={i} value={val} max={latencyMax} color="bg-amber-400/60" isSpike={false} />;
              })}
            </div>
          </div>

          {/* Errors — clickable on spikes */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-red-400" /> Error frequency · 24h
              {hasErrors && <span className="text-red-400/70 ml-1">(click a spike to investigate)</span>}
            </p>
            <div className="flex items-end gap-px h-12">
              {buckets.map((b, i) => {
                const isSpike = b.errors > 0 && b.errors > avgErrors * 1.5;
                return (
                  <Sparkbar
                    key={i}
                    value={b.errors}
                    max={errorMax}
                    color="bg-red-400/60"
                    isSpike={isSpike}
                    onClick={isSpike ? () => handleSpikeClick(b) : null}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Spike drill-down modal */}
      <Dialog open={!!spikeModal} onOpenChange={() => { setSpikeModal(null); setOptimization(null); }}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Error Spike — {spikeModal ? spikeModal.hour.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
            </DialogTitle>
          </DialogHeader>

          {spikeModal && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                <span className="font-mono text-red-400 font-bold">{spikeModal.errors}</span> error{spikeModal.errors !== 1 ? "s" : ""} in this hour
              </p>

              {/* Error log list */}
              <div className="border border-border rounded-lg divide-y divide-border/60 overflow-hidden">
                {spikeModal.errorLogs.length === 0 && (
                  <p className="text-xs text-muted-foreground px-4 py-3 font-mono">No detailed logs stored for this bucket.</p>
                )}
                {spikeModal.errorLogs.slice(0, 5).map((log, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-red-400 uppercase">{log.source}</span>
                      {log.module && <span className="text-xs text-muted-foreground">· {log.module}</span>}
                      {log.task_name && <span className="text-xs text-primary font-mono truncate">→ {log.task_name}</span>}
                    </div>
                    <p className="text-sm text-foreground">{log.message}</p>
                    {log.details && (
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{log.details}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Optimization suggestion */}
              {optimization && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                  <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Optimization Suggestion
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{optimization}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                {!optimization && (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={optimLoading}
                    onClick={() => getSuggestion(spikeModal.errorLogs)}
                  >
                    {optimLoading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing…</>
                      : <><Sparkles className="w-3.5 h-3.5" /> Suggest Optimization</>
                    }
                  </Button>
                )}
                <Link to="/logs" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 ml-auto">
                  Open full logs <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}