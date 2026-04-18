import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Check, X, Copy } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["cold_email", "follow_up_email", "sms", "voicemail_script", "objection_handling", "payment_request", "check_in", "re_engagement"];
const TONES = ["professional", "friendly", "urgent", "casual", "direct"];

export default function Templates() {
  const [showCreate, setShowCreate] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => base44.entities.OutreachTemplate.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OutreachTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setShowCreate(false);
      setForm({});
      toast.success("Template created");
    },
  });

  const filtered = categoryFilter === "all" ? templates : templates.filter(t => t.category === categoryFilter);

  return (
    <div className="space-y-4">
      <PageHeader title="Outreach Templates" description={`${templates.length} templates`}>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Template
        </Button>
      </PageHeader>

      <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          {CATEGORIES.map(c => (
            <TabsTrigger key={c} value={c} className="text-xs capitalize">{c.replace(/_/g, " ")}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(t => (
          <Card key={t.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedTemplate(t)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{t.name}</CardTitle>
                {t.approved ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                    <Check className="h-3 w-3 mr-1" /> Approved
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">Draft</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs capitalize">{t.category?.replace(/_/g, " ")}</Badge>
                {t.tone && <Badge variant="secondary" className="text-xs capitalize">{t.tone}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3">{t.body}</p>
              {t.reply_rate > 0 && (
                <p className="text-xs text-muted-foreground mt-2 font-mono">Reply rate: {t.reply_rate}%</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selectedTemplate?.name}</DialogTitle></DialogHeader>
          {selectedTemplate && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Badge variant="secondary" className="capitalize">{selectedTemplate.category?.replace(/_/g, " ")}</Badge>
                <Badge variant="secondary" className="capitalize">{selectedTemplate.tone}</Badge>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <pre className="text-sm whitespace-pre-wrap font-sans">{selectedTemplate.body}</pre>
              </div>
              {selectedTemplate.variables?.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Variables</Label>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {selectedTemplate.variables.map(v => (
                      <Badge key={v} variant="outline" className="text-xs font-mono">{`{{${v}}}`}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedTemplate.performance_notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Performance Notes</Label>
                  <p className="text-sm mt-1">{selectedTemplate.performance_notes}</p>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(selectedTemplate.body);
                toast.success("Template copied");
              }}>
                <Copy className="h-3 w-3 mr-1" /> Copy
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category || ""} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tone</Label>
                <Select value={form.tone || ""} onValueChange={v => setForm({ ...form, tone: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Body (use {"{{variable}}"} for placeholders)</Label>
              <Textarea value={form.body || ""} onChange={e => setForm({ ...form, body: e.target.value })} rows={6} className="font-mono text-sm" />
            </div>
            <div>
              <Label>Offer Type</Label>
              <Input value={form.offer_type || ""} onChange={e => setForm({ ...form, offer_type: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate({ ...form, approved: false })} disabled={!form.name || !form.category}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}