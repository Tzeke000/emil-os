import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "../components/shared/PageHeader";
import StatusBadge from "../components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, AlertTriangle, Check, Archive, Search } from "lucide-react";
import { format } from "date-fns";

const CLASSIFICATIONS = ["interested", "not_now", "wrong_contact", "question", "price_objection", "no_thanks", "spam", "needs_human_review"];

export default function Inbox() {
  const [filter, setFilter] = useState("new");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const queryClient = useQueryClient();
  const { data: replies = [] } = useQuery({
    queryKey: ["inboxReplies"],
    queryFn: () => base44.entities.InboxReply.list("-created_date", 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InboxReply.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inboxReplies"] }),
  });

  const filtered = replies.filter(r => {
    const matchFilter = filter === "all" || r.status === filter;
    const matchSearch = !search || r.prospect_name?.toLowerCase().includes(search.toLowerCase()) || r.reply_text?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const selected = replies.find(r => r.id === selectedId);

  const markStatus = (id, status) => updateMutation.mutate({ id, data: { status } });

  return (
    <div className="p-6 max-w-7xl">
      <PageHeader title="Inbox" subtitle={`${replies.filter(r => r.status === "new").length} new replies`} />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search replies..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 bg-card" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36 h-9 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="responded">Responded</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Queue */}
        <div className="lg:col-span-2 space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
          {filtered.map(r => (
            <Card key={r.id} className={`bg-card border-border cursor-pointer transition-colors ${selectedId === r.id ? "border-primary/40" : "hover:border-primary/20"}`} onClick={() => setSelectedId(r.id)}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-medium text-foreground">{r.prospect_name}</p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">{r.reply_text}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{r.channel}</Badge>
                  {r.classification && <Badge variant="outline" className="text-xs">{r.classification?.replace(/_/g, " ")}</Badge>}
                  <span className="text-xs text-muted-foreground ml-auto">{r.date_received && format(new Date(r.date_received), "MMM d")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No replies found</div>
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-3">
          {selected ? (
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-medium text-foreground">{selected.prospect_name}</h3>
                    <p className="text-xs text-muted-foreground">{selected.channel} · {selected.date_received && format(new Date(selected.date_received), "MMM d, h:mm a")}</p>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selected.reply_text}</p>
                </div>
                {selected.classification && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Classification</p>
                    <Badge variant="outline">{selected.classification?.replace(/_/g, " ")}</Badge>
                  </div>
                )}
                {selected.suggested_response && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Suggested Response</p>
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{selected.suggested_response}</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={() => markStatus(selected.id, "responded")}>
                    <Send className="w-3.5 h-3.5 mr-1" /> Mark Sent
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => markStatus(selected.id, "reviewed")}>
                    <Check className="w-3.5 h-3.5 mr-1" /> Reviewed
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => markStatus(selected.id, "escalated")}>
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Escalate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => markStatus(selected.id, "archived")}>
                    <Archive className="w-3.5 h-3.5 mr-1" /> Archive
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              <MessageSquare className="w-5 h-5 mr-2" /> Select a reply to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}