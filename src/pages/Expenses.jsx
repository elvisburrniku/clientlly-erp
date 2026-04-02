import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import CategorySelector from "../components/expenses/CategorySelector";
import { Plus, Trash2, MoreHorizontal, AlertCircle, Download, FileText, SlidersHorizontal, X, Search, Calendar, Sheet, Layers, Paperclip, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet as SheetComponent, SheetContent, SheetClose } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";
import { jsPDF } from "jspdf";

const emptyForm = () => ({
  category: "",
  description: "",
  amount: 0,
  expense_date: new Date().toISOString().split("T")[0],
  payment_method: "cash",
  supplier: "",
  is_paid: true,
  pdf_url: "",
});

const generateExpenseReceiptPDF = (exp, categoryName) => {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const W = 148;
  doc.setFillColor(67, 56, 202);
  doc.rect(0, 0, W, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("FATURË SHPENZIMI", W / 2, 13, { align: "center" });
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(`Gjeneruar: ${new Date().toLocaleDateString("sq-AL")}`, W / 2, 21, { align: "center" });

  doc.setTextColor(30, 30, 30);
  let y = 42;

  const row = (label, value) => {
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 100, 100);
    doc.text(label.toUpperCase(), 14, y);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(30, 30, 30);
    doc.text(String(value || "—"), 14, y + 5);
    y += 14;
  };

  row("Kategoria", categoryName);
  row("Furnitori", exp.supplier);
  row("Përshkrimi", exp.description);
  row("Data", moment(exp.expense_date).format("DD MMMM YYYY"));
  row("Metoda e Pagesës", exp.payment_method);
  row("Statusi", exp.is_paid ? "Paguar" : "Pa paguar");

  // Total box
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(14, y, W - 28, 18, 3, 3, "F");
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  doc.text("SHUMA TOTALE", 20, y + 7);
  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(67, 56, 202);
  doc.text(`€${(exp.amount || 0).toFixed(2)}`, W - 20, y + 10, { align: "right" });

  // Footer
  doc.setFillColor(67, 56, 202);
  doc.rect(0, 195, W, 6, "F");

  return doc;
};

export default function Expenses() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [budgets, setBudgets] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [mergeDateFrom, setMergeDateFrom] = useState("");
  const [mergeDateTo, setMergeDateTo] = useState("");
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', phone: '', address: '', category: '' });
  const [mergeOpen, setMergeOpen] = useState(false);

  useEffect(() => { loadData(); loadCategories(); loadBudgets(); }, []);

  const loadBudgets = async () => {
    if (!tenantId) return;
    const buds = await base44.entities.CategoryBudget.filter({ tenant_id: tenantId }, "-created_date", 100).catch(() => []);
    setBudgets(buds);
  };

  const loadCategories = async () => {
    if (!tenantId) return;
    const cats = await base44.entities.ExpenseCategory.filter({ tenant_id: tenantId }, "-created_date", 100).catch(() => []);
    setCategories(cats);
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newCat = await base44.entities.ExpenseCategory.create({ name: newCategoryName, tenant_id: tenantId });
    setCategories([...categories, newCat]);
    setForm({ ...form, category: newCat.id });
    setShowNewCategory(false);
    setNewCategoryName("");
  };

  const loadData = async () => {
    if (!tenantId) return;
    const data = await base44.entities.Expense.filter({ tenant_id: tenantId }, "-created_date", 200);
    setExpenses(data);
    setLoading(false);
  };

  const handleUploadPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, pdf_url: file_url }));
    setUploadingPdf(false);
    toast.success("Dokumenti u ngarkua");
  };

  const handleCreate = async () => {
    if (!form.category || form.amount <= 0 || !form.expense_date) {
      toast.error("Plotësoni të gjitha fushat e detyrueshme");
      return;
    }
    setSubmitting(true);
    const created = await base44.entities.Expense.create({ ...form, tenant_id: tenantId });

    // Generate receipt PDF and save URL
    const catName = categories.find(c => c.id === form.category)?.name || form.category;
    const doc = generateExpenseReceiptPDF({ ...form }, catName);
    const pdfBlob = doc.output("blob");
    const pdfFile = new File([pdfBlob], `shpenzim_${Date.now()}.pdf`, { type: "application/pdf" });
    const { file_url: receiptUrl } = await base44.integrations.Core.UploadFile({ file: pdfFile });
    await base44.entities.Expense.update(created.id, { receipt_pdf_url: receiptUrl });

    toast.success("Shpenzimi u shtua dhe fatura u gjenerua");
    setForm(emptyForm());
    setDialogOpen(false);
    setSubmitting(false);
    loadData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Fshi këtë shpenzim?")) return;
    await base44.entities.Expense.delete(id);
    toast.success("Shpenzimi u fshi");
    loadData();
  };

  const handleCreateSupplier = async () => {
    if (!newSupplier.name?.trim()) return;
    await base44.entities.Supplier.create(newSupplier);
    setForm({ ...form, supplier: newSupplier.name });
    setNewSupplier({ name: '', email: '', phone: '', address: '', category: '' });
    setSupplierDialogOpen(false);
    toast.success("Furnitori u krijua");
  };

  const getBudgetStatus = (categoryId) => {
    const budget = budgets.find(b => b.category_id === categoryId);
    if (!budget) return { status: 'none', percentage: 0 };
    const monthExpenses = expenses.filter(e => e.category === categoryId && new Date(e.expense_date).getMonth() === new Date().getMonth()).reduce((s, e) => s + (e.amount || 0), 0);
    const percentage = (monthExpenses / budget.monthly_limit) * 100;
    if (percentage >= 100) return { status: 'exceeded', percentage: Math.round(percentage), spent: monthExpenses, limit: budget.monthly_limit };
    if (percentage >= budget.warning_percentage) return { status: 'warning', percentage: Math.round(percentage), spent: monthExpenses, limit: budget.monthly_limit };
    return { status: 'ok', percentage: Math.round(percentage), spent: monthExpenses, limit: budget.monthly_limit };
  };

  const filtered = expenses.filter(exp => {
    if (dateFrom && new Date(exp.expense_date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(exp.expense_date) > new Date(dateTo + "T23:59:59")) return false;
    if (categoryFilter && exp.category !== categoryFilter) return false;
    return true;
  });

  const hasActiveFilters = !!(dateFrom || dateTo || categoryFilter);
  const clearFilters = () => { setDateFrom(""); setDateTo(""); setCategoryFilter(""); };

  const exportExcel = () => {
    const headers = ["Kategoria", "Furnitori", "Përshkrimi", "Shuma", "Data", "Metoda", "Paguar"];
    const rows = filtered.map(exp => [
      categories.find(c => c.id === exp.category)?.name || exp.category,
      exp.supplier || "",
      exp.description || "",
      (exp.amount || 0).toFixed(2),
      exp.expense_date || "",
      exp.payment_method || "",
      exp.is_paid ? "Po" : "Jo",
    ]);
    const html = `<html><head><meta charset="UTF-8"></head><body><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `shpenzimet_${new Date().toISOString().slice(0, 10)}.xls`; a.click();
  };

  const exportPDFList = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = 297; const margin = 14;
    doc.setFillColor(67, 56, 202); doc.rect(0, 0, W, 22, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Lista e Shpenzimeve", margin, 14);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Gjeneruar: ${new Date().toLocaleDateString("sq-AL")}  |  Total: ${filtered.length}`, W - margin, 14, { align: "right" });
    const headers = ["Kategoria", "Furnitori", "Përshkrimi", "Shuma", "Data", "Metoda"];
    const colW = [40, 35, 70, 25, 25, 25];
    let x = margin; let y = 32;
    doc.setFillColor(243, 244, 246); doc.rect(margin, y - 5, W - margin * 2, 8, "F");
    doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 100, 100);
    headers.forEach((h, i) => { doc.text(h, x + 2, y); x += colW[i]; });
    y += 5; doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    filtered.forEach((exp, ri) => {
      if (y > 185) { doc.addPage(); y = 20; }
      if (ri % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(margin, y - 4, W - margin * 2, 8, "F"); }
      doc.setTextColor(30, 30, 30);
      const row = [
        (categories.find(c => c.id === exp.category)?.name || exp.category || "").slice(0, 20),
        (exp.supplier || "—").slice(0, 18),
        (exp.description || "—").slice(0, 35),
        `€${(exp.amount || 0).toFixed(2)}`,
        exp.expense_date ? moment(exp.expense_date).format("DD/MM/YY") : "—",
        exp.payment_method || "—",
      ];
      x = margin;
      row.forEach((v, i) => { doc.text(String(v), x + 2, y); x += colW[i]; });
      y += 8;
    });
    doc.setFillColor(67, 56, 202); doc.rect(0, 195, W, 10, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(7);
    doc.text(`Total: €${filtered.reduce((s, e) => s + (e.amount || 0), 0).toFixed(2)}`, W - margin, 201, { align: "right" });
    doc.save(`lista_shpenzimeve_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportMergePDF = () => {
    const toMerge = expenses.filter(exp => {
      if (!exp.receipt_pdf_url) return false;
      if (mergeDateFrom && new Date(exp.expense_date) < new Date(mergeDateFrom)) return false;
      if (mergeDateTo && new Date(exp.expense_date) > new Date(mergeDateTo + "T23:59:59")) return false;
      return true;
    });
    if (toMerge.length === 0) { toast.error("Asnjë faturë shpenzimi e gjeneruar për periudhën e zgjedhur"); return; }
    // Generate a summary PDF since we can't merge remote PDFs client-side
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210; const margin = 14;
    doc.setFillColor(67, 56, 202); doc.rect(0, 0, W, 30, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("RAPORT SHPENZIMESH", W / 2, 13, { align: "center" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Periudha: ${mergeDateFrom || "—"} deri ${mergeDateTo || "—"}`, W / 2, 21, { align: "center" });
    let y = 45;
    toMerge.forEach((exp, i) => {
      if (y > 260) { doc.addPage(); y = 20; }
      const catName = categories.find(c => c.id === exp.category)?.name || exp.category;
      doc.setFillColor(i % 2 === 0 ? 249 : 243, 250, 251); doc.rect(margin, y - 5, W - margin * 2, 14, "F");
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text(`${catName}  —  €${(exp.amount || 0).toFixed(2)}`, margin + 3, y + 1);
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
      doc.text(`${exp.supplier || ""} | ${exp.expense_date || ""} | ${exp.payment_method || ""}`, margin + 3, y + 6);
      y += 16;
    });
    const total = toMerge.reduce((s, e) => s + (e.amount || 0), 0);
    doc.setFillColor(67, 56, 202); doc.roundedRect(margin, y + 4, W - margin * 2, 14, 3, 3, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: €${total.toFixed(2)}`, W - margin - 4, y + 13, { align: "right" });
    doc.save(`raport_shpenzimesh_${new Date().toISOString().slice(0, 10)}.pdf`);
    setMergeOpen(false);
    toast.success(`Raporti u gjenerua për ${toMerge.length} shpenzime`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const totalExpenses = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);
  const byCategory = categories.map(cat => ({
    category: cat,
    total: filtered.filter(e => e.category === cat.id).reduce((sum, e) => sum + (e.amount || 0), 0),
  })).filter(x => x.total > 0);

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxhimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Shpenzimet</h1>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button variant="outline" onClick={exportExcel} className="gap-2">
            <Sheet className="w-4 h-4" /> Excel
          </Button>
          <Button variant="outline" onClick={exportPDFList} className="gap-2">
            <Download className="w-4 h-4" /> PDF Listë
          </Button>
          <Button variant="outline" onClick={() => setMergeOpen(true)} className="gap-2">
            <Layers className="w-4 h-4" /> Merge PDF
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Shto Shpenzim
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total Shpenzimesh</p>
          <p className="text-2xl font-bold mt-1 text-destructive">€{totalExpenses.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{hasActiveFilters ? "filtruara" : "të gjitha"}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Numri i Shpenzimeve</p>
          <p className="text-2xl font-bold mt-1">{filtered.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">regjistrime</p>
        </div>
      </div>

      {/* Filter Trigger */}
      <button onClick={() => setFilterOpen(true)}
        className={cn("flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all w-fit shadow-sm",
          hasActiveFilters ? "border-primary bg-primary/5 text-primary" : "border-border bg-white text-foreground hover:border-primary/50 hover:shadow-md"
        )}>
        <SlidersHorizontal className="w-4 h-4" />
        Filtrat & Kërkimi
        {hasActiveFilters && (
          <span className="bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {[dateFrom, dateTo, categoryFilter].filter(Boolean).length}
          </span>
        )}
      </button>

      {/* Filter Drawer */}
      <SheetComponent open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" className="w-full sm:w-[380px] p-0 flex flex-col">
          <div className="px-6 py-5 border-b border-border bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-[15px]">Filtrat & Kërkimi</p>
                <p className="text-xs text-muted-foreground mt-0.5">{hasActiveFilters ? "Filtrat aktive" : "Filtro shpenzimet"}</p>
              </div>
            </div>
            <SheetClose className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition">
              <X className="h-4 w-4" />
            </SheetClose>
          </div>
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Periudha</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "Sot", action: () => { const t = new Date().toISOString().split('T')[0]; setDateFrom(t); setDateTo(t); } },
                  { label: "Ky Muaj", action: () => { const now = new Date(); setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]); setDateTo(now.toISOString().split('T')[0]); } },
                  { label: "Ky Vit", action: () => { const now = new Date(); setDateFrom(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]); setDateTo(now.toISOString().split('T')[0]); } },
                ].map(p => (
                  <button key={p.label} onClick={p.action} className="py-2 text-xs font-semibold rounded-xl border border-border bg-white hover:bg-primary hover:text-white hover:border-primary transition-all">{p.label}</button>
                ))}
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Nga Data</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Deri më Data</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            </div>
            <div className="h-px bg-border mx-6" />
            <div className="px-6 pt-5 pb-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Kategoria</span>
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="text-sm rounded-xl"><SelectValue placeholder="Të gjitha kategoritë" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Të gjitha</SelectItem>
                  {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <>
                <div className="h-px bg-border mx-6" />
                <div className="px-6 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Filtrat Aktive</p>
                  <div className="flex flex-wrap gap-2">
                    {dateFrom && <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">Nga {dateFrom}<button onClick={() => setDateFrom("")}><X className="w-3 h-3" /></button></span>}
                    {dateTo && <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">Deri {dateTo}<button onClick={() => setDateTo("")}><X className="w-3 h-3" /></button></span>}
                    {categoryFilter && <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">{categories.find(c => c.id === categoryFilter)?.name}<button onClick={() => setCategoryFilter("")}><X className="w-3 h-3" /></button></span>}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="border-t border-border px-6 py-4 bg-white space-y-2 shrink-0">
            {hasActiveFilters && <Button variant="outline" onClick={clearFilters} className="w-full rounded-xl">Pastro të gjithë Filtrat</Button>}
            <SheetClose asChild><Button className="w-full rounded-xl">Apliko & Mbyll</Button></SheetClose>
          </div>
        </SheetContent>
      </SheetComponent>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
          <p className="font-semibold text-sm">{filtered.length} shpenzimesh{hasActiveFilters && " (filtruara)"}</p>
          <div className="flex items-center gap-1.5 ml-auto">
            {[
              { label: "Sot", action: () => { const t = new Date().toISOString().split('T')[0]; setDateFrom(t); setDateTo(t); } },
              { label: "Muaj", action: () => { const now = new Date(); setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]); setDateTo(now.toISOString().split('T')[0]); } },
              { label: "Vit", action: () => { const now = new Date(); setDateFrom(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]); setDateTo(now.toISOString().split('T')[0]); } },
            ].map(p => (
              <button key={p.label} onClick={p.action} className="px-3 py-1 text-xs font-semibold rounded-lg border border-border bg-white hover:bg-primary hover:text-white hover:border-primary transition-all">{p.label}</button>
            ))}
            {hasActiveFilters && (
              <button onClick={clearFilters} className="px-3 py-1 text-xs font-semibold rounded-lg border border-destructive/40 text-destructive hover:bg-destructive hover:text-white transition-all">✕ Pastro</button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Nr. Rendor</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Kategoria</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Furnitori</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Përshkrimi</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Shuma</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Data</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Metoda</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Dokumente</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                        <FileText className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">Asnjë shpenzim</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((exp, idx) => {
                  const budgetStatus = getBudgetStatus(exp.category);
                  return (
                    <tr key={exp.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 text-sm text-muted-foreground font-medium">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{categories.find(c => c.id === exp.category)?.name || exp.category}</span>
                          {budgetStatus.status === 'exceeded' && <AlertCircle className="w-4 h-4 text-destructive" />}
                          {budgetStatus.status === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{exp.supplier || "—"}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{exp.description || "—"}</td>
                      <td className="px-6 py-4"><span className="text-sm font-bold">€{(exp.amount || 0).toFixed(2)}</span></td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{moment(exp.expense_date).format("DD MMM YY")}</td>
                      <td className="px-6 py-4"><span className="text-xs font-medium bg-muted px-2.5 py-1 rounded-full capitalize">{exp.payment_method || "—"}</span></td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1.5">
                          {exp.receipt_pdf_url && (
                            <a href={exp.receipt_pdf_url} target="_blank" rel="noreferrer" title="Fatura e Gjeneruar">
                              <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold hover:bg-primary/20 transition">
                                <FileText className="w-3 h-3" /> Fatura
                              </span>
                            </a>
                          )}
                          {exp.pdf_url && (
                            <a href={exp.pdf_url} target="_blank" rel="noreferrer" title="Dokument i Bashkëngjitur">
                              <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold hover:bg-amber-200 transition">
                                <Paperclip className="w-3 h-3" /> Attachment
                              </span>
                            </a>
                          )}
                          {!exp.receipt_pdf_url && !exp.pdf_url && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {exp.receipt_pdf_url && (
                              <DropdownMenuItem onClick={() => window.open(exp.receipt_pdf_url, "_blank")}>
                                <FileText className="w-4 h-4 mr-2" /> Shiko Faturën
                              </DropdownMenuItem>
                            )}
                            {exp.pdf_url && (
                              <DropdownMenuItem onClick={() => window.open(exp.pdf_url, "_blank")}>
                                <Paperclip className="w-4 h-4 mr-2" /> Shiko Attachment
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(exp.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Fshi
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shto Shpenzim të Ri</DialogTitle>
            <DialogDescription>Plotëso të dhënat. Fatura do të gjenerohet automatikisht.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Kategoria *</Label>
              <div className="mt-1.5">
                <CategorySelector
                  value={form.category}
                  onChange={(v) => setForm({ ...form, category: v })}
                  categories={categories}
                  onCategoriesChange={setCategories}
                />
              </div>
            </div>
            <div>
              <Label>Furnitori</Label>
              <div className="flex gap-2 mt-1.5">
                <Input placeholder="Emri i furnitorit" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="text-sm" />
                <Button variant="outline" onClick={() => setSupplierDialogOpen(true)} className="gap-1 text-xs"><Plus className="w-3.5 h-3.5" /> Shto</Button>
              </div>
            </div>
            <div>
              <Label>Përshkrimi</Label>
              <Textarea placeholder="P.sh. Qira për muajin prill..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={2} />
            </div>
            <div>
              <Label>Shuma (EUR) *</Label>
              <Input type="number" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} className="mt-1.5" step="0.01" />
            </div>
            <div>
              <Label>Data e Shpenzimit *</Label>
              <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Metoda e Pagesës</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Transfer Bankar</SelectItem>
                  <SelectItem value="card">Kartë</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_paid" checked={form.is_paid} onChange={(e) => setForm({ ...form, is_paid: e.target.checked })} className="w-4 h-4 rounded" />
              <Label htmlFor="is_paid" className="!mt-0 cursor-pointer text-sm">Paguar</Label>
            </div>
            {/* PDF Attachment */}
            <div>
              <Label className="text-xs block mb-1.5">Bashkëngjit PDF/Faturë Furnitori</Label>
              {form.pdf_url ? (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <Paperclip className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-700 font-medium flex-1">Dokumenti u ngarkua</span>
                  <a href={form.pdf_url} target="_blank" rel="noreferrer"><Eye className="w-4 h-4 text-amber-600 hover:text-amber-800" /></a>
                  <button onClick={() => setForm({ ...form, pdf_url: "" })}><X className="w-4 h-4 text-amber-600 hover:text-red-600" /></button>
                </div>
              ) : (
                <label className={cn("flex items-center gap-2 border-2 border-dashed border-border rounded-xl px-4 py-3 cursor-pointer hover:border-primary/50 transition", uploadingPdf && "opacity-60 pointer-events-none")}>
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{uploadingPdf ? "Duke ngarkuar..." : "Kliko për të ngarkuar PDF"}</span>
                  <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleUploadPdf} />
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleCreate} disabled={submitting}>{submitting ? "Duke ruajtur..." : "Shto & Gjenero Faturë"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge PDF Dialog */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Merge PDF — Raport Shpenzimesh</DialogTitle>
            <DialogDescription>Zgjedh periudhën për të gjeneruar raportin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Nga Data</Label>
              <Input type="date" value={mergeDateFrom} onChange={(e) => setMergeDateFrom(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Deri më Data</Label>
              <Input type="date" value={mergeDateTo} onChange={(e) => setMergeDateTo(e.target.value)} className="mt-1.5" />
            </div>
            <div className="flex gap-2">
              {[
                { label: "Ky Muaj", action: () => { const now = new Date(); setMergeDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]); setMergeDateTo(now.toISOString().split('T')[0]); } },
                { label: "Ky Vit", action: () => { const now = new Date(); setMergeDateFrom(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]); setMergeDateTo(now.toISOString().split('T')[0]); } },
              ].map(p => <button key={p.label} onClick={p.action} className="flex-1 py-2 text-xs font-semibold rounded-xl border border-border bg-white hover:bg-primary hover:text-white transition">{p.label}</button>)}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeOpen(false)}>Anulo</Button>
            <Button onClick={exportMergePDF} className="gap-2"><Layers className="w-4 h-4" /> Gjenero Raport</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Supplier Dialog */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Krijo Furnitor të Ri</DialogTitle>
            <DialogDescription>Plotëso të dhënat e furnitorit</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Emri i Furnitorit *</Label>
              <Input placeholder="Emri" value={newSupplier.name} onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})} className="mt-1.5" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="email@furnitor.com" value={newSupplier.email} onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})} className="mt-1.5" />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input placeholder="+355 6X XXX XXXX" value={newSupplier.phone} onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})} className="mt-1.5" />
            </div>
            <div>
              <Label>Adresa</Label>
              <Input placeholder="Adresa" value={newSupplier.address} onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})} className="mt-1.5" />
            </div>
            <div>
              <Label>Kategoria</Label>
              <Input placeholder="P.sh. Elektrikë, Makineeri..." value={newSupplier.category} onChange={(e) => setNewSupplier({...newSupplier, category: e.target.value})} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleCreateSupplier} disabled={!newSupplier.name?.trim()}>Krijo Furnitor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}