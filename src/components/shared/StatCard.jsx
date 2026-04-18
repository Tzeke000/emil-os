import { cn } from "@/lib/utils";

export default function StatCard({ label, value, icon: Icon, color = "primary", subtitle }) {
  return (
    <div className={cn(
      "rounded-lg border border-border bg-card p-4 flex items-start gap-3",
      `hover:border-${color}/30 transition-colors`
    )}>
      {Icon && (
        <div className={cn("p-2 rounded-md", `bg-${color}/10`)}>
          <Icon className={cn("w-4 h-4", `text-${color}`)} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-xl font-semibold text-foreground mt-0.5 font-mono">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}