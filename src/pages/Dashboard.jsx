import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MetricsGrid from "../components/dashboard/MetricsGrid";
import ActionCards from "../components/dashboard/ActionCards";
import PageHeader from "../components/shared/PageHeader";

export default function Dashboard() {
  const { data: prospects = [] } = useQuery({
    queryKey: ["prospects"],
    queryFn: () => base44.entities.Prospect.list("-created_date", 100),
  });
  const { data: settings } = useQuery({
    queryKey: ["agentSettings"],
    queryFn: async () => {
      const list = await base44.entities.AgentSettings.list("-created_date", 1);
      return list[0] || null;
    },
  });
  const { data: replies = [] } = useQuery({
    queryKey: ["inboxReplies"],
    queryFn: () => base44.entities.InboxReply.list("-created_date", 50),
  });
  const { data: approvals = [] } = useQuery({
    queryKey: ["approvalItems"],
    queryFn: () => base44.entities.ApprovalItem.list("-created_date", 50),
  });
  const { data: activities = [] } = useQuery({
    queryKey: ["activityLog"],
    queryFn: () => base44.entities.ActivityLog.list("-created_date", 10),
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <PageHeader title="Dashboard" subtitle="Emil OS — Agent Command Center" />
      <MetricsGrid prospects={prospects} settings={settings} replies={replies} approvals={approvals} />
      <ActionCards prospects={prospects} replies={replies} approvals={approvals} activities={activities} />
    </div>
  );
}