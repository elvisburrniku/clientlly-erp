import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Pencil, MoreHorizontal, Users, SlidersHorizontal, X, Download, FileSpreadsheet, Search } from "lucide-react";
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

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    const data = await base44.entities.Client.list("-created_date", 100);
    setClients(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name || !form.email) return;
    setSubmitting(true);
    await base44.entities.Client.create(form);
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

      {/* Filter Sheet */}
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
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Nr. Rendor</th>
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
    </div>
  );
}