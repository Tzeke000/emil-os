import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, GitBranch, Check, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PlaybookExpander() {
  const [selectedId, setSelectedId] = useState("");
  const [generatedSteps, setGeneratedSteps] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scenario, setScenario] = useState("");
  const queryClient = useQueryClient();

  const { data: playbooks = [] } = useQuery({
    queryKey: ["playbooks"],
    queryFn: () => base44.entities.Playbook.list("-created_date", 100),
  });

  const selected = playbooks.find(p => p.id === selectedId);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Playbook.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbooks"] });
      toast.success("Playbook updated with expanded steps");
      setGeneratedSteps(null);
    },
  });

  const generate = async () => {
    if (!selected) return;
    setLoading(true);
    setGeneratedSteps(null);
    const existingSteps = (selected.rule_steps || []).join("\n");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are designing a detailed execution playbook for Emil, an AI sales agent. Emil runs on Ollama (local LLM) and needs extremely clear step-by-step instructions so she can execute without needing to re-reason from scratch each time (which wastes tokens).

Playbook: "${selected.name}"
Category: ${selected.category}
Description: ${selected.description || "none"}
Trigger condition: ${selected.trigger_condition || "not specified"}
Existing steps: ${existingSteps || "none"}
${scenario ? `Additional scenario context: ${scenario}` : ""}

Generate 5-10 precise, numbered execution steps for this playbook. Each step should:
- Start with an action verb
- Be unambiguous (Emil should not need to infer anything)
- Reference specific entities or fields where relevant (e.g. Prospect.status, Reply.classification)
- Include a decision branch if needed (e.g. "If X then step 5a, else step 5b")
- Be token-efficient — no filler, only what Emil needs to act

Return ONLY a JSON array of step strings.`,
      response_json_schema: {
        type: "object",
        properties: {
          steps: { type: "array", items: { type: "string" } },
          trigger_condition: { type: "string" },
          summary: { type: "string" },
        },
      },
    });
    setGeneratedSteps(res);
    setLoading(false);
  };

  const applySteps = async () => {
    if (!selected || !generatedSteps) return;
    setSaving(true);
    updateMutation.mutate({
      id: selected.id,
      data: {
        rule_steps: generatedSteps.steps,
        trigger_condition: generatedSteps.trigger_condition || selected.trigger_condition,
        description: generatedSteps.summary || selected.description,
      },
    });
    setSaving(false);
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <GitBranch className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Playbook Intelligence</span>
      </div>
      <h1 className="text-xl font-bold text-foreground mb-0.5">Playbook Expander</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Pick a playbook and let AI generate detailed, unambiguous execution steps — so Emil doesn't re-reason every time (saving tokens).
      </p>

      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">Select Playbook</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="mt-1 bg-card">
              <SelectValue placeholder="Choose a playbook to expand…" />
            </SelectTrigger>
            <SelectContent>
              {playbooks.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} <span className="text-muted-foreground text-xs ml-1">({(p.rule_steps || []).length} steps)</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selected && (
          <div className="bg-muted/20 border border-border rounded-lg p-4 space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Current State</p>
            <p className="text-sm font-semibold text-foreground">{selected.name}</p>
            <p className="text-xs text-muted-foreground">{selected.description || "No description"}</p>
            <p className="text-xs text-muted-foreground">Trigger: {selected.trigger_condition || "not set"}</p>
            <p className="text-xs font-mono text-primary">{(selected.rule_steps || []).length} existing steps</p>
          </div>
        )}

        <div>
          <Label className="text-xs text-muted-foreground">Scenario Context (optional)</Label>
          <Input
            value={scenario}
            onChange={e => setScenario(e.target.value)}
            className="mt-1"
            placeholder="e.g. prospect is a dentist who replied asking for pricing"
          />
        </div>

        <Button onClick={generate} disabled={loading || !selectedId} className="w-full gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating steps…</> : <><Sparkles className="w-4 h-4" /> Generate Expanded Steps</>}
        </Button>

        {/* Generated steps */}
        {generatedSteps && (
          <div className="space-y-3">
            {generatedSteps.summary && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5">
                <p className="text-xs text-primary font-semibold mb-0.5">Summary</p>
                <p className="text-xs text-foreground">{generatedSteps.summary}</p>
              </div>
            )}
            {generatedSteps.trigger_condition && (
              <div className="bg-muted/30 rounded-lg px-3 py-2 text-xs">
                <span className="text-muted-foreground font-semibold">Trigger: </span>
                <span className="text-foreground">{generatedSteps.trigger_condition}</span>
              </div>
            )}
            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border/60">
              {generatedSteps.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <span className="text-xs font-bold font-mono text-primary mt-0.5 w-5 flex-shrink-0">{i + 1}.</span>
                  <p className="text-sm text-foreground">{step}</p>
                </div>
              ))}
            </div>
            <Button onClick={applySteps} disabled={saving} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Check className="w-4 h-4" /> Apply Steps to Playbook</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}