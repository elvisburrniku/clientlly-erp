import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  Plus, Trash2, Pencil, MoreHorizontal, Users, KanbanSquare, List,
  GripVertical, ArrowRight, X, Search, Filter, Star, Trophy, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const STAGES = [
  { value: "new", label: "I Ri", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "contacted", label: "Kontaktuar", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "qualified", label: "Kualifikuar", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "proposal", label: "Propozim", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { value: "won", label: "Fituar", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "lost", label: "Humbur", color: "bg-red-100 text-red-700 border-red-200" },
];

const SOURCES = ["Website", "Referim", "LinkedIn", "Email", "Telefon", "Tjetër"];
const LABELS = ["Hot", "Warm", "Cold"];

const emptyForm = () => ({
  name: "",
  email: "",
  phone: "",
  company: "",
  stage: "new",
  source: "",
  label: "",
  value: 0,
  notes: "",
  assigned_to: "",
});

export default function Leads() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [draggedLead, setDraggedLead] = useState(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertLead, setConvertLead] = useState(null);

  useEffect(() => { if (tenantId) loadLeads(); }, [tenantId]);

  const loadLeads = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const data = await base44.entities.Lead.filter({ tenant_id: tenantId }, "-created_date", 500);
      setLeads(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("Emri është i detyrueshëm"); return; }
    setSubmitting(true);
    try {
      if (editLead) {
        await base44.entities.Lead.update(editLead.id, form);
        toast.success("Lead u përditësua");
      } else {
        await base44.entities.Lead.create({ ...form, tenant_id: tenantId });
        toast.success("Lead u krijua");
      }
      setDialogOpen(false);
      setForm(emptyForm());
      setEditLead(null);
      loadLeads();
    } catch (err) {
      toast.error("Gabim");
    }
    setSubmitting(false);
  };

  const handleDelete = async (lead) => {
    if (!window.confirm(`Fshi lead ${lead.name}?`)) return;
    await base44.entities.Lead.delete(lead.id);
    toast.success("Lead u fshi");
    loadLeads();
  };

  const openEdit = (lead) => {
    setForm({
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      company: lead.company || "",
      stage: lead.stage || "new",
      source: lead.source || "",
      label: lead.label || "",
      value: lead.value || 0,
      notes: lead.notes || "",
      assigned_to: lead.assigned_to || "",
    });
    setEditLead(lead);
    setDialogOpen(true);
  };

  const handleStageChange = async (lead, newStage) => {
    await base44.entities.Lead.update(lead.id, { stage: newStage });
    loadLeads();
  };

  const handleConvertToClient = async () => {
    if (!convertLead) return;
    try {
      await base44.entities.Client.create({
        tenant_id: tenantId,
        name: convertLead.name,
        email: convertLead.email || "",
        phone: convertLead.phone || "",
        address: "",
        classification: "business",
        notes: `Konvertuar nga lead. Kompania: ${convertLead.company || "—"}`,
      });
      await base44.entities.Lead.update(convertLead.id, { stage: "won" });
      toast.success("Lead u konvertua në klient");
      setConvertDialogOpen(false);
      setConvertLead(null);
      loadLeads();
    } catch (err) {
      toast.error("Gabim gjatë konvertimit");
    }
  };

  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, stageValue) => {
    e.preventDefault();
    if (draggedLead && draggedLead.stage !== stageValue) {
      await handleStageChange(draggedLead, stageValue);
    }
    setDraggedLead(null);
  };

  const filtered = leads.filter(l =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.company || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStageBadge = (stage) => {
    const s = STAGES.find(st => st.value === stage);
    return s ? (
      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", s.color)}>
        {s.label}
      </span>
    ) : <span className="text-xs">{stage}</span>;
  };

  const getLabelBadge = (label) => {
    const colors = {
      Hot: "bg-red-100 text-red-700",
      Warm: "bg-amber-100 text-amber-700",
      Cold: "bg-sky-100 text-sky-700",
    };
    return label ? (
      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", colors[label] || "bg-muted text-muted-foreground")}>
        {label}
      </span>
    ) : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.stage === "new").length,
    won: leads.filter(l => l.stage === "won").length,
    totalValue: leads.reduce((s, l) => s + (parseFloat(l.value) || 0), 0),
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">CRM</p>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Leads & Pipeline</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex bg-muted rounded-xl p-1">
            <button
              onClick={() => setViewMode("kanban")}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg transition", viewMode === "kanban" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground")}
              data-testid="button-view-kanban"
            >
              <KanbanSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg transition", viewMode === "list" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground")}
              data-testid="button-view-list"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => { setForm(emptyForm()); setEditLead(null); setDialogOpen(true); }} className="gap-2" data-testid="button-add-lead">
            <Plus className="w-4 h-4" /> Lead i Ri
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-indigo-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-indigo-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej</p></div>
            <p className="text-2xl font-bold" data-testid="text-total-leads">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-blue-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><Star className="w-4 h-4 text-blue-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Të Rinj</p></div>
            <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-emerald-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><Trophy className="w-4 h-4 text-emerald-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fituar</p></div>
            <p className="text-2xl font-bold text-emerald-600">{stats.won}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-violet-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-violet-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vlera Totale</p></div>
            <p className="text-2xl font-bold">€{stats.totalValue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Kërko lead..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-leads"
          />
        </div>
      </div>

      {viewMode === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const stageLeads = filtered.filter(l => l.stage === stage.value);
            return (
              <div
                key={stage.value}
                className="min-w-[280px] flex-shrink-0 bg-muted/30 rounded-2xl border border-border/40"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.value)}
                data-testid={`kanban-column-${stage.value}`}
              >
                <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border", stage.color)}>
                      {stage.label}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">{stageLeads.length}</span>
                  </div>
                </div>
                <div className="p-3 space-y-2 min-h-[200px]">
                  {stageLeads.map(lead => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead)}
                      className="bg-white rounded-xl border border-border/60 shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                      data-testid={`kanban-card-${lead.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{lead.name}</p>
                          {lead.company && <p className="text-xs text-muted-foreground mt-0.5">{lead.company}</p>}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => openEdit(lead)}>
                              <Pencil className="w-4 h-4 mr-2" /> Modifiko
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setConvertLead(lead); setConvertDialogOpen(true); }}>
                              <ArrowRight className="w-4 h-4 mr-2" /> Konverto në Klient
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(lead)} className="text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Fshi
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {getLabelBadge(lead.label)}
                        {lead.source && <span className="text-[10px] text-muted-foreground">{lead.source}</span>}
                      </div>
                      {(parseFloat(lead.value) || 0) > 0 && (
                        <p className="text-xs font-bold text-primary mt-2">€{parseFloat(lead.value).toFixed(2)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Emri</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Kompania</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Faza</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Burimi</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Etiketa</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Vlera</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                          <Users className="w-7 h-7 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">Nuk ka leads</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((lead) => (
                    <tr key={lead.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-lead-${lead.id}`}>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold">{lead.name}</p>
                        {lead.email && <p className="text-xs text-muted-foreground">{lead.email}</p>}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{lead.company || "—"}</td>
                      <td className="px-6 py-4">{getStageBadge(lead.stage)}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{lead.source || "—"}</td>
                      <td className="px-6 py-4">{getLabelBadge(lead.label) || "—"}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium">€{(parseFloat(lead.value) || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => openEdit(lead)}>
                              <Pencil className="w-4 h-4 mr-2" /> Modifiko
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setConvertLead(lead); setConvertDialogOpen(true); }}>
                              <ArrowRight className="w-4 h-4 mr-2" /> Konverto në Klient
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(lead)} className="text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Fshi
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editLead ? "Modifiko Lead" : "Lead i Ri"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Emri *</Label>
              <Input placeholder="Emri" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" data-testid="input-lead-name" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="email@domain.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" data-testid="input-lead-email" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefon</Label>
                <Input placeholder="+355..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Kompania</Label>
                <Input placeholder="Kompania" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Faza</Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Burimi</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Zgjedh..." /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Etiketa</Label>
                <Select value={form.label} onValueChange={(v) => setForm({ ...form, label: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Zgjedh..." /></SelectTrigger>
                  <SelectContent>
                    {LABELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vlera (€)</Label>
                <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Shënime</Label>
              <Textarea placeholder="Shënime" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSave} disabled={submitting} data-testid="button-save-lead">
              {submitting ? "Duke ruajtur..." : (editLead ? "Përditëso" : "Shto")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Konverto në Klient</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Jeni i sigurt që doni të konvertoni <strong>{convertLead?.name}</strong> në klient?
            Një klient i ri do të krijohet me të dhënat e këtij lead-i.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleConvertToClient} data-testid="button-confirm-convert">Konverto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
