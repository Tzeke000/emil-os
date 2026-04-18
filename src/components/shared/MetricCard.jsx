import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function MetricCard({ label, value, icon: Icon, trend, className }) {
  return (
    <Card className={cn("p-4 flex items-start justify-between", className)}>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold mt-1 font-mono">{value}</p>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </div>
      {Icon && (
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      )}
    </Card>
  );
}