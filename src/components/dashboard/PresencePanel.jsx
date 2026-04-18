import { Link } from "react-router-dom";
import { Brain, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CONFIDENCE_META = {
  very_low:  { label: "Very Low",  bar: "bg-red-400",     width: "w-1/5",  color: "text-red-400" },
  low:       { label: "Low",       bar: "bg-amber-400",   width: "w-2/5",  color: "text-amber-400" },
  moderate:  { label: "Moderate",  bar: "bg-yellow-400",  width: "w-3/5",  color: "text-yellow-400" },
  high:      { label: "High",      bar: "bg-emerald-400", width: "w-4/5",  color: "text-emerald-400" },
  very_high: { label: "Very High", bar: "bg-primary",     width: "w-full", color: "text-primary" },
};

export default function PresencePanel({ state }) {
  if (!state) {
    return (
      <Link to="/mind-state" className="block bg-card border border-border rounded-xl p-4 hover:bg-muted/10 transition-colors group">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mind State</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground/50 italic">Not yet defined — set Emil's current state</p>
      </Link>
    );
  }

  const conf = CONFIDENCE_META[state.confidence_level] || CONFIDENCE_META.moderate;

  return (
    <Link to="/mind-state" className="block bg-card border border-border rounded-xl p-4 hover:bg-muted/10 transition-colors group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mind State</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono ${conf.color}`}>{conf.label} confidence</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
        </div>
      </div>

      <div className="h-1 bg-muted rounded-full overflow-hidden mb-3">
        <div className={cn("h-full rounded-full", conf.bar, conf.width)} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {[
          { label: "Focused on",     value: state.focused_on },
          { label: "Objective",      value: state.current_objective },
          { label: "Blocker",        value: state.current_blocker },
          { label: "Next action",    value: state.next_intended_action },
        ].map(({ label, value }) => value && (
          <div key={label}>
            <p className="text-xs text-muted-foreground/60 uppercase tracking-wider">{label}</p>
            <p className="text-xs text-foreground leading-snug mt-0.5 line-clamp-2">{value}</p>
          </div>
        ))}
      </div>
    </Link>
  );
}