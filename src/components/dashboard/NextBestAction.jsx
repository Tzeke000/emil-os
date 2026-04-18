import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function NextBestAction({ prospects, replies }) {
  const actions = [];

  const newReplies = replies.filter(r => r.status === "new");
  if (newReplies.length > 0) {
    actions.push({
      priority: 1,
      text: `${newReplies.length} new replies waiting — review and respond`,
      link: "/inbox",
      type: "urgent"
    });
  }

  const followUps = prospects.filter(p => p.status === "follow_up_due");
  if (followUps.length > 0) {
    actions.push({
      priority: 2,
      text: `${followUps.length} follow-ups due today`,
      link: "/prospects",
      type: "action"
    });
  }

  const readyForOutreach = prospects.filter(p => p.status === "ready_for_outreach");
  if (readyForOutreach.length > 0) {
    actions.push({
      priority: 3,
      text: `${readyForOutreach.length} prospects ready for outreach`,
      link: "/prospects",
      type: "action"
    });
  }

  const topAction = actions.sort((a, b) => a.priority - b.priority)[0];

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Next Best Action
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topAction ? (
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{topAction.text}</p>
            <Link to={topAction.link}>
              <Button size="sm" variant="ghost" className="text-primary">
                Go <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">All caught up. Keep prospecting!</p>
        )}
      </CardContent>
    </Card>
  );
}