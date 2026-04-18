import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "../components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Settings } from "lucide-react";

export default function AgentSettingsPage() {
  const queryClient = useQueryClient();

  const { data: settingsList = [] } = useQuery({
    queryKey: ["agentSettings"],
    queryFn: () => base44.entities.AgentSettings.list("-created_date", 1),
  });

  const existing = settingsList[0];

  const [form, setForm] = useState({
    agent_name: "Emil",
    default_niche: "",
    default_offer: "",
    pricing: "",
    daily_prospect_target: 20,
    daily_outreach_target: 15,
    token_saving_mode: true,
    automation_mode: false,
    approval_threshold_score: 50,
    approval_threshold_value: 500,
    model_routing_notes: "",
    communication_rules: "",
    active_milestone: "",
    revenue_collected: 0,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        agent_name: existing.agent_name || "Emil",
        default_niche: existing.default_niche || "",
        default_offer: existing.default_offer || "",
        pricing: existing.pricing || "",
        daily_prospect_target: existing.daily_prospect_target || 20,
        daily_outreach_target: existing.daily_outreach_target || 15,
        token_saving_mode: existing.token_saving_mode !== false,
        automation_mode: existing.automation_mode || false,
        approval_threshold_score: existing.approval_threshold_score || 50,
        approval_threshold_value: existing.approval_threshold_value || 500,
        model_routing_notes: existing.model_routing_notes || "",
        communication_rules: existing.communication_rules || "",
        active_milestone: existing.active_milestone || "",
        revenue_collected: existing.revenue_collected || 0,
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existing) {
        return base44.entities.AgentSettings.update(existing.id, data);
      } else {
        return base44.entities.AgentSettings.create(data);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agentSettings"] }),
  });

  const updateField = (key, value) => setForm({ ...form, [key]: value });

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader title="Settings" subtitle="Agent controls & configuration">
        <Button size="sm" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-1" /> {saveMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </PageHeader>

      <div className="space-y-4">
        <Card className="bg-card">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Agent Identity</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Agent Name</Label>
              <Input value={form.agent_name} onChange={e => updateField("agent_name", e.target.value)} className="mt-1 bg-background" />
            </div>
            <div>
              <Label className="text-xs">Active Milestone</Label>
              <Input value={form.active_milestone} onChange={e => updateField("active_milestone", e.target.value)} className="mt-1 bg-background" />
            </div>
            <div>
              <Label className="text-xs">Default Niche</Label>
              <Input value={form.default_niche} onChange={e => updateField("default_niche", e.target.value)} className="mt-1 bg-background" />
            </div>
            <div>
              <Label className="text-xs">Default Offer</Label>
              <Input value={form.default_offer} onChange={e => updateField("default_offer", e.target.value)} className="mt-1 bg-background" />
            </div>
            <div>
              <Label className="text-xs">Pricing</Label>
              <Input value={form.pricing} onChange={e => updateField("pricing", e.target.value)} className="mt-1 bg-background" />
            </div>
            <div>
              <Label className="text-xs">Revenue Collected ($)</Label>
              <Input type="number" value={form.revenue_collected} onChange={e => updateField("revenue_collected", Number(e.target.value))} className="mt-1 bg-background font-mono" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Targets & Thresholds</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Daily Prospect Target</Label>
              <Input type="number" value={form.daily_prospect_target} onChange={e => updateField("daily_prospect_target", Number(e.target.value))} className="mt-1 bg-background font-mono" />
            </div>
            <div>
              <Label className="text-xs">Daily Outreach Target</Label>
              <Input type="number" value={form.daily_outreach_target} onChange={e => updateField("daily_outreach_target", Number(e.target.value))} className="mt-1 bg-background font-mono" />
            </div>
            <div>
              <Label className="text-xs">Approval Score Threshold</Label>
              <Input type="number" value={form.approval_threshold_score} onChange={e => updateField("approval_threshold_score", Number(e.target.value))} className="mt-1 bg-background font-mono" />
            </div>
            <div>
              <Label className="text-xs">Approval Value Threshold ($)</Label>
              <Input type="number" value={form.approval_threshold_value} onChange={e => updateField("approval_threshold_value", Number(e.target.value))} className="mt-1 bg-background font-mono" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Agent Modes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Token Saving Mode</Label>
                <p className="text-xs text-muted-foreground">Use cached context and playbooks to reduce token usage</p>
              </div>
              <Switch checked={form.token_saving_mode} onCheckedChange={v => updateField("token_saving_mode", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Automation Mode</Label>
                <p className="text-xs text-muted-foreground">Allow Emil to execute actions without manual trigger</p>
              </div>
              <Switch checked={form.automation_mode} onCheckedChange={v => updateField("automation_mode", v)} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Rules & Notes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Model Routing Notes</Label>
              <Textarea value={form.model_routing_notes} onChange={e => updateField("model_routing_notes", e.target.value)} className="mt-1 bg-background text-sm" rows={3} placeholder="e.g. Use cheap model for scoring, expensive for outreach drafts" />
            </div>
            <div>
              <Label className="text-xs">Communication Rules</Label>
              <Textarea value={form.communication_rules} onChange={e => updateField("communication_rules", e.target.value)} className="mt-1 bg-background text-sm" rows={3} placeholder="e.g. Never mention competitor names, always lead with value" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}