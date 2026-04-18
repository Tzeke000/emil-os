import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../components/shared/PageHeader";
import StatusBadge from "../components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Trash2, Plus, Clock } from "lucide-react";
import { format } from "date-fns";

const STATUSES = ["found", "scored", "ready_for_outreach", "contacted", "follow_up_due", "replied", "interested", "closed_won", "closed_lost", "archived"];

export default function ProspectDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = window.location.pathname.split("/").pop();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: prospect, isLoading } = useQuery({
    queryKey: ["prospect", id],
    queryFn: async () => {
      const list = await base44.entities.Prospect.filter({ id });
      return list[0] || null;
    },
    enabled: !!id,
  });

  const [form, setForm] = useState(null);
  const [newEvent, setNewEvent] = useState({ action: "", notes: "" });

  const editForm = form || prospect || {};

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Prospect.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prospect", id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Prospect.delete(id),
    onSuccess: () => navigate("/prospects"),
  });

  const handleSave = () => {
    updateMutation.mutate(editForm);
    setForm(null);
  };

  const addTimelineEvent = () => {
    if (!newEvent.action) return;
    const timeline = [...(editForm.timeline || []), { date: new Date().toISOString(), action: newEvent.action, notes: newEvent.notes }];
    updateMutation.mutate({ ...editForm, timeline });
    setNewEvent({ action: "", notes: "" });
  };

  const updateField = (key, value) => {
    setForm({ ...editForm, [key]: value });
  };

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!prospect) {
    return <div className="p-6"><p className="text-muted-foreground">Prospect not found</p></div>;
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/prospects"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{editForm.business_name}</h1>
          <p className="text-sm text-muted-foreground">{editForm.contact_name} · {editForm.niche}</p>
        </div>
        <StatusBadge status={editForm.status} />
        <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate()}>
          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
        </Button>
        {form && (
          <Button size="sm" onClick={handleSave}>
            <Save className="w-3.5 h-3.5 mr-1" /> Save
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Details */}
        <Card className="lg:col-span-2 bg-card">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Business Name</Label>
              <Input value={editForm.business_name || ""} onChange={e => updateField("business_name", e.target.value)} className="mt-1 bg-background h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Contact</Label>
              <Input value={editForm.contact_name || ""} onChange={e => updateField("contact_name", e.target.value)} className="mt-1 bg-background h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={editForm.email || ""} onChange={e => updateField("email", e.target.value)} className="mt-1 bg-background h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input value={editForm.phone || ""} onChange={e => updateField("phone", e.target.value)} className="mt-1 bg-background h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Website</Label>
              <Input value={editForm.website || ""} onChange={e => updateField("website", e.target.value)} className="mt-1 bg-background h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Niche</Label>
              <Input value={editForm.niche || ""} onChange={e => updateField("niche", e.target.value)} className="mt-1 bg-background h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">City</Label>
              <Input value={editForm.city || ""} onChange={e => updateField("city", e.target.value)} className="mt-1 bg-background h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">State</Label>
              <Input value={editForm.state || ""} onChange={e => updateField("state", e.target.value)} className="mt-1 bg-background h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={editForm.status || "found"} onValueChange={v => updateField("status", v)}>
                <SelectTrigger className="mt-1 bg-background h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Score</Label>
              <Input type="number" value={editForm.score || 0} onChange={e => updateField("score", Number(e.target.value))} className="mt-1 bg-background h-8 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Last Contacted</Label>
              <Input type="date" value={editForm.last_contacted_date || ""} onChange={e => updateField("last_contacted_date", e.target.value)} className="mt-1 bg-background h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Next Follow-up</Label>
              <Input type="date" value={editForm.next_follow_up_date || ""} onChange={e => updateField("next_follow_up_date", e.target.value)} className="mt-1 bg-background h-8 text-sm" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Assigned Offer</Label>
              <Input value={editForm.assigned_offer || ""} onChange={e => updateField("assigned_offer", e.target.value)} className="mt-1 bg-background h-8 text-sm" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea value={editForm.personalized_notes || ""} onChange={e => updateField("personalized_notes", e.target.value)} className="mt-1 bg-background text-sm" rows={3} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Objections</Label>
              <Textarea value={editForm.objections || ""} onChange={e => updateField("objections", e.target.value)} className="mt-1 bg-background text-sm" rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Input placeholder="Action..." value={newEvent.action} onChange={e => setNewEvent({...newEvent, action: e.target.value})} className="bg-background h-8 text-sm" />
              <Input placeholder="Notes..." value={newEvent.notes} onChange={e => setNewEvent({...newEvent, notes: e.target.value})} className="bg-background h-8 text-sm" />
              <Button size="sm" className="w-full" onClick={addTimelineEvent} disabled={!newEvent.action}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Event
              </Button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(editForm.timeline || []).slice().reverse().map((e, i) => (
                <div key={i} className="border-l-2 border-primary/30 pl-3 py-1">
                  <p className="text-xs font-medium text-foreground">{e.action}</p>
                  {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(e.date), "MMM d, h:mm a")}</p>
                </div>
              ))}
              {(!editForm.timeline || editForm.timeline.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-4">No timeline events yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}