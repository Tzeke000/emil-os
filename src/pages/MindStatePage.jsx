import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Save, Pencil } from "lucide-react";
import { format } from "date-fns";

const CONFIDENCE_META = {
  very_low:  { label: "Very Low",  color: "text-red-400",     bar: "bg-red-400",     width: "w-1/5" },
  low:       { label: "Low",       color: "text-amber-400",   bar: "bg-amber-400",   width: "w-2/5" },
  moderate:  { label: "Moderate",  color: "text-yellow-400",  bar: "bg-yellow-400",  width: "w-3/5" },
  high:      { label: "High",      color: "text-emerald-400", bar: "bg-emerald-400", width: "w-4/5" },
  very_high: { label: "Very High", color: "text-primary",     bar: "bg-primary",     width: "w-full" },
};

const FIELDS = [
  { key: "focused_on",            label: "Focused On",              placeholder: "What Emil is actively working toward..." },
  { key: "current_objective",     label: "Current Objective",       placeholder: "The specific goal right now..." },
  { key: "current_blocker",       label: "Current Blocker",         placeholder: "What's in the way..." },
  { key: "waiting_on",            label: "Waiting On",              placeholder: "Pending input, decision, or event..." },
  { key: "last_meaningful_progress", label: "Last Meaningful Progress", placeholder: "What actually moved forward recently..." },
  { key: "next_intended_action",  label: "Next Intended Action",    placeholder: "What Emil will do when unblocked..." },
  { key: "watching_for",          label: "Watching For",            placeholder: "Signals, triggers, or changes to monitor..." },
  { key: "mood_note",             label: "State Note",              placeholder: "Optional tone, energy, or context..." },
];

const EMPTY = {
  focused_on: "", current_objective: "", current_blocker: "", waiting_on: "",
  confidence_level: "moderate", last_meaningful_progress: "", next_intended_action: "",
  watching_for: "", mood_note: "",
};

export default function MindStatePage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: stateList = [] } = useQuery({
    queryKey: ["mindState"],
    queryFn: () => base44.entities.MindState.list("-updated_date", 1),
  });

  const state = stateList[0] || null;

  useEffect(() => {
    if (state) setForm({ ...EMPTY, ...state });
  }, [state]);

  const saveMutation = useMutation({
    mutationFn: (data) => state
      ? base44.entities.MindState.update(state.id, { ...data, updated_at: new Date().toISOString() })
      : base44.entities.MindState.create({ ...data, updated_at: new Date().toISOString() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mindState"] }); setEditing(false); },
  });

  const confidenceMeta = CONFIDENCE_META[form.confidence_level] || CONFIDENCE_META.moderate;

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Live State</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Mind State</h1>
          <p className="text-sm text-muted-foreground mt-0.5">What Emil is holding right now.</p>
        </div>
        <div className="flex items-center gap-2">
          {state?.updated_at && (
            <span className="text-xs font-mono text-muted-foreground">
              Updated {format(new Date(state.updated_at), "MMM d, h:mm a")}
            </span>
          )}
          {!editing && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(true)}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* Confidence bar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Confidence Level</p>
          <span className={`text-sm font-semibold ${confidenceMeta.color}`}>{confidenceMeta.label}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${confidenceMeta.bar} ${confidenceMeta.width}`} />
        </div>
        {editing && (
          <div className="mt-3">
            <Select value={form.confidence_level} onValueChange={v => setForm({ ...form, confidence_level: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CONFIDENCE_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-3">
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key} className="bg-card border border-border rounded-xl px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">{label}</p>
            {editing ? (
              <Textarea
                value={form[key] || ""}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                rows={2}
                className="text-sm bg-transparent border-0 p-0 resize-none focus-visible:ring-0 shadow-none"
              />
            ) : (
              <p className={`text-sm leading-relaxed ${form[key] ? "text-foreground" : "text-muted-foreground/40 italic"}`}>
                {form[key] || placeholder}
              </p>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="flex gap-2 pt-2">
          <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="gap-1.5">
            <Save className="w-3.5 h-3.5" /> Save State
          </Button>
          <Button variant="outline" onClick={() => { setEditing(false); if (state) setForm({ ...EMPTY, ...state }); }}>Cancel</Button>
        </div>
      )}
    </div>
  );
}