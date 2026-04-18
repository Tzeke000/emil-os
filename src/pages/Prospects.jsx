import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import StatusBadge from "../components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, ExternalLink, ChevronRight, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUSES = ["found", "scored", "ready_for_outreach", "contacted", "follow_up_due", "replied", "interested", "closed_won", "closed_lost", "archived"];

const STATUS_PIPELINE = ["found", "scored", "ready_for_outreach", "contacted", "follow_up_due", "replied", "interested", "closed_won"];

const EMPTY_PROSPECT = { business_name: "", contact_name: "", niche: "", email: "", phone: "", city: "", state: "", website: "", lead_source: "google_maps", score: 0, status: "found", personalized_notes: "" };

function ScoreBadge({ score }) {
  const s = score || 0;
  const color = s >= 80 ? "text-emerald-400" : s >= 60 ? "text-amber-400" : s >= 40 ? "text-primary" : "text-muted-foreground";
  return <span className={`font-mono text-sm font-bold ${color}`}>{s}</span>;
}

export default function Prospects() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score");
  const [showCreate, setShowCreate] = useState(false);
  const [newProspect, setNewProspect] = useState(EMPTY_PROSPECT);
  const [quickEditId, setQuickEditId] = useState(null);

  const queryClient = useQueryClient();
  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ["prospects"],
    queryFn: () => base44.entities.Prospect.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Prospect.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      setShowCreate(false);
      setNewProspect(EMPTY_PROSPECT);
      toast.success("Prospect added");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Prospect.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      setQuickEditId(null);
    },
  });

  const quickStatus = (id, status) => {
    updateMutation.mutate({ id, data: { status } });
    toast.success(`Status → ${status.replace(/_/g, " ")}`);
  };

  const filtered = prospects
    .filter(p => {
      const matchSearch = !search || [p.business_name, p.contact_name, p.niche, p.city].some(f => f?.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === "score") return (b.score || 0) - (a.score || 0);
      if (sortBy === "status") return STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
      if (sortBy === "date") return new Date(b.created_date) - new Date(a.created_date);
      return 0;
    });

  // Pipeline counts for status bar
  const pipelineCounts = STATUS_PIPELINE.reduce((acc, s) => {
    acc[s] = prospects.filter(p => p.status === s).length;
    return acc;
  }, {});

  const NEXT_STATUS = {
    found: "scored", scored: "ready_for_outreach", ready_for_outreach: "contacted",
    contacted: "follow_up_due", follow_up_due: "replied", replied: "interested",
    interested: "closed_won",
  };

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Pipeline</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Prospects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-foreground">{prospects.length}</span> total · <span className="font-mono text-foreground">{filtered.length}</span> shown
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Prospect
        </Button>
      </div>

      {/* Pipeline status bar */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5 mb-5">
        {STATUS_PIPELINE.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            className={`text-left rounded-lg px-2.5 py-2 border transition-all ${statusFilter === s ? "bg-primary/15 border-primary/40" : "bg-card border-border hover:border-primary/20"}`}
          >
            <p className="text-lg font-bold font-mono text-foreground leading-none">{pipelineCounts[s] || 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize leading-tight">{s.replace(/_/g, " ")}</p>
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search prospects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9 bg-card"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")} {prospects.filter(p => p.status === s).length > 0 && `(${prospects.filter(p => p.status === s).length})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-36 h-9 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="score">By Score</SelectItem>
            <SelectItem value="status">By Status</SelectItem>
            <SelectItem value="date">By Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 border-border">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Business</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Niche / Location</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next Action</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Follow-up</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.id} className="hover:bg-muted/20 border-border/60 group">
                <TableCell className="font-semibold text-sm">
                  <Link to={`/prospects/${p.id}`} className="hover:text-primary transition-colors">{p.business_name}</Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.contact_name || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  <span>{p.niche}</span>
                  {(p.city || p.state) && <span className="text-muted-foreground/50"> · {[p.city, p.state].filter(Boolean).join(", ")}</span>}
                </TableCell>
                <TableCell><ScoreBadge score={p.score} /></TableCell>
                <TableCell>
                  {/* Inline status change */}
                  <Select value={p.status} onValueChange={v => quickStatus(p.id, v)}>
                    <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:ml-1">
                      <StatusBadge status={p.status} />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {NEXT_STATUS[p.status] ? (
                    <button
                      onClick={() => quickStatus(p.id, NEXT_STATUS[p.status])}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <ChevronRight className="w-3 h-3" /> {NEXT_STATUS[p.status].replace(/_/g, " ")}
                    </button>
                  ) : <span className="text-xs text-muted-foreground/40">—</span>}
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {p.next_followup_date ? format(new Date(p.next_followup_date), "MMM d") : "—"}
                </TableCell>
                <TableCell>
                  <Link to={`/prospects/${p.id}`}>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-14 text-muted-foreground font-mono text-sm">
                  — no prospects match —
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader><DialogTitle className="text-sm font-mono">Add Prospect</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Business Name *</Label>
              <Input value={newProspect.business_name} onChange={e => setNewProspect({ ...newProspect, business_name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Contact Name</Label>
              <Input value={newProspect.contact_name} onChange={e => setNewProspect({ ...newProspect, contact_name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Niche</Label>
              <Input value={newProspect.niche} onChange={e => setNewProspect({ ...newProspect, niche: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={newProspect.email} onChange={e => setNewProspect({ ...newProspect, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input value={newProspect.phone} onChange={e => setNewProspect({ ...newProspect, phone: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">City</Label>
              <Input value={newProspect.city} onChange={e => setNewProspect({ ...newProspect, city: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">State</Label>
              <Input value={newProspect.state} onChange={e => setNewProspect({ ...newProspect, state: e.target.value })} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Website</Label>
              <Input value={newProspect.website} onChange={e => setNewProspect({ ...newProspect, website: e.target.value })} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea value={newProspect.personalized_notes} onChange={e => setNewProspect({ ...newProspect, personalized_notes: e.target.value })} className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={() => createMutation.mutate(newProspect)} disabled={!newProspect.business_name}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}