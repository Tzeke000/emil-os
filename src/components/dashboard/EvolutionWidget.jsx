import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { GitCommit, ArrowRight, Plus, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default function EvolutionWidget() {
  const { data: logs = [] } = useQuery({
    queryKey: ["evolutionLog"],
    queryFn: () => base44.entities.EvolutionLog.list("-created_date", 50),
    staleTime: 30000,
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter(l => l.created_date?.startsWith(todayStr));
  const deletedToday = todayLogs.filter(l => l.is_deleted).length;
  const createdToday = todayLogs.filter(l => l.change_type?.startsWith("create_")).length;
  const replacedToday = todayLogs.filter(l => l.replaced_something).length;
  const latest = logs.filter(l => !l.is_deleted)[0];

  if (logs.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <GitCommit className="w-3.5 h-3.5" />
          App Evolution
        </div>
        <Link to="/evolution" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">
          Timeline <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { label: "Today", value: todayLogs.length, color: "text-foreground" },
          { label: "Created", value: createdToday, icon: Plus, color: "text-emerald-400" },
          { label: "Archived", value: deletedToday, icon: Trash2, color: "text-red-400" },
          { label: "Replaced", value: replacedToday, icon: RefreshCw, color: "text-violet-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Latest event */}
      {latest && (
        <Link to="/evolution" className="block">
          <div className="bg-muted/20 rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors">
            <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-semibold mb-0.5">Latest</p>
            <p className="text-sm text-foreground capitalize">{latest.change_type?.replace(/_/g, " ")} · {latest.entity_affected}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{latest.reason_for_change?.replace(/_/g, " ")}</p>
            <p className="text-xs font-mono text-muted-foreground/40 mt-0.5">
              {latest.created_date ? format(new Date(latest.created_date), "MMM d, h:mm a") : ""}
            </p>
          </div>
        </Link>
      )}
    </div>
  );
}