import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Terminal, Pause, Play, Trash2, Download,
  AlertTriangle, Info, XCircle, Bug, ChevronDown, Search
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const LEVELS = ["info", "warning", "error", "debug"];
const SOURCES = ["all", "ollama", "task_orchestrator", "trigger", "memory", "system"];

const LEVEL_META = {
  info:    { color: "text-sky-400",          bg: "bg-sky-500/10",    border: "border-sky-500/20",    icon: Info,          dot: "bg-sky-400",    label: "INFO" },
  warning: { color: "text-amber-400",        bg: "bg-amber-500/10",  border: "border-amber-500/20",  icon: AlertTriangle, dot: "bg-amber-400",  label: "WARN" },
  error:   { color: "text-red-400",          bg: "bg-red-500/10",    border: "border-red-500/20",    icon: XCircle,       dot: "bg-red-400",    label: "ERR " },
  debug:   { color: "text-muted-foreground", bg: "bg-muted/30",      border: "border-border/40",     icon: Bug,           dot: "bg-muted-foreground/40", label: "DBG " },
};

const SOURCE_COLOR = {
  ollama:            "text-violet-400",
  task_orchestrator: "text-sky-400",
  trigger:           "text-emerald-400",
  memory:            "text-teal-400",
  system:            "text-muted-foreground",
};

function LogRow({ log, expanded, onToggle }) {
  const meta = LEVEL_META[log.level] || LEVEL_META.info;
  const Icon = meta.icon;
  const srcColor = SOURCE_COLOR[log.source] || "text-muted-foreground";

  return (
    <div
      className={cn(
        "border-b border-border/30 cursor-pointer hover:bg-muted/10 transition-colors",
        log.level === "error" && "bg-red-500/5",
        log.level === "warning" && "bg-amber-500/5"
      )}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3 px-4 py-2 font-mono text-xs">
        {/* Timestamp */}
        <span className="text-muted-foreground/50 flex-shrink-0 w-16 pt-0.5">
          {log.created_date ? format(new Date(log.created_date), "HH:mm:ss") : "--:--:--"}
        </span>

        {/* Level badge */}
        <span className={cn("flex-shrink-0 font-bold w-10 pt-0.5", meta.color)}>
          {meta.label}
        </span>

        {/* Source */}
        <span className={cn("flex-shrink-0 w-20 pt-0.5 truncate", srcColor)}>
          {log.source}
        </span>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <span className="text-foreground">{log.message}</span>
          {log.task_name && (
            <span className="text-muted-foreground/50 ml-2">[{log.task_name}]</span>
          )}
          {log.module && (
            <span className="text-primary/50 ml-1">· {log.module}</span>
          )}
          {log.model && (
            <span className="text-violet-400/60 ml-1">· {log.model}</span>
          )}
        </div>

        {/* Meta right */}
        <div className="flex items-center gap-3 flex-shrink-0 text-muted-foreground/50">
          {log.tokens_used > 0 && <span>{log.tokens_used.toLocaleString()}t</span>}
          {log.duration_ms > 0 && <span>{log.duration_ms}ms</span>}
          {log.details && <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && log.details && (
        <div className="px-4 pb-3 pt-0 ml-36">
          <pre className="text-xs text-muted-foreground/80 bg-muted/40 border border-border rounded px-3 py-2 whitespace-pre-wrap overflow-auto max-h-40 font-mono">
            {log.details}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function LiveRuntimeLogs() {
  const [paused, setPaused] = useState(false);
  const [levelFilters, setLevelFilters] = useState({ info: true, warning: true, error: true, debug: false });
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [frozenLogs, setFrozenLogs] = useState(null); // snapshot when paused
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  const { data: liveLogs = [] } = useQuery({
    queryKey: ["runtimeLogs"],
    queryFn: () => base44.entities.RuntimeLog.list("-created_date", 200),
    refetchInterval: paused ? false : 2000,
  });

  // When unpausing, clear the frozen snapshot
  useEffect(() => {
    if (!paused) setFrozenLogs(null);
  }, [paused]);

  // Freeze on pause
  const handlePause = () => {
    if (!paused) setFrozenLogs(liveLogs);
    setPaused(p => !p);
  };

  const logs = (paused && frozenLogs ? frozenLogs : liveLogs)
    // reverse so newest is at bottom
    .slice().reverse();

  const filtered = logs.filter(log => {
    if (!levelFilters[log.level]) return false;
    if (sourceFilter !== "all" && log.source !== sourceFilter) return false;
    if (search && !log.message?.toLowerCase().includes(search.toLowerCase()) &&
        !log.task_name?.toLowerCase().includes(search.toLowerCase()) &&
        !log.module?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && !paused && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filtered.length, autoScroll, paused]);

  const toggleExpanded = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleLevel = (level) => setLevelFilters(f => ({ ...f, [level]: !f[level] }));

  const exportLogs = () => {
    const text = filtered.map(l =>
      `[${l.created_date}] ${l.level.toUpperCase()} [${l.source}] ${l.message}${l.details ? "\n  " + l.details : ""}`
    ).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `runtime-logs-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const errorCount = liveLogs.filter(l => l.level === "error").length;
  const warnCount  = liveLogs.filter(l => l.level === "warning").length;

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] p-6 max-w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Execution Stream</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Live Runtime Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">
            <span className="text-foreground">{filtered.length}</span> shown ·{" "}
            {errorCount > 0 && <span className="text-red-400">{errorCount} errors · </span>}
            {warnCount > 0 && <span className="text-amber-400">{warnCount} warnings · </span>}
            {paused
              ? <span className="text-amber-400 animate-pulse">⏸ stream paused</span>
              : <span className="text-emerald-400">● live</span>
            }
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={paused ? "default" : "outline"}
            onClick={handlePause}
            className={cn("gap-1.5", paused && "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30")}
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={exportLogs}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0 flex-wrap">
        {/* Level toggles */}
        <div className="flex items-center gap-1.5">
          {LEVELS.map(level => {
            const meta = LEVEL_META[level];
            const active = levelFilters[level];
            return (
              <button
                key={level}
                onClick={() => toggleLevel(level)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold border transition-all",
                  active ? `${meta.bg} ${meta.color} ${meta.border}` : "bg-muted/30 text-muted-foreground/40 border-border/30"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", active ? meta.dot : "bg-muted-foreground/20")} />
                {meta.label.trim()}
              </button>
            );
          })}
        </div>

        {/* Source filter */}
        <div className="flex items-center gap-1.5">
          {SOURCES.map(src => (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={cn(
                "px-2 py-1 rounded text-xs font-mono transition-colors capitalize",
                sourceFilter === src
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground/60 hover:text-muted-foreground"
              )}
            >
              {src}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 w-52 bg-card text-xs font-mono"
          />
        </div>

        {/* Auto-scroll toggle */}
        <button
          onClick={() => setAutoScroll(a => !a)}
          className={cn(
            "text-xs font-mono px-2 py-1 rounded border transition-colors",
            autoScroll ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-muted/30 text-muted-foreground border-border"
          )}
        >
          ↓ auto-scroll {autoScroll ? "on" : "off"}
        </button>
      </div>

      {/* Pause banner */}
      {paused && (
        <div className="flex items-center gap-2 px-4 py-2 mb-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs font-mono text-amber-400 flex-shrink-0">
          <Pause className="w-3.5 h-3.5" />
          Stream paused — showing snapshot from {frozenLogs?.length || 0} buffered entries. Click <strong className="mx-1">Resume</strong> to go live.
        </div>
      )}

      {/* Log terminal */}
      <div
        ref={containerRef}
        className="flex-1 bg-card border border-border rounded-xl overflow-y-auto min-h-0 font-mono"
      >
        {/* Column headers */}
        <div className="sticky top-0 flex items-center gap-3 px-4 py-2 bg-muted/60 border-b border-border text-xs font-mono text-muted-foreground/50 uppercase tracking-widest backdrop-blur">
          <span className="w-16 flex-shrink-0">Time</span>
          <span className="w-10 flex-shrink-0">Lvl</span>
          <span className="w-20 flex-shrink-0">Source</span>
          <span className="flex-1">Message</span>
          <span className="w-24 text-right flex-shrink-0">Tokens / ms</span>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40">
            <Terminal className="w-8 h-8 mb-3" />
            <p className="text-sm font-mono">— no log entries match filters —</p>
          </div>
        )}

        {filtered.map(log => (
          <LogRow
            key={log.id}
            log={log}
            expanded={expandedIds.has(log.id)}
            onToggle={() => toggleExpanded(log.id)}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-4 mt-2 text-xs font-mono text-muted-foreground/50 flex-shrink-0">
        <span>{liveLogs.length} total entries</span>
        <span>·</span>
        <span>polling every 2s</span>
        <span>·</span>
        <span>click any row to expand details</span>
      </div>
    </div>
  );
}