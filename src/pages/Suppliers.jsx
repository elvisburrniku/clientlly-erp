import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, MoreHorizontal, Mail, Phone, Download, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader } from "@/components/ui/sheet";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const emptyForm = () => ({
  name: "",
  email: "",
  phone: "",
  address: "",
  nipt: "",
  contact_person: "",
  payment_terms: "",
  category: "",
  notes: "",
  is_active: true,
});

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPaymentTerms, setFilterPaymentTerms] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await base44.entities.Supplier.list("-created_date", 100);
      setSuppliers(data);
    } catch (err) {
      console.error("Load error:", err);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name || !form.email) {
      toast.error("Emri dhe email janë të detyrueshëm");
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await base44.entities.Supplier.update(editingId, form);
        toast.success("Furnitori u përditësua");
      } else {
        await base44.entities.Supplier.create(form);
        toast.success("Furnitori u shtua");
      }
      setForm(emptyForm());
      setEditingId(null);
      setDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error("Gabim në ruajtje");
    }
    setSubmitting(false);
  };

  const handleEdit = (supplier) => {
    setForm(supplier);
    setEditingId(supplier.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Fshi këtë furnitor?")) return;
    try {
      await base44.entities.Supplier.delete(id);
      toast.success("Furnitori u fshi");
      loadData();
    } catch (err) {
      toast.error("Gabim në fshirje");
    }
  };

  const filtered = suppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = filterActive === "all" || (filterActive === "active" ? s.is_active : !s.is_active);
    const matchesCategory = !filterCategory || s.category === filterCategory;
    const matchesPaymentTerms = !filterPaymentTerms || s.payment_terms === filterPaymentTerms;
    return matchesSearch && matchesActive && matchesCategory && matchesPaymentTerms;
  });

  const categories = [...new Set(suppliers.map(s => s.category).filter(Boolean))];
  const paymentTerms = [...new Set(suppliers.map(s => s.payment_terms).filter(Boolean))];
  const hasFilters = filterCategory || filterPaymentTerms || filterActive !== "all";

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Lista e Furnitorëve", 14, 15);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString("sq-AL")}`, 14, 23);
    const columns = ["Nr.", "Emri", "Email", "Telefon", "Kategoria", "Status"];
    const data = filtered.map((s, i) => [i + 1, s.name, s.email, s.phone || "—", s.category || "—", s.is_active ? "Aktiv" : "Jo Aktiv"]);
    doc.autoTable({ columns, body: data, startY: 30, theme: "grid" });
    doc.save("Furnitoret.pdf");
  };

  const exportCSV = () => {
    const headers = ["Nr.", "Emri", "Email", "Telefon", "Kategoria", "Termat Pagese", "Status"];
    const rows = filtered.map((s, i) => [i + 1, s.name, s.email, s.phone || "—", s.category || "—", s.payment_terms || "—", s.is_active ? "Aktiv" : "Jo Aktiv"].map(v => `"${v}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    link.download = "Furnitoret.csv";
    link.click();
  };

  const clearFilters = () => {
    setFilterActive("all");
    setFilterCategory("");
    setFilterPaymentTerms("");
    setFilterOpen(false);
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
          <h1 className="text-3xl font-bold tracking-tight">Furnitorët</h1>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setEditingId(null); setDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Furnitor i Ri
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total Furnitorësh</p>
          <p className="text-2xl font-bold mt-1">{suppliers.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">të regjistruar</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Aktiv</p>
          <p className="text-2xl font-bold mt-1 text-success">{suppliers.filter(s => s.is_active).length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">furnitorë aktiv</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Jo Aktiv</p>
          <p className="text-2xl font-bold mt-1 text-muted-foreground">{suppliers.filter(s => !s.is_active).length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">të mos aktive</p>
        </div>
      </div>

      {/* Filters & Search */}
       <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
         <Input placeholder="Kërko sipas emrit ose email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="text-sm flex-1" />
         <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
           <SheetTrigger asChild>
             <button className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all w-fit ${hasFilters ? "border-primary bg-primary/5 text-primary" : "border-border bg-white text-foreground hover:border-primary/50"}`}>
               <SlidersHorizontal className="w-4 h-4" /> Filtrat
               {hasFilters && <span className="bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">3</span>}
             </button>
           </SheetTrigger>
           <SheetContent side="right" className="w-full sm:w-[350px]">
             <SheetHeader className="border-b pb-4">
               <h3 className="font-bold">Filtrat</h3>
             </SheetHeader>
             <div className="space-y-5 py-5">
               <div>
                 <label className="text-xs font-medium text-muted-foreground block mb-2">Status</label>
                 <Select value={filterActive} onValueChange={setFilterActive}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">Të gjithë</SelectItem>
                     <SelectItem value="active">Aktiv</SelectItem>
                     <SelectItem value="inactive">Jo Aktiv</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div>
                 <label className="text-xs font-medium text-muted-foreground block mb-2">Kategoria</label>
                 <Select value={filterCategory} onValueChange={setFilterCategory}>
                   <SelectTrigger><SelectValue placeholder="Të gjitha" /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value={null}>Të gjitha</SelectItem>
                     {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                   </SelectContent>
                 </Select>
               </div>
               <div>
                 <label className="text-xs font-medium text-muted-foreground block mb-2">Termat e Pagesës</label>
                 <Select value={filterPaymentTerms} onValueChange={setFilterPaymentTerms}>
                   <SelectTrigger><SelectValue placeholder="Të gjitha" /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value={null}>Të gjitha</SelectItem>
                     {paymentTerms.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                   </SelectContent>
                 </Select>
               </div>
               {hasFilters && <Button variant="outline" onClick={clearFilters} className="w-full">Pastro Filtrat</Button>}
             </div>
           </SheetContent>
         </Sheet>
         <Button onClick={exportCSV} variant="outline" className="gap-2"><Download className="w-4 h-4" /> CSV</Button>
         <Button onClick={exportPDF} variant="outline" className="gap-2"><Download className="w-4 h-4" /> PDF</Button>
       </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
          <p className="font-semibold text-sm">{filtered.length} furnitorë{hasFilters ? " (filtruara)" : ""}</p>
          {hasFilters && <button onClick={clearFilters} className="px-3 py-1 text-xs font-semibold rounded-lg border border-destructive/40 text-destructive hover:bg-destructive hover:text-white transition-all">✕ Pastro</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Nr. Rendor</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Emri</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Kontakt</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Kategoria</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Termat e Pagesës</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Status</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Asnjë furnitor i gjetshëm</p>
                  </td>
                </tr>
              ) : (
                filtered.map((supplier, idx) => (
                  <tr key={supplier.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 text-sm text-muted-foreground font-medium">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold">{supplier.name}</span>
                      {supplier.contact_person && <p className="text-xs text-muted-foreground">{supplier.contact_person}</p>}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <a href={`mailto:${supplier.email}`} className="text-primary hover:underline text-xs">{supplier.email}</a>
                          {supplier.phone && <p className="text-xs text-muted-foreground mt-0.5">{supplier.phone}</p>}
                        </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{supplier.category || "—"}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{supplier.payment_terms || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${supplier.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {supplier.is_active ? "Aktiv" : "Jo Aktiv"}
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
                          <DropdownMenuItem onClick={() => handleEdit(supplier)}>Redakto</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(supplier.id)} className="text-destructive focus:text-destructive">
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Redakto Furnitor" : "Furnitor i Ri"}</DialogTitle>
            <DialogDescription>Plotëso të dhënat e furnitorit</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Emri *</Label>
              <Input placeholder="Emri i furnitorit" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Email *</Label>
              <Input type="email" placeholder="email@supplier.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Telefon</Label>
              <Input placeholder="+355 6X XXX XXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Adresa</Label>
              <Input placeholder="Adresa e furnitorit" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1.5 text-sm" />
            </div>
            <div>
              <Label className="text-xs">NIPT</Label>
              <Input placeholder="NIPT i furnitorit" value={form.nipt} onChange={(e) => setForm({ ...form, nipt: e.target.value })} className="mt-1.5 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Personi i Kontaktit</Label>
              <Input placeholder="Emri" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="mt-1.5 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Kategoria</Label>
              <Input placeholder="P.sh. Tekstile, Elektronikë..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1.5 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Termat e Pagesës</Label>
              <Input placeholder="P.sh. 30 ditë, 15 ditë..." value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} className="mt-1.5 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Shënime</Label>
              <Textarea placeholder="Shënime rreth furnitorit" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" />
              <Label htmlFor="is_active" className="!mt-0 cursor-pointer text-sm">Aktiv</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleCreate} disabled={submitting}>{submitting ? "Duke ruajtur..." : (editingId ? "Përditëso" : "Shto")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}