import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, FileText, Inbox, Brain,
  GitBranch, ShieldCheck, Settings, ChevronLeft, ChevronRight, Activity, MessageSquare
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Command" },
  { path: "/prospects", icon: Users, label: "Prospects" },
  { path: "/inbox", icon: Inbox, label: "Inbox", countKey: "inbox" },
  { path: "/templates", icon: FileText, label: "Templates" },
  { path: "/memory", icon: Brain, label: "Memory" },
  { path: "/playbooks", icon: GitBranch, label: "Playbooks" },
  { path: "/approvals", icon: ShieldCheck, label: "Approvals", countKey: "approvals" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const { data: replies = [] } = useQuery({ queryKey: ["replies"], queryFn: () => base44.entities.Reply.list("-created_date", 50), staleTime: 30000 });
  const { data: approvals = [] } = useQuery({ queryKey: ["approvals"], queryFn: () => base44.entities.Approval.list("-created_date", 50), staleTime: 30000 });

  const counts = {
    inbox: replies.filter(r => r.status === "new").length,
    approvals: approvals.filter(a => a.status === "pending").length,
  };

  return (
    <aside className={cn(
      "h-screen sticky top-0 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
      collapsed ? "w-14" : "w-52"
    )}>
      {/* Logo */}
      <div className={cn("flex items-center h-14 border-b border-sidebar-border flex-shrink-0", collapsed ? "justify-center px-0" : "gap-2.5 px-4")}>
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Activity className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-foreground text-sm tracking-tight leading-none">Emil OS</p>
            <p className="text-xs text-muted-foreground leading-none mt-0.5 font-mono">v1.0</p>
          </div>
        )}
      </div>

      {/* Status indicator */}
      {!collapsed && (
        <div className="px-4 py-2 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground">Agent online</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {!collapsed && <p className="text-xs uppercase tracking-widest text-muted-foreground/50 px-2 mb-2 font-semibold">Modules</p>}
        {navItems.map(({ path, icon: Icon, label, countKey }) => {
          const isActive = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
          const count = countKey ? counts[countKey] : 0;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all relative",
                isActive
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-primary" : "")} />
              {!collapsed && <span className="flex-1">{label}</span>}
              {count > 0 && !collapsed && (
                <span className="ml-auto text-xs font-bold font-mono bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full leading-none">
                  {count}
                </span>
              )}
              {count > 0 && collapsed && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-sidebar-border text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}