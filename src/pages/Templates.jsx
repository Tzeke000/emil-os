import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "../components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, FileText, CheckCircle, Search } from "lucide-react";

const CATEGORIES = ["cold_email", "follow_up_email", "sms", "voicemail_script", "objection_handling", "payment_request", "check_in", "re_engagement"];
const CHANNELS = ["email", "sms", "phone", "voicemail"];
const TONES = ["professional", "casual", "urgent", "friendly", "direct"];

export default function Templates() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", category: "cold_email", channel: "email", tone: "professional", offer_type: "", body: "", variables: [], approved: false, performance_notes: "" });

  const queryClient = useQueryClient();
  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => base44.entities.OutreachTemplate.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OutreachTemplate.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["templates"] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OutreachTemplate.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["templates"] }); closeForm(); },
  });

  const closeForm = () => { setShowCreate(false); setEditingId(null); setForm({ name: "", category: "cold_email", channel: "email", tone: "professional", offer_type: "", body: "", variables: [], approved: false, performance_notes: "" }); };

  const openEdit = (t) => {
    setForm({ name: t.name, category: t.category, channel: t.channel, tone: t.tone || "professional", offer_type: t.offer_type || "", body: t.body || "", variables: t.variables || [], approved: t.approved || false, performance_notes: t.performance_notes || "" });
    setEditingId(t.id);
    setShowCreate(true);
  };

  const handleSave = () => {
    const vars = (form.body?.match(/\{\{(\w+)\}\}/g) || []).map(v => v.replace(/\{|\}/g, ""));
    const data = { ...form, variables: vars };
    if (editingId) { updateMutation.mutate({ id: editingId, data }); } else { createMutation.mutate(data); }
  };

  const filtered = templates.filter(t => {
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || t.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-6 max-w-7xl">
      <PageHeader title="Outreach Templates" subtitle={`${templates.length} templates`}>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Template</Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 bg-card" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-44 h-9 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(t => (
          <Card key={t.id} className="bg-card border-border hover:border-primary/20 transition-colors cursor-pointer" onClick={() => openEdit(t)}>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-medium">{t.name}</CardTitle>
                {t.approved && <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex gap-1.5 mb-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{t.category?.replace(/_/g, " ")}</Badge>
                <Badge variant="outline" className="text-xs">{t.channel}</Badge>
                {t.tone && <Badge variant="outline" className="text-xs">{t.tone}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{t.body}</p>
              {t.variables?.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {t.variables.map(v => <span key={v} className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{`{{${v}}}`}</span>)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader><DialogTitle>{editingId ? "Edit Template" : "New Template"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1 bg-background" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Channel</Label>
                <Select value={form.channel} onValueChange={v => setForm({...form, channel: v})}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tone</Label>
                <Select value={form.tone} onValueChange={v => setForm({...form, tone: v})}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Offer Type</Label>
              <Input value={form.offer_type} onChange={e => setForm({...form, offer_type: e.target.value})} className="mt-1 bg-background" placeholder="e.g. Google Ads Management" />
            </div>
            <div>
              <Label className="text-xs">Body <span className="text-muted-foreground">(use {"{{variable}}"} for placeholders)</span></Label>
              <Textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} className="mt-1 bg-background font-mono text-sm" rows={6} />
            </div>
            <div>
              <Label className="text-xs">Performance Notes</Label>
              <Textarea value={form.performance_notes} onChange={e => setForm({...form, performance_notes: e.target.value})} className="mt-1 bg-background text-sm" rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.approved} onCheckedChange={v => setForm({...form, approved: v})} />
              <Label className="text-xs">Approved for use</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name}>{editingId ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}