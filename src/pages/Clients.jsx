import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Trash2, Pencil, MoreHorizontal, Users, SlidersHorizontal, X, Download, FileSpreadsheet, Search, Merge, Link2, Copy } from "lucide-react";
import moment from "moment";
import { Sheet, SheetContent, SheetClose, SheetTrigger } from "@/components/ui/sheet";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const emptyForm = () => ({
  name: "",
  email: "",
  phone: "",
  nipt: "",
  address: "",
  classification: "business",
  notes: "",
});

export default function Clients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterClassification, setFilterClassification] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [filterName, setFilterName] = useState("");
  const [showNameDrop, setShowNameDrop] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [selectedClientForCard, setSelectedClientForCard] = useState(null);
  const [cardStartDate, setCardStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [cardEndDate, setCardEndDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]);
  const [cardYear, setCardYear] = useState(new Date().getFullYear());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeSelected, setMergeSelected] = useState([]);
  const [mergePrimary, setMergePrimary] = useState(null);
  const [portalLinkDialogOpen, setPortalLinkDialogOpen] = useState(false);
  const [portalLink, setPortalLink] = useState("");

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    if (!tenantId) return;
    setLoading(true);
    const data = await base44.entities.Client.filter({ tenant_id: tenantId }, "-created_date", 100);
    setClients(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name || !form.email) return;
    setSubmitting(true);
    await base44.entities.Client.create({ ...form, tenant_id: tenantId });
    setDialogOpen(false);
    setForm(emptyForm());
    setSubmitting(false);
    toast.success("Klienti u krijua");
    loadClients();
  };

  const handleUpdate = async () => {
    if (!editClient) return;
    setSubmitting(true);
    await base44.entities.Client.update(editClient.id, form);
    setEditClient(null);
    setForm(emptyForm());
    setSubmitting(false);
    toast.success("Klienti u ndryshua");
    loadClients();
  };

  const handleDelete = async (client) => {
    if (!window.confirm(`Fshi klientin ${client.name}?`)) return;
    await base44.entities.Client.delete(client.id);
    toast.success("Klienti u fshi");
    loadClients();
  };

  const openEdit = (client) => {
    setForm({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      nipt: client.nipt || "",
      address: client.address || "",
      classification: client.classification || "new",
      notes: client.notes || "",
    });
    setEditClient(client);
  };

  const handleMerge = async () => {
    if (!mergePrimary || mergeSelected.length < 2) return;
    const mergeIds = mergeSelected.filter(id => id !== mergePrimary);
    try {
      await base44.merge.mergeClients({ primary_id: mergePrimary, merge_ids: mergeIds });
      toast.success("Klientët u bashkuan me sukses");
      setMergeDialogOpen(false);
      setMergeSelected([]);
      setMergePrimary(null);
      loadClients();
    } catch (err) {
      toast.error("Gabim gjatë bashkimit");
    }
  };

  const toggleMergeSelect = (id) => {
    setMergeSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const generatePortalLink = async (client) => {
    try {
      const result = await base44.portal.generateToken({ entity_type: "client", entity_id: client.id });
      const link = `${window.location.origin}/portal/client/${result.token}`;
      setPortalLink(link);
      setPortalLinkDialogOpen(true);
    } catch (err) {
      toast.error("Gabim gjatë gjenerimit të linkut");
    }
  };

  const copyPortalLink = () => {
    navigator.clipboard.writeText(portalLink);
    toast.success("Linku u kopjua");
  };

  const classificationBadge = (classification) => {
    const styles = {
      institutional: "bg-blue-100 text-blue-700",
      business: "bg-amber-100 text-amber-700",
      residential: "bg-emerald-100 text-emerald-700",
    };
    const labels = { institutional: "Institucional", business: "Biznesor", residential: "Rezidencial" };
    return (
      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", styles[classification])}>
        {labels[classification] || classification}
      </span>
    );
  };

  const filtered = clients.filter(c => {
    if (filterClassification && c.classification !== filterClassification) return false;
    if (filterName && c.name !== filterName) return false;
    return true;
  });

  const hasFilters = filterClassification || filterName;
  const activeFilterCount = [filterClassification, filterName].filter(Boolean).length;
  const clearFilters = () => { setFilterClassification(""); setFilterName(""); setNameQuery(""); };

  const nameSuggestions = nameQuery
    ? clients.filter(c => c.name.toLowerCase().includes(nameQuery.toLowerCase()))
    : clients.slice(0, 8);

  const exportExcel = () => {
    const headers = ["Emri", "Email", "Telefon", "NIPT", "Adresë", "Klasifikimi"];
    const classLabels = { regular: "I Rregullt", vip: "VIP", new: "I Ri" };
    const rows = filtered.map(c => [c.name, c.email, c.phone || "", c.nipt || "", c.address || "", classLabels[c.classification] || c.classification]);
    const html = `<html><head><meta charset="UTF-8"></head><body><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `klientet_${new Date().toISOString().slice(0,10)}.xls`; a.click();
  };

  const generateClientCardPDF = (client) => {
    const doc = new jsPDF({ unit: "mm", format: "a6" });
    const W = 105; const H = 148;
    doc.setFillColor(67, 56, 202);
    doc.rect(0, 0, W, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("KARTELA E KLIENTIT", W / 2, 12, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleDateString("sq-AL"), W / 2, 20, { align: "center" });
    doc.setTextColor(30, 30, 30);
    let y = 50;
    const addField = (label, value) => {
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(label + ":", 8, y);
      doc.setFont("helvetica", "normal");
      doc.text((value || "—").toString().slice(0, 30), 8, y + 4);
      y += 10;
    };
    const startDate = client.created_date ? moment(client.created_date).format("DD/MM/YYYY") : "—";
    const endDate = client.created_date ? moment(client.created_date).add(1, "year").format("DD/MM/YYYY") : "—";
    const year = new Date().getFullYear();
    addField("EMRI", client.name);
    addField("EMAIL", client.email);
    addField("TELEFON", client.phone);
    addField("NIPT", client.nipt);
    addField("ADRESA", client.address);
    addField("KLASIFIKIMI", { institutional: "Institucional", business: "Biznesor", residential: "Rezidencial" }[client.classification]);
    addField("DATA FILLIMI", startDate);
    addField("DATA MBARIMI", endDate);
    addField("VITI", year);
    doc.save(`kartela_${client.name.replace(/\s+/g, "_")}.pdf`);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = 297; const H = 210; const margin = 14; const cw = W - margin * 2;
    doc.setFillColor(67,56,202); doc.rect(0,0,W,36,"F");
    doc.setTextColor(255,255,255); doc.setFontSize(18); doc.setFont("helvetica","bold");
    doc.text("LISTA E KLIENTEVE", margin, 16);
    doc.setFontSize(8); doc.setFont("helvetica","normal");
    doc.text("Gjeneruar: " + new Date().toLocaleDateString("sq-AL"), margin, 26);
    let y = 48;
    doc.setFillColor(67,56,202); doc.rect(margin,y-4,cw,8,"F");
    doc.setTextColor(255,255,255); doc.setFontSize(8); doc.setFont("helvetica","bold");
    doc.text("Emri", margin+2, y+1); doc.text("Email", margin+60, y+1);
    doc.text("Telefon", margin+130, y+1); doc.text("NIPT", margin+175, y+1);
    doc.text("Klasifikimi", margin+220, y+1);
    y += 10;
    const classLabels = { regular: "I Rregullt", vip: "VIP", new: "I Ri" };
    doc.setFont("helvetica","normal"); doc.setFontSize(8);
    filtered.forEach((c, i) => {
      if (y > H - 20) { doc.addPage(); y = 20; }
      if (i % 2 === 0) { doc.setFillColor(245,247,255); doc.rect(margin,y-4,cw,7,"F"); }
      doc.setTextColor(40,40,40);
      doc.text((c.name||"").slice(0,28), margin+2, y);
      doc.text((c.email||"").slice(0,30), margin+60, y);
      doc.text((c.phone||"—").slice(0,18), margin+130, y);
      doc.text((c.nipt||"—").slice(0,16), margin+175, y);
      doc.text(classLabels[c.classification]||"—", margin+220, y);
      y += 7;
    });
    doc.setFillColor(67,56,202); doc.rect(0,H-12,W,12,"F");
    doc.setTextColor(255,255,255); doc.setFontSize(7);
    doc.text("Ky dokument u gjenerua automatikisht.", W/2, H-4, { align: "center" });
    doc.save(`klientet_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const stats = {
    total: clients.length,
    institutional: clients.filter(c => c.classification === "institutional").length,
    business: clients.filter(c => c.classification === "business").length,
    residential: clients.filter(c => c.classification === "residential").length,
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxhimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Klientët</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportExcel} className="gap-2"><FileSpreadsheet className="w-4 h-4" /> Excel</Button>
          <Button variant="outline" onClick={exportPDF} className="gap-2"><Download className="w-4 h-4" /> PDF</Button>
          <Button variant="outline" onClick={() => { setMergeDialogOpen(true); setMergeSelected([]); setMergePrimary(null); }} className="gap-2" data-testid="button-merge-clients">
            <Merge className="w-4 h-4" /> Bashko
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 self-start sm:self-auto">
            <Plus className="w-4 h-4" /> Shto Klient
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Institucional</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{stats.institutional}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Biznesor</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{stats.business}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Rezidencial</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.residential}</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <button className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all w-fit shadow-sm",
              hasFilters ? "border-primary bg-primary/5 text-primary" : "border-border bg-white text-foreground hover:border-primary/50 hover:shadow-md"
            )}>
              <SlidersHorizontal className="w-4 h-4" />
              Filtrat & Kërkimi
              {hasFilters && <span className="bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{activeFilterCount}</span>}
            </button>
          </SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col">
          <div className="px-6 py-5 border-b border-border bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><SlidersHorizontal className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="font-bold text-[15px]">Filtrat & Kërkimi</p>
                <p className="text-xs text-muted-foreground mt-0.5">{hasFilters ? `${activeFilterCount} filtr aktiv` : "Filtro klientët"}</p>
              </div>
            </div>
            <SheetClose className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition"><X className="h-4 w-4" /></SheetClose>
          </div>
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="px-6 pt-6 pb-5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-3">Kërkim</span>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Emri i Klientit</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input type="text" placeholder="Kërko klientin..." value={filterName || nameQuery}
                  onChange={e => { setNameQuery(e.target.value); setFilterName(""); setShowNameDrop(true); }}
                  onFocus={() => setShowNameDrop(true)}
                  onBlur={() => setTimeout(() => setShowNameDrop(false), 150)}
                  className="w-full pl-10 pr-9 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                {(filterName || nameQuery) && <button onMouseDown={e => { e.preventDefault(); setFilterName(""); setNameQuery(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
                {showNameDrop && nameSuggestions.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {nameSuggestions.map(c => {
                      const badgeStyle = { institutional: "bg-blue-100 text-blue-700", business: "bg-amber-100 text-amber-700", residential: "bg-emerald-100 text-emerald-700" };
                      const badgeLabel = { institutional: "I", business: "B", residential: "R" };
                      return (
                        <button key={c.id} onMouseDown={() => { setFilterName(c.name); setNameQuery(c.name); setShowNameDrop(false); }}
                          className={cn("w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 transition flex items-center gap-3", filterName === c.name && "bg-primary/10 font-semibold text-primary")}>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", badgeStyle[c.classification] || "bg-slate-100 text-slate-600")}>
                            {badgeLabel[c.classification] || "K"}
                          </span>
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="h-px bg-border mx-6" />
            <div className="px-6 pt-5 pb-5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-3">Klasifikimi</span>
              <div className="flex bg-muted rounded-xl p-1">
                {[["","Të gjitha"],["institutional","Institucional"],["business","Biznesor"],["residential","Rezidencial"]].map(([v,l]) => (
                  <button key={v} onClick={() => setFilterClassification(v)}
                    className={cn("flex-1 px-2 py-1.5 text-xs font-semibold rounded-lg transition-all",
                      filterClassification === v ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-border px-6 py-4 bg-white space-y-2 shrink-0">
            {hasFilters && <button onClick={clearFilters} className="w-full py-2 text-sm font-semibold rounded-xl border border-border hover:bg-muted transition">Pastro të gjithë Filtrat</button>}
            <SheetClose asChild><Button className="w-full rounded-xl">Apliko & Mbyll</Button></SheetClose>
          </div>
          </SheetContent>
          </Sheet>
          <button onClick={() => setCardDialogOpen(true)} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 border-border bg-white text-foreground text-sm font-semibold transition-all w-fit shadow-sm hover:border-primary/50 hover:shadow-md">
          <FileSpreadsheet className="w-4 h-4" /> Kartela e Bleresit
          </button>
          </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
          <p className="font-semibold text-sm">{filtered.length} klientë{hasFilters ? " (filtruar)" : ""}</p>
          {hasFilters && <button onClick={clearFilters} className="px-3 py-1 text-xs font-semibold rounded-lg border border-destructive/40 text-destructive hover:bg-destructive hover:text-white transition-all">✕ Pastro</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">NR.</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Emri</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Email</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Telefon</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">NIPT</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Adresë</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Klasifikimi</th>
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
                      <p className="text-sm text-muted-foreground font-medium">Nuk ka klientë</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((client, idx) => (
                  <tr key={client.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => navigate(`/client-detail/${client.id}`)}>
                    <td className="px-6 py-4 text-sm text-muted-foreground font-medium">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-primary hover:underline">{client.name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{client.email}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{client.phone || "—"}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{client.nipt || "—"}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground text-xs">{client.address || "—"}</td>
                    <td className="px-6 py-4">{classificationBadge(client.classification)}</td>
                    <td className="px-6 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                           <DropdownMenuItem onClick={() => openEdit(client)}>
                             <Pencil className="w-4 h-4 mr-2" /> Modifiko
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => generatePortalLink(client)}>
                             <Link2 className="w-4 h-4 mr-2" /> Gjenero Link Portal
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleDelete(client)} className="text-destructive focus:text-destructive">
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

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shto Klient të Ri</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Emri *</Label>
              <Input placeholder="Emri i klientit" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" placeholder="email@domain.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefon</Label>
                <Input placeholder="+355 6X XXX XXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>NIPT</Label>
                <Input placeholder="L XXXX XXXXX K XX" value={form.nipt} onChange={(e) => setForm({ ...form, nipt: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Adresë</Label>
              <Input placeholder="Adresa e klientit" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Klasifikimi</Label>
              <Select value={form.classification} onValueChange={(v) => setForm({ ...form, classification: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="institutional">Institucional</SelectItem>
                  <SelectItem value="business">Biznesor</SelectItem>
                  <SelectItem value="residential">Rezidencial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shënime</Label>
              <Textarea placeholder="Shënime opsionale..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleCreate} disabled={submitting || !form.name || !form.email}>
              {submitting ? "Duke krijuar..." : "Krijo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kartela Dialog */}
      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kartela e Bleresit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Zgjedh Klientin *</Label>
              <Select value={selectedClientForCard?.id || ""} onValueChange={(id) => setSelectedClientForCard(clients.find(c => c.id === id) || null)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Zgjidh një klient" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data e Fillimit *</Label>
              <Input type="date" value={cardStartDate} onChange={(e) => setCardStartDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Data e Mbarimit *</Label>
              <Input type="date" value={cardEndDate} onChange={(e) => setCardEndDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Viti *</Label>
              <Select value={cardYear.toString()} onValueChange={(v) => setCardYear(parseInt(v))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCardDialogOpen(false)}>Anulo</Button>
            <Button onClick={() => {
              if (selectedClientForCard && cardStartDate && cardEndDate) {
                const doc = new jsPDF({ unit: "mm", format: "a6" });
                const W = 105; const H = 148;
                doc.setFillColor(67, 56, 202);
                doc.rect(0, 0, W, 40, "F");
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.text("KARTELA E BLERESIT", W / 2, 12, { align: "center" });
                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                doc.text(new Date().toLocaleDateString("sq-AL"), W / 2, 20, { align: "center" });
                doc.setTextColor(30, 30, 30);
                let y = 50;
                const addField = (label, value) => {
                  doc.setFontSize(7);
                  doc.setFont("helvetica", "bold");
                  doc.text(label + ":", 8, y);
                  doc.setFont("helvetica", "normal");
                  doc.text((value || "—").toString().slice(0, 30), 8, y + 4);
                  y += 10;
                };
                addField("EMRI", selectedClientForCard.name);
                addField("EMAIL", selectedClientForCard.email);
                addField("TELEFON", selectedClientForCard.phone);
                addField("NIPT", selectedClientForCard.nipt);
                addField("ADRESA", selectedClientForCard.address);
                addField("DATA FILLIMI", moment(cardStartDate).format("DD/MM/YYYY"));
                addField("DATA MBARIMI", moment(cardEndDate).format("DD/MM/YYYY"));
                addField("VITI", cardYear);
                doc.save(`kartela_${selectedClientForCard.name.replace(/\s+/g, "_")}.pdf`);
                setCardDialogOpen(false);
                setSelectedClientForCard(null);
                toast.success("Kartela u shkarkua");
              }
            }} disabled={!selectedClientForCard || !cardStartDate || !cardEndDate}>
              Shkarko
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editClient} onOpenChange={(o) => { if (!o) { setEditClient(null); setForm(emptyForm()); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifiko Klientin — {editClient?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Emri *</Label>
              <Input placeholder="Emri i klientit" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" placeholder="email@domain.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefon</Label>
                <Input placeholder="+355 6X XXX XXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>NIPT</Label>
                <Input placeholder="L XXXX XXXXX K XX" value={form.nipt} onChange={(e) => setForm({ ...form, nipt: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Adresë</Label>
              <Input placeholder="Adresa e klientit" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Klasifikimi</Label>
              <Select value={form.classification} onValueChange={(v) => setForm({ ...form, classification: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="institutional">Institucional</SelectItem>
                  <SelectItem value="business">Biznesor</SelectItem>
                  <SelectItem value="residential">Rezidencial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shënime</Label>
              <Textarea placeholder="Shënime opsionale..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditClient(null); setForm(emptyForm()); }}>Anulo</Button>
            <Button onClick={handleUpdate} disabled={submitting || !form.name || !form.email}>
              {submitting ? "Duke ruajtur..." : "Ruaj"}
            </Button>
          </DialogFooter>
          </DialogContent>
          </Dialog>

      {/* Merge Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bashko Klientët Duplikatë</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Zgjidh klientët që dëshiron të bashkosh, pastaj zgjedh klientin kryesor (që do të mbetet).
          </p>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {clients.map(c => (
              <div key={c.id} className={cn(
                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                mergeSelected.includes(c.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              )} onClick={() => toggleMergeSelect(c.id)}>
                <input type="checkbox" checked={mergeSelected.includes(c.id)} readOnly className="w-4 h-4 rounded" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </div>
                {mergeSelected.includes(c.id) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setMergePrimary(c.id); }}
                    className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded-lg transition",
                      mergePrimary === c.id ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-primary/10"
                    )}
                  >
                    {mergePrimary === c.id ? "Kryesor ✓" : "Bëje Kryesor"}
                  </button>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleMerge} disabled={mergeSelected.length < 2 || !mergePrimary} data-testid="button-confirm-merge">
              Bashko ({mergeSelected.length} klientë)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Portal Link Dialog */}
      <Dialog open={portalLinkDialogOpen} onOpenChange={setPortalLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link i Portalit të Klientit</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Ndani këtë link me klientin. Linku skadon pas 90 ditëve.
          </p>
          <div className="flex gap-2">
            <Input value={portalLink} readOnly className="text-xs" />
            <Button onClick={copyPortalLink} variant="outline" className="gap-2 shrink-0" data-testid="button-copy-portal-link">
              <Copy className="w-4 h-4" /> Kopjo
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPortalLinkDialogOpen(false)}>Mbyll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}