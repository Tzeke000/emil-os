import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import StatusBadge from "../shared/StatusBadge";

export default function WidgetCard({ title, icon: Icon, items, emptyText, linkTo }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">{emptyText || "Nothing here"}</p>
        ) : (
          <div className="space-y-2">
            {items.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate font-medium text-xs">{item.label}</span>
                </div>
                {item.status && <StatusBadge status={item.status} />}
                {item.value && <span className="text-xs text-muted-foreground font-mono">{item.value}</span>}
              </div>
            ))}
          </div>
        )}
        {linkTo && items.length > 0 && (
          <Link to={linkTo} className="text-xs text-primary mt-3 block hover:underline">
            View all →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}