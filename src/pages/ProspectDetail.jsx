import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import StatusBadge from "../components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Globe, Phone, Mail, MapPin, ChevronRight, Users, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUSES = ["found", "scored", "ready_for_outreach", "contacted", "follow_up_due", "replied", "interested", "closed_won", "closed_lost", "archived"];
const STATUS_PIPELINE = ["found", "scored", "ready_for_outreach", "contacted", "follow_up_due", "replied", "interested", "closed_won"];

const NEXT_STATUS = {
  found: "scored", scored: "ready_for_outreach", ready_for_outreach: "contacted",
  contacted: "follow_up_due", follow_up_due: "replied", replied: "interested",
  interested: "closed_won",
};

const CLASSIFICATION_META = {
  interested: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  not_now: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  question: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  price_objection: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  no_thanks: "text-red-400 bg-red-500/10 border-red-500/20",
  needs_human_review: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function ProspectDetail() {
  const id = window.location.pathname.split("/").pop();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);

  const { data: prospect, isLoading } = useQuery({
    queryKey: ["prospect", id],
    queryFn: () => base44.entities.Prospect.filter({ id }).then(l => l[0]),
    enabled: !!id,
  });

  useEffect(() => {
    if (prospect && !form) setForm(prospect);
  }, [prospect]);

  const { data: replies = [] } = useQuery({
    queryKey: ["prospect-replies", id],
    queryFn: () => base44.entities.Reply.filter({ prospect_id: id }),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Prospect.update(id, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["prospect", id] });
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      setEditing(false);
      toast.success("Saved");
    },
  });

  const quickStatus = (status) => {
    updateMutation.mutate({ status });
    toast.success(`Status → ${status.replace(/_/g, " ")}`);
  };

  if (isLoading || !prospect) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm font-mono">Loading...</div>;
  }

  const data = editing ? (form || prospect) : prospect;
  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const handleSave = () => {
    const { id: _id, created_date, updated_date, created_by, ...updates } = form;
    updateMutation.mutate(updates);
  };

  const currentStepIndex = STATUS_PIPELINE.indexOf(prospect.status);

  return (
    <div className="p-6 max-w-6xl">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-5">
        <Link to="/prospects">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Prospects
          </Button>
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm text-foreground font-semibold">{prospect.business_name}</span>
        <div className="ml-auto flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setForm(prospect); }}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-1.5" /> Save
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => { setForm(prospect); setEditing(true); }}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* Name + status header */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-1.5">
          <h1 className="text-2xl font-bold text-foreground">{prospect.business_name}</h1>
          <StatusBadge status={prospect.status} />
          {prospect.score > 0 && (
            <span className="font-mono text-sm font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
              Score: {prospect.score}
            </span>
          )}
        </div>
        {prospect.niche && <p className="text-sm text-muted-foreground">{prospect.niche} · {[prospect.city, prospect.state].filter(Boolean).join(", ")}</p>}
      </div>

      {/* Pipeline progress bar */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {STATUS_PIPELINE.map((s, i) => {
          const isPast = i < currentStepIndex;
          const isCurrent = i === currentStepIndex;
          const isFuture = i > currentStepIndex;
          return (
            <React.Fragment key={s}>
              <button
                onClick={() => quickStatus(s)}
                className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isCurrent ? "bg-primary text-primary-foreground shadow-sm" :
                  isPast ? "bg-muted/60 text-muted-foreground hover:bg-muted" :
                  "bg-muted/20 text-muted-foreground/40 hover:bg-muted/40 hover:text-muted-foreground"
                }`}
              >
                {s.replace(/_/g, " ")}
              </button>
              {i < STATUS_PIPELINE.length - 1 && (
                <ChevronRight className={`w-3 h-3 flex-shrink-0 ${isPast ? "text-muted-foreground" : "text-muted-foreground/20"}`} />
              )}
            </React.Fragment>
          );
        })}
        {NEXT_STATUS[prospect.status] && (
          <Button size="sm" variant="outline" className="ml-3 flex-shrink-0 text-xs h-8" onClick={() => quickStatus(NEXT_STATUS[prospect.status])}>
            <ChevronRight className="w-3 h-3 mr-1" /> Advance
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">

          {/* Core fields */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-4">Lead Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Contact Name</Label>
                {editing ? <Input value={data.contact_name || ""} onChange={e => setField("contact_name", e.target.value)} className="mt-1" /> : <p className="text-sm font-medium mt-1">{prospect.contact_name || "—"}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                {editing ? (
                  <Select value={data.status || "found"} onValueChange={v => setField("status", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <div className="mt-1"><StatusBadge status={prospect.status} /></div>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Score</Label>
                {editing ? <Input type="number" value={data.score || ""} onChange={e => setField("score", Number(e.target.value))} className="mt-1" /> : <p className="text-sm font-mono font-bold mt-1 text-primary">{prospect.score || "—"}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Lead Source</Label>
                <p className="text-sm mt-1 capitalize">{(prospect.lead_source || "—").replace(/_/g, " ")}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Assigned Offer</Label>
                {editing ? <Input value={data.assigned_offer || ""} onChange={e => setField("assigned_offer", e.target.value)} className="mt-1" /> : <p className="text-sm mt-1">{prospect.assigned_offer || "—"}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Next Follow-up</Label>
                {editing ? <Input type="date" value={data.next_followup_date || ""} onChange={e => setField("next_followup_date", e.target.value)} className="mt-1" /> : <p className="text-sm mt-1 font-mono">{prospect.next_followup_date ? format(new Date(prospect.next_followup_date), "MMM d, yyyy") : "—"}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Last Contacted</Label>
                {editing ? <Input type="date" value={data.last_contacted_date || ""} onChange={e => setField("last_contacted_date", e.target.value)} className="mt-1" /> : <p className="text-sm mt-1 font-mono">{prospect.last_contacted_date ? format(new Date(prospect.last_contacted_date), "MMM d, yyyy") : "—"}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tags</Label>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {(prospect.tags || []).map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                  {!prospect.tags?.length && <span className="text-sm text-muted-foreground">—</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Notes & Intel</p>
            <div>
              <Label className="text-xs text-muted-foreground">Personalized Notes</Label>
              {editing ? (
                <Textarea value={data.personalized_notes || ""} onChange={e => setField("personalized_notes", e.target.value)} rows={3} className="mt-1" />
              ) : (
                <p className="text-sm mt-1 whitespace-pre-wrap text-foreground/90">{prospect.personalized_notes || <span className="text-muted-foreground">No notes</span>}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Objections</Label>
              {editing ? (
                <Textarea value={data.objections || ""} onChange={e => setField("objections", e.target.value)} rows={2} className="mt-1" />
              ) : (
                <p className="text-sm mt-1">{prospect.objections || <span className="text-muted-foreground">None recorded</span>}</p>
              )}
            </div>
            {prospect.outcome && (
              <div>
                <Label className="text-xs text-muted-foreground">Outcome</Label>
                <p className="text-sm mt-1">{prospect.outcome}</p>
              </div>
            )}
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          {/* Contact info */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">Contact</p>
            <div className="space-y-2.5">
              {prospect.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <a href={`mailto:${prospect.email}`} className="hover:text-primary transition-colors truncate">{prospect.email}</a>
                </div>
              )}
              {prospect.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <a href={`tel:${prospect.phone}`} className="hover:text-primary transition-colors">{prospect.phone}</a>
                </div>
              )}
              {prospect.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors truncate">{prospect.website}</a>
                </div>
              )}
              {(prospect.city || prospect.state) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">{[prospect.city, prospect.state].filter(Boolean).join(", ")}</span>
                </div>
              )}
              {!prospect.email && !prospect.phone && !prospect.website && (
                <p className="text-xs text-muted-foreground">No contact info</p>
              )}
            </div>
          </div>

          {/* Reply history */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">
              Reply History <span className="font-mono normal-case ml-1 text-foreground">{replies.length}</span>
            </p>
            {replies.length === 0 ? (
              <p className="text-xs text-muted-foreground">No replies yet</p>
            ) : (
              <div className="space-y-2">
                {replies.map(r => (
                  <div key={r.id} className="border border-border rounded-lg p-2.5 bg-muted/20">
                    <div className="flex items-center gap-2 mb-1">
                      {r.classification && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded border capitalize ${CLASSIFICATION_META[r.classification] || "text-muted-foreground bg-muted/50 border-border"}`}>
                          {r.classification.replace(/_/g, " ")}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground font-mono ml-auto">
                        {r.date_received && format(new Date(r.date_received), "MMM d")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{r.reply_text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}