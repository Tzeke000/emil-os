import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Check, Copy, FileText, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["cold_email", "follow_up_email", "sms", "voicemail_script", "objection_handling", "payment_request", "check_in", "re_engagement"];
const TONES = ["professional", "friendly", "urgent", "casual", "direct"];

const CHANNEL_META = {
  cold_email: { color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
  follow_up_email: { color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  sms: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  voicemail_script: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  objection_handling: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  payment_request: { color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  check_in: { color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/20" },
  re_engagement: { color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
};

export default function Templates() {
  const [showCreate, setShowCreate] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => base44.entities.OutreachTemplate.list("-times_used", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OutreachTemplate.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["templates"] }); setShowCreate(false); setForm({}); toast.success("Template created"); },
  });

  const filtered = categoryFilter === "all" ? templates : templates.filter(t => t.category === categoryFilter);

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Intelligence Library</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Outreach Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-foreground">{templates.filter(t => t.approved).length}</span> approved · <span className="font-mono text-foreground">{templates.length}</span> total
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button onClick={() => setCategoryFilter("all")} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${categoryFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
          All
        </button>
        {CATEGORIES.map(c => {
          const meta = CHANNEL_META[c] || {};
          const count = templates.filter(t => t.category === c).length;
          if (count === 0) return null;
          return (
            <button key={c} onClick={() => setCategoryFilter(c)} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors capitalize ${categoryFilter === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {c.replace(/_/g, " ")} <span className="font-mono opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Template list — row style */}
      <div className="border border-border rounded-xl overflow-hidden bg-card divide-y divide-border/60">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground font-mono">— no templates match this filter —</div>
        )}
        {filtered.map(t => {
          const meta = CHANNEL_META[t.category] || {};
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors text-left group"
            >
              {/* Category tag */}
              <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border flex-shrink-0 ${meta.bg} ${meta.color}`}>
                {t.category?.replace(/_/g, " ")}
              </span>

              {/* Name + preview */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  {t.approved && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{t.body?.substring(0, 100)}...</p>
              </div>

              {/* Meta right */}
              <div className="flex items-center gap-4 flex-shrink-0 text-xs font-mono text-muted-foreground">
                {t.reply_rate > 0 && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <TrendingUp className="w-3 h-3" /> {t.reply_rate}%
                  </span>
                )}
                {t.times_used > 0 && <span>{t.times_used}x used</span>}
                {t.tone && <span className="capitalize text-muted-foreground/60">{t.tone}</span>}
                {t.variables?.length > 0 && <span className="text-primary/70">{t.variables.length} vars</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-xl bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {selectedTemplate?.name}
              {selectedTemplate?.approved && <Check className="w-4 h-4 text-emerald-400" />}
            </DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {(() => { const meta = CHANNEL_META[selectedTemplate.category] || {}; return (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${meta.bg} ${meta.color}`}>{selectedTemplate.category?.replace(/_/g, " ")}</span>
                ); })()}
                {selectedTemplate.tone && <Badge variant="secondary" className="capitalize text-xs">{selectedTemplate.tone}</Badge>}
                {selectedTemplate.reply_rate > 0 && <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/20"><TrendingUp className="w-3 h-3 mr-1" />{selectedTemplate.reply_rate}% reply rate</Badge>}
                {selectedTemplate.times_used > 0 && <Badge variant="secondary" className="text-xs font-mono">{selectedTemplate.times_used}x used</Badge>}
              </div>

              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <pre className="text-sm whitespace-pre-wrap font-sans text-foreground leading-relaxed">{selectedTemplate.body}</pre>
              </div>

              {selectedTemplate.variables?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-widest font-semibold">Variables</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {selectedTemplate.variables.map(v => (
                      <code key={v} className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-mono">{`{{${v}}}`}</code>
                    ))}
                  </div>
                </div>
              )}

              {selectedTemplate.performance_notes && (
                <div className="bg-muted/30 border border-border rounded p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Performance Notes</p>
                  <p className="text-sm">{selectedTemplate.performance_notes}</p>
                </div>
              )}

              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(selectedTemplate.body); toast.success("Template copied to clipboard"); }}>
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Body
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader><DialogTitle className="text-sm font-mono">New Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={form.category || ""} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tone</Label>
                <Select value={form.tone || ""} onValueChange={v => setForm({ ...form, tone: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Body — use {`{{variable}}`} for placeholders</Label>
              <Textarea value={form.body || ""} onChange={e => setForm({ ...form, body: e.target.value })} rows={7} className="font-mono text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Offer Type</Label>
              <Input value={form.offer_type || ""} onChange={e => setForm({ ...form, offer_type: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={() => createMutation.mutate({ ...form, approved: false })} disabled={!form.name || !form.category}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}