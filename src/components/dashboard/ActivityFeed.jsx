import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { format } from "date-fns";

export default function ActivityFeed({ activities }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-xs text-muted-foreground">No activity yet</p>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 8).map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{a.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.related_entity_name && `${a.related_entity_name} · `}
                    {a.created_date ? format(new Date(a.created_date), "MMM d, h:mm a") : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}