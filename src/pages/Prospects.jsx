import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import PageHeader from "../components/shared/PageHeader";
import StatusBadge from "../components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, ArrowUpDown, ExternalLink } from "lucide-react";

const STATUSES = ["found", "scored", "ready_for_outreach", "contacted", "follow_up_due", "replied", "interested", "closed_won", "closed_lost", "archived"];

export default function Prospects() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score");
  const [showCreate, setShowCreate] = useState(false);
  const [newProspect, setNewProspect] = useState({ business_name: "", contact_name: "", niche: "", email: "", phone: "", city: "", state: "", website: "", lead_source: "google_maps", score: 0, status: "found", personalized_notes: "" });

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
      setNewProspect({ business_name: "", contact_name: "", niche: "", email: "", phone: "", city: "", state: "", website: "", lead_source: "google_maps", score: 0, status: "found", personalized_notes: "" });
    },
  });

  const filtered = prospects
    .filter(p => {
      const matchSearch = !search || p.business_name?.toLowerCase().includes(search.toLowerCase()) || p.contact_name?.toLowerCase().includes(search.toLowerCase()) || p.niche?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === "score") return (b.score || 0) - (a.score || 0);
      if (sortBy === "status") return STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
      if (sortBy === "date") return new Date(b.created_date) - new Date(a.created_date);
      return 0;
    });

  return (
    <div className="p-6 max-w-7xl">
      <PageHeader title="Prospects" subtitle={`${prospects.length} total · ${filtered.length} shown`}>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Prospect
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search prospects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9 bg-card"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-36 h-9 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Sort by Score</SelectItem>
            <SelectItem value="status">Sort by Status</SelectItem>
            <SelectItem value="date">Sort by Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">Business</TableHead>
              <TableHead className="text-xs">Contact</TableHead>
              <TableHead className="text-xs">Niche</TableHead>
              <TableHead className="text-xs">Score</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Source</TableHead>
              <TableHead className="text-xs">Location</TableHead>
              <TableHead className="text-xs w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => window.location.href = `/prospects/${p.id}`}>
                <TableCell className="font-medium text-sm">{p.business_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.contact_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.niche}</TableCell>
                <TableCell>
                  <span className="font-mono text-sm font-medium text-primary">{p.score || 0}</span>
                </TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground capitalize">{p.lead_source?.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{[p.city, p.state].filter(Boolean).join(", ")}</TableCell>
                <TableCell>
                  <Link to={`/prospects/${p.id}`} onClick={e => e.stopPropagation()}>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No prospects found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader><DialogTitle>Add Prospect</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Business Name *</Label>
              <Input value={newProspect.business_name} onChange={e => setNewProspect({...newProspect, business_name: e.target.value})} className="mt-1 bg-background" />
            </div>
            <div>
              <Label className="text-xs">Contact Name</Label>
              <Input value={newProspect.contact_name} onChange={e => setNewProspect({...newProspect, contact_name: e.target.value})} className="mt-1 bg-background" />
            </div>
            <div>
              <Label className="text-xs">Niche</Label>
              <Input value={newProspect.niche} onChange={e => setNewProspect({...newProspect, niche: e.target.value})} className="mt-1 bg-background" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={newProspect.email} onChange={e => setNewProspect({...newProspect, email: e.target.value})} className="mt-1 bg-background" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={newProspect.phone} onChange={e => setNewProspect({...newProspect, phone: e.target.value})} className="mt-1 bg-background" />
            </div>
            <div>
              <Label className="text-xs">City</Label>
              <Input value={newProspect.city} onChange={e => setNewProspect({...newProspect, city: e.target.value})} className="mt-1 bg-background" />
            </div>
            <div>
              <Label className="text-xs">State</Label>
              <Input value={newProspect.state} onChange={e => setNewProspect({...newProspect, state: e.target.value})} className="mt-1 bg-background" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Website</Label>
              <Input value={newProspect.website} onChange={e => setNewProspect({...newProspect, website: e.target.value})} className="mt-1 bg-background" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea value={newProspect.personalized_notes} onChange={e => setNewProspect({...newProspect, personalized_notes: e.target.value})} className="mt-1 bg-background" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(newProspect)} disabled={!newProspect.business_name}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}