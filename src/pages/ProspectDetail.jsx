import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "../components/shared/PageHeader";
import StatusBadge from "../components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Globe, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["found", "scored", "ready_for_outreach", "contacted", "follow_up_due", "replied", "interested", "closed_won", "closed_lost", "archived"];

export default function ProspectDetail() {
  const id = window.location.pathname.split("/").pop();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);

  const { data: prospect, isLoading } = useQuery({
    queryKey: ["prospect", id],
    queryFn: async () => {
      const list = await base44.entities.Prospect.filter({ id });
      return list[0];
    },
    enabled: !!id,
    onSuccess: (data) => { if (!form) setForm(data); }
  });

  const { data: replies = [] } = useQuery({
    queryKey: ["prospect-replies", id],
    queryFn: () => base44.entities.Reply.filter({ prospect_id: id }),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Prospect.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospect", id] });
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      setEditing(false);
      toast.success("Prospect updated");
    },
  });

  if (isLoading || !prospect) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  const data = editing ? (form || prospect) : prospect;

  const handleSave = () => {
    const { id: _id, created_date, updated_date, created_by, ...updates } = form;
    updateMutation.mutate(updates);
  };

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <PageHeader title={prospect.business_name} description={prospect.niche}>
        <Link to="/prospects">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        {editing ? (
          <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Save</Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => { setForm(prospect); setEditing(true); }}>Edit</Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Contact Name</Label>
                {editing ? (
                  <Input value={data.contact_name || ""} onChange={e => setField("contact_name", e.target.value)} className="mt-1" />
                ) : (
                  <p className="text-sm font-medium mt-1">{prospect.contact_name || "—"}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                {editing ? (
                  <Select value={data.status || "found"} onValueChange={v => setField("status", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1"><StatusBadge status={prospect.status} /></div>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Score</Label>
                {editing ? (
                  <Input type="number" value={data.score || ""} onChange={e => setField("score", Number(e.target.value))} className="mt-1" />
                ) : (
                  <p className="text-sm font-mono font-bold mt-1">{prospect.score || "—"}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Lead Source</Label>
                <p className="text-sm mt-1 capitalize">{(prospect.lead_source || "—").replace(/_/g, " ")}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Assigned Offer</Label>
                {editing ? (
                  <Input value={data.assigned_offer || ""} onChange={e => setField("assigned_offer", e.target.value)} className="mt-1" />
                ) : (
                  <p className="text-sm mt-1">{prospect.assigned_offer || "—"}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Next Follow-up</Label>
                {editing ? (
                  <Input type="date" value={data.next_followup_date || ""} onChange={e => setField("next_followup_date", e.target.value)} className="mt-1" />
                ) : (
                  <p className="text-sm mt-1">{prospect.next_followup_date || "—"}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Notes & Objections</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Personalized Notes</Label>
                {editing ? (
                  <Textarea value={data.personalized_notes || ""} onChange={e => setField("personalized_notes", e.target.value)} rows={3} className="mt-1" />
                ) : (
                  <p className="text-sm mt-1 whitespace-pre-wrap">{prospect.personalized_notes || "No notes"}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Objections</Label>
                {editing ? (
                  <Textarea value={data.objections || ""} onChange={e => setField("objections", e.target.value)} rows={2} className="mt-1" />
                ) : (
                  <p className="text-sm mt-1">{prospect.objections || "None recorded"}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Contact Info</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {prospect.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`mailto:${prospect.email}`} className="hover:text-primary">{prospect.email}</a>
                </div>
              )}
              {prospect.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{prospect.phone}</span>
                </div>
              )}
              {prospect.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary truncate">{prospect.website}</a>
                </div>
              )}
              {(prospect.city || prospect.state) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{[prospect.city, prospect.state].filter(Boolean).join(", ")}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Reply History</CardTitle></CardHeader>
            <CardContent>
              {replies.length === 0 ? (
                <p className="text-xs text-muted-foreground">No replies yet</p>
              ) : (
                <div className="space-y-2">
                  {replies.map(r => (
                    <div key={r.id} className="p-2 rounded-md bg-muted/50 text-xs">
                      <p className="font-medium capitalize">{r.classification?.replace(/_/g, " ")}</p>
                      <p className="text-muted-foreground mt-1 line-clamp-2">{r.reply_text}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}