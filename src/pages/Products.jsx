import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Pencil, MoreHorizontal, SlidersHorizontal, X, Download, FileSpreadsheet, Search } from "lucide-react";
import { Sheet, SheetContent, SheetClose, SheetTrigger } from "@/components/ui/sheet";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const emptyForm = () => ({
  name: "",
  type: "service",
  description: "",
  price_ex_vat: 0,
  vat_rate: 20,
  unit: "cope",
  is_active: true,
});

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterName, setFilterName] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [showNameDrop, setShowNameDrop] = useState(false);
  const [viewType, setViewType] = useState("all");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await base44.entities.Product.list("-created_date", 100);
      setProducts(data);
    } catch (err) {
      console.error("Load error:", err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name || form.price_ex_vat < 0) {
      toast.error("Plotësoni të gjitha fushat e detyrueshme");
      return;
    }
    setSubmitting(true);
    try {
      if (editId) {
        await base44.entities.Product.update(editId, form);
        toast.success("Produkti u përditësua");
      } else {
        await base44.entities.Product.create(form);
        toast.success("Produkti u shtua");
      }
      setForm(emptyForm());
      setEditId(null);
      setDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error("Gabim në ruajtje");
    }
    setSubmitting(false);
  };

  const handleEdit = (prod) => {
    setForm(prod);
    setEditId(prod.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Fshi këtë produkt?")) return;
    try {
      await base44.entities.Product.delete(id);
      toast.success("Produkti u fshi");
      loadData();
    } catch (err) {
      toast.error("Gabim në fshirje");
    }
  };

  const filtered = products.filter(p => {
    if (filterType && p.type !== filterType) return false;
    if (filterStatus === "active" && !p.is_active) return false;
    if (filterStatus === "inactive" && p.is_active) return false;
    if (filterName && p.name !== filterName) return false;
    if (viewType === "products" && p.type !== "product") return false;
    if (viewType === "services" && p.type !== "service") return false;
    return true;
  });

  const hasFilters = filterType || filterStatus || filterName;
  const activeFilterCount = [filterType, filterStatus, filterName].filter(Boolean).length;
  const clearFilters = () => { setFilterType(""); setFilterStatus(""); setFilterName(""); setNameQuery(""); };

  const nameSuggestions = nameQuery
    ? products.filter(p => p.name?.toLowerCase().includes(nameQuery.toLowerCase()))
    : products.slice(0, 8);

  const exportExcel = () => {
    const headers = ["Emri", "Lloji", "Çmim pa TVSH", "TVSH %", "Çmim me TVSH", "Njësia", "Statusi"];
    const rows = filtered.map(p => [
      p.name, p.type === "product" ? "Produkt" : "Shërbim",
      (p.price_ex_vat || 0).toFixed(2),
      `${p.vat_rate || 20}%`,
      ((p.price_ex_vat || 0) * (1 + (p.vat_rate || 20) / 100)).toFixed(2),
      p.unit || "cope",
      p.is_active ? "Aktiv" : "Joaktiv",
    ]);
    const html = `<html><head><meta charset="UTF-8"></head><body><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `produktet_${new Date().toISOString().slice(0,10)}.xls`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210; const H = 297; const margin = 14; const cw = W - margin * 2;
    doc.setFillColor(67, 56, 202); doc.rect(0, 0, W, 38, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("LISTA E PRODUKTEVE", margin, 18);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text("Gjeneruar: " + new Date().toLocaleDateString("sq-AL"), margin, 28);
    let y = 50;
    doc.setFillColor(67, 56, 202); doc.rect(margin, y - 4, cw, 8, "F");
    doc.setTextColor(255,255,255); doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("Emri", margin + 2, y + 1);
    doc.text("Lloji", margin + 70, y + 1);
    doc.text("Cmim", margin + 100, y + 1);
    doc.text("TVSH", margin + 125, y + 1);
    doc.text("Njesia", margin + 145, y + 1);
    doc.text("Statusi", margin + 165, y + 1);
    y += 10;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    filtered.forEach((p, ri) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (ri % 2 === 0) { doc.setFillColor(245,247,255); doc.rect(margin, y - 4, cw, 7, "F"); }
      doc.setTextColor(40,40,40);
      doc.text((p.name || "").slice(0, 30), margin + 2, y);
      doc.text(p.type === "product" ? "Produkt" : "Sherbim", margin + 70, y);
      doc.text("\u20ac" + (p.price_ex_vat || 0).toFixed(2), margin + 100, y);
      doc.text((p.vat_rate || 20) + "%", margin + 125, y);
      doc.text(p.unit || "cope", margin + 145, y);
      doc.setTextColor(p.is_active ? 22 : 150, p.is_active ? 163 : 150, p.is_active ? 74 : 150);
      doc.text(p.is_active ? "Aktiv" : "Joaktiv", margin + 165, y);
      y += 7;
    });
    doc.setFillColor(67, 56, 202); doc.rect(0, H - 14, W, 14, "F");
    doc.setTextColor(255,255,255); doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text("Ky dokument u gjenerua automatikisht.", W/2, H-6, { align: "center" });
    doc.save(`produktet_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxhimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Produktet & Shërbimet</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportExcel} className="gap-2"><FileSpreadsheet className="w-4 h-4" /> Excel</Button>
          <Button variant="outline" onClick={exportPDF} className="gap-2"><Download className="w-4 h-4" /> PDF</Button>
          <Button onClick={() => { setForm(emptyForm()); setEditId(null); setDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Shto Produkt
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej Produktesh</p>
          <p className="text-2xl font-bold mt-1">{products.filter(p => p.is_active).length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">aktivë</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Shërbime vs Produkte</p>
          <p className="text-2xl font-bold mt-1">
            {products.filter(p => p.type === "service" && p.is_active).length} / {products.filter(p => p.type === "product" && p.is_active).length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">shërbime / produkte</p>
        </div>
      </div>

      {/* Filter & View Type Toggle */}
      <div className="flex items-center justify-between gap-4">
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <button className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all shadow-sm whitespace-nowrap",
              hasFilters ? "border-primary bg-primary/5 text-primary" : "border-border bg-white text-foreground hover:border-primary/50 hover:shadow-md"
            )}>
              <SlidersHorizontal className="w-4 h-4" />
              Filtrat & Kërkimi
              {hasFilters && <span className="bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{activeFilterCount}</span>}
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full sm:w-[400px] p-0 flex flex-col">
            <div className="px-6 py-5 border-b border-border bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-[15px]">Filtrat & Kërkimi</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{hasFilters ? `${activeFilterCount} filtr aktiv` : "Filtro produktet"}</p>
                </div>
              </div>
              <SheetClose className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition">
                <X className="h-4 w-4" />
              </SheetClose>
            </div>
            <div className="flex-1 overflow-y-auto bg-background">
              <div className="px-6 pt-6 pb-5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-3">Kërkim</span>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Emri i Produktit / Shërbimit</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="text" placeholder="Kërko produktin..." value={filterName || nameQuery}
                    onChange={e => { setNameQuery(e.target.value); setFilterName(""); setShowNameDrop(true); }}
                    onFocus={() => setShowNameDrop(true)}
                    onBlur={() => setTimeout(() => setShowNameDrop(false), 150)}
                    className="w-full pl-10 pr-9 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  {(filterName || nameQuery) && <button onMouseDown={e => { e.preventDefault(); setFilterName(""); setNameQuery(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
                  {showNameDrop && nameSuggestions.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                      {nameSuggestions.map(p => (
                        <button key={p.id} onMouseDown={() => { setFilterName(p.name); setNameQuery(p.name); setShowNameDrop(false); }}
                          className={cn("w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 transition flex items-center gap-3", filterName === p.name && "bg-primary/10 font-semibold text-primary")}>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", p.type === "product" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700")}>
                            {p.type === "product" ? "P" : "S"}
                          </span>
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="h-px bg-border mx-6" />
              <div className="px-6 pt-5 pb-5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-3">Lloji</span>
                <div className="flex bg-muted rounded-xl p-1">
                  {[["","Të gjitha"],["product","Produkte"],["service","Shëbime"]].map(([v,l]) => (
                    <button key={v} onClick={() => setFilterType(v)}
                      className={cn("flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                        filterType === v ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="h-px bg-border mx-6" />
              <div className="px-6 pt-5 pb-5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-3">Statusi</span>
                <div className="flex bg-muted rounded-xl p-1">
                  {[["","Të gjitha"],["active","Aktiv"],["inactive","Joaktiv"]].map(([v,l]) => (
                    <button key={v} onClick={() => setFilterStatus(v)}
                      className={cn("flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                        filterStatus === v ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-border px-6 py-4 bg-white space-y-2 shrink-0">
              {hasFilters && <button onClick={clearFilters} className="w-full py-2 text-sm font-semibold rounded-xl border border-border hover:bg-muted transition">Pastro të gjithë Filtrat</button>}
              <SheetClose asChild>
                <Button className="w-full rounded-xl">Apliko & Mbyll</Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2 bg-white rounded-2xl border border-border/60 shadow-sm p-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-2">Shfaqi:</span>
          <div className="flex bg-muted rounded-xl p-1">
            {[
              { value: "all", label: "Të Gjitha" },
              { value: "products", label: "Produktet" },
              { value: "services", label: "Shërbimet" }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setViewType(opt.value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap",
                  viewType === opt.value ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
          <p className="font-semibold text-sm">{filtered.length} produkte{hasFilters ? " (filtruara)" : ""}</p>
          {hasFilters && <button onClick={clearFilters} className="px-3 py-1 text-xs font-semibold rounded-lg border border-destructive/40 text-destructive hover:bg-destructive hover:text-white transition-all">✕ Pastro</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Emri</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Lloji</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Çmim pa TVSH</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">TVSH</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Njësia</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Statusi</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Nuk ka produkte</p>
                  </td>
                </tr>
              ) : (
                filtered.map(prod => (
                  <tr key={prod.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4"><span className="text-sm font-semibold">{prod.name}</span></td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium bg-muted px-2.5 py-1 rounded-full capitalize">
                        {prod.type === "product" ? "Produkt" : "Shërbim"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">€{(prod.price_ex_vat || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{prod.vat_rate || 20}%</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{prod.unit || "cope"}</td>
                    <td className="px-6 py-4">
                      <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", prod.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                        {prod.is_active ? "Aktiv" : "Joaktiv"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(prod)}>
                            <Pencil className="w-4 h-4 mr-2" /> Modifiko
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(prod.id)} className="text-destructive focus:text-destructive">
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setForm(emptyForm()); setEditId(null); } setDialogOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifiko Produktin" : "Shto Produkt të Ri"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Emri *</Label>
              <Input placeholder="P.sh. Dizajn Web" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Lloji *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Produkt</SelectItem>
                  <SelectItem value="service">Shërbim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Përshkrimi</Label>
              <Textarea placeholder="Përshkrimi detajuar..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Çmim pa TVSH (EUR) *</Label>
                <Input type="number" placeholder="0.00" value={form.price_ex_vat} onChange={(e) => setForm({ ...form, price_ex_vat: parseFloat(e.target.value) || 0 })} className="mt-1.5" step="0.01" />
              </div>
              <div>
                <Label>TVSH %</Label>
                <Input type="number" placeholder="20" value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: parseFloat(e.target.value) || 20 })} className="mt-1.5" step="1" />
              </div>
            </div>
            <div>
              <Label>Njësia Matëse</Label>
              <Input placeholder="cope, kg, ore, m2..." value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setForm(emptyForm()); setEditId(null); setDialogOpen(false); }}>Anulo</Button>
            <Button onClick={handleSave} disabled={submitting}>{submitting ? "Duke ruajtur..." : editId ? "Përditëso" : "Shto"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}