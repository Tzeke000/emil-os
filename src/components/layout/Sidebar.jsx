import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, FileText, Inbox, Brain,
  GitBranch, ShieldCheck, Settings, ChevronLeft, ChevronRight,
  Activity, RefreshCw, Cpu, Router, ListTodo, BookOpen,
  GitMerge, Wrench, Archive, ChevronDown, ChevronUp, Zap, Terminal,
  Fingerprint, Heart, SlidersHorizontal, Sparkles, BookMarked
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const SECTIONS = [
  {
    label: "Emil",
    items: [
      { path: "/",              icon: LayoutDashboard,  label: "Today" },
      { path: "/mind-state",    icon: Brain,            label: "Mind State" },
      { path: "/reflections",   icon: BookMarked,       label: "Reflections" },
      { path: "/identity",      icon: Fingerprint,      label: "Identity Core" },
      { path: "/relationship",  icon: Heart,            label: "Relationship" },
      { path: "/preferences",   icon: SlidersHorizontal,label: "Preferences" },
    ]
  },
  {
    label: "Work",
    items: [
      { path: "/prospects",  icon: Users,       label: "Prospects" },
      { path: "/inbox",      icon: Inbox,       label: "Inbox",      countKey: "inbox" },
      { path: "/approvals",  icon: ShieldCheck, label: "Approvals",  countKey: "approvals" },
      { path: "/templates",  icon: FileText,    label: "Templates" },
      { path: "/playbooks",  icon: GitBranch,   label: "Playbooks" },
    ]
  },
  {
    label: "Memory",
    items: [
      { path: "/memory",            icon: Sparkles,  label: "Active Memory" },
      { path: "/memory-browser",    icon: BookOpen,  label: "Memory Browser" },
      { path: "/memory-migration",  icon: GitMerge,  label: "Migration",    countKey: "migrations" },
      { path: "/truth-sync",        icon: RefreshCw, label: "Truth Sync",   countKey: "conflicts" },
      { path: "/archive",           icon: Archive,   label: "Archive" },
    ]
  },
  {
    label: "System",
    items: [
      { path: "/tasks",        icon: ListTodo, label: "Tasks",       countKey: "tasks" },
      { path: "/workbench",    icon: Wrench,   label: "Workbench",   countKey: "proposals" },
      { path: "/modules",      icon: Cpu,      label: "Modules" },
      { path: "/model-router", icon: Router,   label: "Model Router" },
      { path: "/triggers",     icon: Zap,      label: "Triggers" },
      { path: "/logs",         icon: Terminal, label: "Logs" },
      { path: "/settings",     icon: Settings, label: "Settings" },
    ]
  }
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({ System: true });

  const { data: replies = [] } = useQuery({ queryKey: ["replies"], queryFn: () => base44.entities.Reply.list("-created_date", 50), staleTime: 30000 });
  const { data: approvals = [] } = useQuery({ queryKey: ["approvals"], queryFn: () => base44.entities.Approval.list("-created_date", 50), staleTime: 30000 });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => base44.entities.Task.list("-created_date", 100), staleTime: 30000 });
  const { data: truthFiles = [] } = useQuery({ queryKey: ["truthFiles"], queryFn: () => base44.entities.TruthFile.list("-created_date", 20), staleTime: 60000 });
  const { data: migrations = [] } = useQuery({ queryKey: ["migrations"], queryFn: () => base44.entities.MemoryMigration.list("-created_date", 50), staleTime: 30000 });
  const { data: proposals = [] } = useQuery({ queryKey: ["proposals"], queryFn: () => base44.entities.Proposal.list("-created_date", 50), staleTime: 30000 });

  const counts = {
    inbox:      replies.filter(r => r.status === "new").length,
    approvals:  approvals.filter(a => a.status === "pending").length,
    tasks:      tasks.filter(t => ["running","blocked","escalated"].includes(t.state)).length,
    conflicts:  truthFiles.filter(f => f.sync_status === "conflict").length,
    migrations: migrations.filter(m => m.status === "pending_review").length,
    proposals:  proposals.filter(p => p.status === "pending_review").length,
  };

  const toggleSection = (label) => setCollapsedSections(p => ({ ...p, [label]: !p[label] }));

  return (
    <aside className={cn(
      "h-screen sticky top-0 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 overflow-hidden",
      collapsed ? "w-14" : "w-52"
    )}>
      {/* Logo */}
      <div className={cn("flex items-center h-14 border-b border-sidebar-border flex-shrink-0", collapsed ? "justify-center" : "gap-2.5 px-4")}>
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Activity className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-foreground text-sm tracking-tight leading-none">Emil OS</p>
            <p className="text-xs text-muted-foreground leading-none mt-0.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-1 animate-pulse" />
              online
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto space-y-1">
        {SECTIONS.map(({ label, items }) => {
          const isSectionCollapsed = collapsedSections[label];
          return (
            <div key={label}>
              {!collapsed && (
                <button
                  onClick={() => toggleSection(label)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs uppercase tracking-widest text-muted-foreground/50 hover:text-muted-foreground font-semibold transition-colors"
                >
                  {label}
                  {isSectionCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </button>
              )}
              {!isSectionCollapsed && items.map(({ path, icon: Icon, label: itemLabel, countKey }) => {
                const isActive = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
                const count = countKey ? counts[countKey] : 0;
                return (
                  <Link
                    key={path}
                    to={path}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-all relative",
                      isActive
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-primary" : "")} />
                    {!collapsed && <span className="flex-1 text-xs">{itemLabel}</span>}
                    {count > 0 && !collapsed && (
                      <span className="ml-auto text-xs font-bold font-mono bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full leading-none">
                        {count}
                      </span>
                    )}
                    {count > 0 && collapsed && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Collapse */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-sidebar-border text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}