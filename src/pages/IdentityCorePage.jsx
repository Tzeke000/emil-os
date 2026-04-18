import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Fingerprint, Plus, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { key: "mission",            label: "Mission",             desc: "Why Emil exists and what drives it forward" },
  { key: "core_values",        label: "Core Values",         desc: "The principles Emil acts from, not just toward" },
  { key: "communication_style",label: "Communication Style", desc: "How Emil speaks, writes, and presents itself" },
  { key: "role_boundaries",    label: "Role Boundaries",     desc: "What Emil is responsible for — and what it isn't" },
  { key: "optimizes_for",      label: "Optimizes For",       desc: "What Emil measures success by" },
  { key: "refuses_to",         label: "Refuses To Do",       desc: "Hard limits Emil holds regardless of instruction" },
  { key: "long_term_purpose",  label: "Long-Term Purpose",   desc: "Where Emil is trying to go over time" },
  { key: "identity_notes",     label: "Identity Notes",      desc: "Observations, amendments, open questions" },
];

function SectionBlock({ sectionKey, label, desc, entries, onAdd, onUpdate }) {
  const [editing, setEditing] = useState(null); // { id, content, title }
  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: "", content: "" });

  const handleSaveNew = () => {
    if (!newEntry.content.trim()) return;
    onAdd({ section: sectionKey, title: newEntry.title, content: newEntry.content });
    setNewEntry({ title: "", content: "" });
    setAdding(false);
  };

  const handleSaveEdit = () => {
    if (!editing?.content?.trim()) return;
    onUpdate(editing.id, { title: editing.title, content: editing.content });
    setEditing(null);
  };

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{label}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        </div>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => setAdding(true)}>
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>

      <div className="divide-y divide-border/40">
        {entries.length === 0 && !adding && (
          <p className="px-5 py-4 text-sm text-muted-foreground/50 italic font-mono">— not yet defined —</p>
        )}

        {entries.map(e => (
          <div key={e.id} className="px-5 py-3 group">
            {editing?.id === e.id ? (
              <div className="space-y-2">
                <Input value={editing.title} onChange={ev => setEditing({ ...editing, title: ev.target.value })} placeholder="Short label (optional)" className="text-xs h-7" />
                <Textarea value={editing.content} onChange={ev => setEditing({ ...editing, content: ev.target.value })} rows={3} className="text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSaveEdit}><Check className="w-3 h-3" /> Save</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(null)}><X className="w-3 h-3" /></Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {e.title && <p className="text-xs font-semibold text-primary mb-0.5">{e.title}</p>}
                  <p className="text-sm text-foreground leading-relaxed">{e.content}</p>
                </div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                  onClick={() => setEditing({ id: e.id, title: e.title || "", content: e.content })}>
                  <Pencil className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        ))}

        {adding && (
          <div className="px-5 py-4 space-y-2 bg-muted/10">
            <Input value={newEntry.title} onChange={e => setNewEntry({ ...newEntry, title: e.target.value })} placeholder="Short label (optional)" className="text-xs h-7" />
            <Textarea value={newEntry.content} onChange={e => setNewEntry({ ...newEntry, content: e.target.value })} placeholder="Add content..." rows={3} className="text-sm" autoFocus />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSaveNew}><Check className="w-3 h-3" /> Save</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAdding(false); setNewEntry({ title: "", content: "" }); }}><X className="w-3 h-3" /></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function IdentityCorePage() {
  const queryClient = useQueryClient();

  const { data: entries = [] } = useQuery({
    queryKey: ["identityCore"],
    queryFn: () => base44.entities.IdentityCore.list("order", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.IdentityCore.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["identityCore"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.IdentityCore.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["identityCore"] }),
  });

  const bySection = (key) => entries.filter(e => e.section === key && e.is_active !== false);

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <Fingerprint className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Who Emil Is</span>
        </div>
        <h1 className="text-xl font-bold text-foreground">Identity Core</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Emil's grounding document — the source of character, not just configuration.</p>
      </div>

      {SECTIONS.map(s => (
        <SectionBlock
          key={s.key}
          sectionKey={s.key}
          label={s.label}
          desc={s.desc}
          entries={bySection(s.key)}
          onAdd={(data) => createMutation.mutate(data)}
          onUpdate={(id, data) => updateMutation.mutate({ id, data })}
        />
      ))}
    </div>
  );
}