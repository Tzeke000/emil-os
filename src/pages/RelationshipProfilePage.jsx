import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Save, Pencil } from "lucide-react";

const EMPTY = {
  user_name: "",
  preferred_tone: "direct",
  preferred_update_style: "bullet_points",
  desired_autonomy_level: "medium_autonomy",
  escalation_preferences: "",
  recurring_priorities: "",
  current_priorities: "",
  stress_points: "",
  interaction_notes: "",
};

const TONE_OPTIONS = ["direct","warm","formal","casual","concise"];
const STYLE_OPTIONS = ["bullet_points","narrative","minimal","detailed","structured"];
const AUTONOMY_OPTIONS = [
  { value: "high_autonomy",   label: "High Autonomy — Emil acts, reports after" },
  { value: "medium_autonomy", label: "Medium — Emil acts on routine, asks on edge cases" },
  { value: "low_autonomy",    label: "Low — Emil plans, user approves before executing" },
  { value: "always_ask",      label: "Always Ask — Emil presents options, user decides" },
];

export default function RelationshipProfilePage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: profiles = [] } = useQuery({
    queryKey: ["relationshipProfile"],
    queryFn: () => base44.entities.RelationshipProfile.list("-created_date", 1),
  });

  const profile = profiles[0] || null;

  useEffect(() => {
    if (profile) setForm({ ...EMPTY, ...profile });
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: (data) => profile
      ? base44.entities.RelationshipProfile.update(profile.id, data)
      : base44.entities.RelationshipProfile.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["relationshipProfile"] }); setEditing(false); },
  });

  const Field = ({ label, fieldKey, type = "textarea", options }) => (
    <div className="bg-card border border-border rounded-xl px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
      {editing ? (
        type === "select" ? (
          <Select value={form[fieldKey] || ""} onValueChange={v => setForm({ ...form, [fieldKey]: v })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {options.map(o => (
                <SelectItem key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
                  {typeof o === "string" ? o.replace(/_/g, " ") : o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : type === "input" ? (
          <Input value={form[fieldKey] || ""} onChange={e => setForm({ ...form, [fieldKey]: e.target.value })} className="text-sm" />
        ) : (
          <Textarea value={form[fieldKey] || ""} onChange={e => setForm({ ...form, [fieldKey]: e.target.value })} rows={3} className="text-sm bg-transparent border-0 p-0 resize-none focus-visible:ring-0 shadow-none" />
        )
      ) : (
        <p className={`text-sm leading-relaxed ${form[fieldKey] ? "text-foreground" : "text-muted-foreground/40 italic"}`}>
          {form[fieldKey]
            ? (typeof AUTONOMY_OPTIONS.find(o => o.value === form[fieldKey]) !== "undefined"
                ? AUTONOMY_OPTIONS.find(o => o.value === form[fieldKey])?.label || form[fieldKey]
                : form[fieldKey])
            : "—"}
        </p>
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">User Relationship</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Relationship Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">How Emil understands and works with you.</p>
        </div>
        {!editing && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(true)}>
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">User Name</p>
        {editing
          ? <Input value={form.user_name} onChange={e => setForm({ ...form, user_name: e.target.value })} placeholder="Your name..." className="text-sm" />
          : <p className={`text-sm ${form.user_name ? "text-foreground font-medium" : "text-muted-foreground/40 italic"}`}>{form.user_name || "—"}</p>
        }
      </div>

      <Field label="Preferred Tone" fieldKey="preferred_tone" type="select" options={TONE_OPTIONS} />
      <Field label="Preferred Update Style" fieldKey="preferred_update_style" type="select" options={STYLE_OPTIONS} />
      <Field label="Desired Autonomy Level" fieldKey="desired_autonomy_level" type="select" options={AUTONOMY_OPTIONS} />
      <Field label="Escalation Preferences" fieldKey="escalation_preferences" />
      <Field label="Recurring Priorities" fieldKey="recurring_priorities" />
      <Field label="Current Priorities" fieldKey="current_priorities" />
      <Field label="Stress Points" fieldKey="stress_points" />
      <Field label="Interaction Notes" fieldKey="interaction_notes" />

      {editing && (
        <div className="flex gap-2 pt-2">
          <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="gap-1.5">
            <Save className="w-3.5 h-3.5" /> Save Profile
          </Button>
          <Button variant="outline" onClick={() => { setEditing(false); if (profile) setForm({ ...EMPTY, ...profile }); }}>Cancel</Button>
        </div>
      )}
    </div>
  );
}