import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, FileText, Send, ToggleLeft, ToggleRight, Search, Download, Sheet, Layers, MoreHorizontal, Eye, Bell, Copy, Pencil, Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";
import { jsPDF } from "jspdf";
import InvoiceLineItems from "../components/invoices/InvoiceLineItems";
import SendInvoiceDialog from "../components/invoices/SendInvoiceDialog";
import InvoicePDFButton from "../components/invoices/InvoicePDFButton";
import MergePDFDialog from "../components/invoices/MergePDFDialog";

const emptyForm = () => ({
  invoice_type: "standard",
  client_name: "",
  client_email: "",
  client_phone: "",
  payment_method: "cash",
  due_date: "",
  description: "",
  is_recurring: false,
  recurring_interval: "monthly",
  items: [{ type: "service", name: "", quantity: 1, unit: "cope", price_ex_vat: 0, vat_rate: 20, price_inc_vat: 0, line_total: 0 }],
});

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendDialog, setSendDialog] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [mergePDFOpen, setMergePDFOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [reminderDialog, setReminderDialog] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterSearchType, setFilterSearchType] = useState("client");
  const [filterClient, setFilterClient] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [user, data] = await Promise.all([
      base44.auth.me(),
      base44.entities.Invoice.list("-created_date", 100),
    ]);
    setCurrentUser(user);
    setInvoices(data);
    setLoading(false);
  };

  const calcTotals = (items) => {
    const subtotal = items.reduce((s, it) => s + (it.price_ex_vat || 0) * (it.quantity || 0), 0);
    const vat_amount = items.reduce((s, it) => {
      const exVat = (it.price_ex_vat || 0) * (it.quantity || 0);
      return s + exVat * ((it.vat_rate || 0) / 100);
    }, 0);
    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      vat_amount: parseFloat(vat_amount.toFixed(2)),
      amount: parseFloat((subtotal + vat_amount).toFixed(2)),
    };
  };

  const handleCreate = async () => {
    if (!form.client_name || form.items.length === 0) return;
    setSubmitting(true);

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const { subtotal, vat_amount, amount } = calcTotals(form.items);

    const newInvoice = {
      invoice_type: form.invoice_type || "standard",
      invoice_number: invoiceNumber,
      client_name: form.client_name,
      client_email: form.client_email,
      client_phone: form.client_phone,
      items: form.items,
      subtotal,
      vat_amount,
      amount,
      payment_method: form.payment_method,
      due_date: form.due_date || undefined,
      description: form.description,
      is_recurring: form.is_recurring || false,
      recurring_interval: form.is_recurring ? form.recurring_interval : undefined,
      status: "draft",
      is_open: true,
      issued_by: currentUser.email,
    };

    await base44.entities.Invoice.create(newInvoice);

    if (form.payment_method === "cash") {
      const users = await base44.entities.User.filter({ email: currentUser.email });
      if (users.length > 0) {
        const u = users[0];
        await base44.entities.User.update(u.id, {
          cash_on_hand: (u.cash_on_hand || 0) + amount,
        });
      }
    }

    setDialogOpen(false);
    setForm(emptyForm());
    setSubmitting(false);
    toast.success("Fatura u krijua me sukses");
    loadData();
  };

  const exportExcel = () => {
    const headers = ["Nr. Fatures", "Klienti", "Email", "Telefon", "Subtotal", "TVSH", "Total", "Statusi", "Gjendja", "Pagesa", "Afati", "Data"];
    const rows = filtered.map(inv => [
      inv.invoice_number,
      inv.client_name,
      inv.client_email || "",
      inv.client_phone || "",
      (inv.subtotal || 0).toFixed(2),
      (inv.vat_amount || 0).toFixed(2),
      (inv.amount || 0).toFixed(2),
      inv.status || "",
      inv.is_open !== false ? "Hapur" : "Mbyllur",
      inv.payment_method || "",
      inv.due_date || "",
      inv.created_date ? new Date(inv.created_date).toLocaleDateString("sq-AL") : "",
    ]);
    const tableRows = rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join("")}</tr>`).join("");
    const html = `<html><head><meta charset="UTF-8"></head><body><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faturat_${new Date().toISOString().slice(0,10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDFList = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = 297; const margin = 14;
    doc.setFillColor(67, 56, 202);
    doc.rect(0, 0, W, 22, "F");
    doc.setTextColor(255,255,255);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Lista e Faturave", margin, 14);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Gjeneruar: ${new Date().toLocaleDateString("sq-AL")}  |  Total: ${filtered.length} fatura`, W - margin, 14, { align: "right" });
    const headers = ["Nr.", "Klienti", "Subtotal", "TVSH", "Total", "Statusi", "Gjendja", "Pagesa", "Data"];
    const colW = [28, 60, 22, 18, 24, 18, 18, 20, 20];
    let x = margin; let y = 32;
    doc.setFillColor(243,244,246);
    doc.rect(margin, y - 5, W - margin*2, 8, "F");
    doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(100,100,100);
    headers.forEach((h, i) => { doc.text(h, x + 2, y); x += colW[i]; });
    y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    filtered.forEach((inv, ri) => {
      if (y > 185) { doc.addPage(); y = 20; }
      if (ri % 2 === 0) { doc.setFillColor(249,250,251); doc.rect(margin, y - 4, W - margin*2, 8, "F"); }
      doc.setTextColor(30,30,30);
      const row = [
        inv.invoice_number || "",
        inv.client_name || "",
        `€${(inv.subtotal||0).toFixed(2)}`,
        `€${(inv.vat_amount||0).toFixed(2)}`,
        `€${(inv.amount||0).toFixed(2)}`,
        inv.status || "",
        inv.is_open !== false ? "Hapur" : "Mbyllur",
        inv.payment_method || "",
        inv.created_date ? new Date(inv.created_date).toLocaleDateString("sq-AL") : "",
      ];
      x = margin;
      row.forEach((v, i) => { doc.text(String(v).slice(0, Math.floor(colW[i]/2) + 2), x + 2, y); x += colW[i]; });
      y += 8;
    });
    doc.setFillColor(67,56,202); doc.rect(0, 195, W, 10, "F");
    doc.setTextColor(255,255,255); doc.setFontSize(7);
    doc.text(`Totali: €${filtered.reduce((s,i) => s+(i.amount||0), 0).toFixed(2)}`, W - margin, 201, { align: "right" });
    doc.save(`lista_faturat_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const handleDuplicate = async (inv) => {
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const copy = {
      invoice_number: invoiceNumber,
      client_name: inv.client_name,
      client_email: inv.client_email,
      client_phone: inv.client_phone,
      items: inv.items,
      subtotal: inv.subtotal,
      vat_amount: inv.vat_amount,
      amount: inv.amount,
      payment_method: inv.payment_method,
      due_date: inv.due_date,
      description: inv.description,
      status: "draft",
      is_open: true,
      issued_by: currentUser?.email,
    };
    await base44.entities.Invoice.create(copy);
    toast.success("Fatura u dyfishua");
    loadData();
  };

  const handleSendReminder = async (inv) => {
    if (!inv.client_email) { toast.error("Klienti nuk ka email"); return; }
    await base44.integrations.Core.SendEmail({
      to: inv.client_email,
      subject: `Kujtesë: Fatura ${inv.invoice_number} pret pagesën`,
      body: `<p>Pershendetje ${inv.client_name},</p><p>Ju kujtojmë se fatura <b>${inv.invoice_number}</b> me vlerë <b>€${(inv.amount||0).toFixed(2)}</b>${inv.due_date ? ` me afat ${inv.due_date}` : ""} është ende e papaguar.</p><p>Ju lutem kryeni pagesën sa më parë.</p><p>Faleminderit!</p>`,
    });
    toast.success("Kujtesa u dërgua");
  };

  const handleUpdate = async () => {
    if (!editInvoice) return;
    setSubmitting(true);
    const { subtotal, vat_amount, amount } = calcTotals(form.items);
    await base44.entities.Invoice.update(editInvoice.id, {
      invoice_type: form.invoice_type || "standard",
      client_name: form.client_name,
      client_email: form.client_email,
      client_phone: form.client_phone,
      items: form.items,
      subtotal, vat_amount, amount,
      payment_method: form.payment_method,
      due_date: form.due_date || undefined,
      description: form.description,
      is_recurring: form.is_recurring || false,
      recurring_interval: form.is_recurring ? form.recurring_interval : undefined,
    });
    toast.success(inv.is_open ? "Fatura u mbyll" : "Fatura u hap");
    loadData();
  };

  const formTotals = calcTotals(form.items);

  const statusBadge = (status) => {
    const styles = {
      draft: "bg-slate-100 text-slate-600",
      sent: "bg-blue-100 text-blue-700",
      paid: "bg-emerald-100 text-emerald-700",
      overdue: "bg-red-100 text-red-700",
      cancelled: "bg-muted text-muted-foreground",
    };
    const labels = { draft: "Draft", sent: "Dërguar", paid: "Paguar", overdue: "Vonuar", cancelled: "Anuluar" };
    return (
      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", styles[status])}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const handleDelete = async (inv) => {
    if (!window.confirm(`Fshi faturën ${inv.invoice_number}?`)) return;
    await base44.entities.Invoice.delete(inv.id);
    toast.success("Fatura u fshi");
    loadData();
  };

  const handleStatusChange = async (inv, newStatus) => {
    await base44.entities.Invoice.update(inv.id, { status: newStatus });
    toast.success(`Statusi ndryshoi në ${newStatus}`);
    loadData();
  };

  const hasActiveFilters = filterClient || filterMonth || filterYear || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setFilterClient("");
    setFilterMonth("");
    setFilterYear("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setPage(1);
  };

  const filtered = invoices.filter(inv => {
    const d = new Date(inv.created_date);
    if (filterClient) {
      const q = filterClient.toLowerCase();
      if (filterSearchType === "client") {
        if (!inv.client_name?.toLowerCase().includes(q)) return false;
      } else {
        if (!inv.invoice_number?.toLowerCase().includes(q)) return false;
      }
    }
    if (filterMonth) {
      if ((d.getMonth() + 1) !== parseInt(filterMonth)) return false;
    }
    if (filterYear) {
      if (d.getFullYear() !== parseInt(filterYear)) return false;
    }
    if (filterDateFrom) {
      if (d < new Date(filterDateFrom)) return false;
    }
    if (filterDateTo) {
      if (d > new Date(filterDateTo + "T23:59:59")) return false;
    }
    return true;
  });
  const openCount = invoices.filter(i => i.is_open !== false).length;
  const totalRevenue = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxhimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Faturat</h1>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button variant="outline" onClick={exportExcel} className="gap-2">
            <Sheet className="w-4 h-4" /> Excel
          </Button>
          <Button variant="outline" onClick={exportPDFList} className="gap-2">
            <Download className="w-4 h-4" /> PDF Listë
          </Button>
          <Button variant="outline" onClick={() => setMergePDFOpen(true)} className="gap-2">
            <Layers className="w-4 h-4" /> Merge PDF
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Krijo Faturë
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej</p>
          <p className="text-2xl font-bold mt-1">{invoices.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">fatura</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hapura</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{openCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">pa u paguar</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5 col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Totali</p>
          <p className="text-2xl font-bold mt-1 text-primary">€{totalRevenue.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
          <p className="text-xs text-muted-foreground mt-0.5">me TVSH</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold">Filtrat & Kërkimi</p>
          <Button variant="ghost" size="icon" className={cn("h-8 w-8", searchOpen && "bg-muted")} onClick={() => setSearchOpen(o => !o)}>
            <Search className="w-4 h-4" />
          </Button>
        </div>
        {searchOpen && (
          <div className="p-4 flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Kërko sipas</label>
              <div className="flex bg-muted rounded-lg p-0.5 mb-2">
                <button
                  onClick={() => { setFilterSearchType("client"); setFilterClient(""); setPage(1); }}
                  className={cn("flex-1 py-1.5 text-xs font-medium rounded-md transition-all", filterSearchType === "client" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >Klienti</button>
                <button
                  onClick={() => { setFilterSearchType("invoice"); setFilterClient(""); setPage(1); }}
                  className={cn("flex-1 py-1.5 text-xs font-medium rounded-md transition-all", filterSearchType === "invoice" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >Nr. Faturës</button>
              </div>
              <input
                type="text"
                placeholder={filterSearchType === "client" ? "Emri i klientit..." : "Nr. faturës..."}
                value={filterClient}
                onChange={(e) => { setFilterClient(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Periudha</label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setFilterDateFrom(today);
                    setFilterDateTo(today);
                    setPage(1);
                  }}
                  className="text-xs px-2 py-1.5 rounded-lg border border-border bg-white hover:bg-muted transition font-medium"
                >Sot</button>
                <button
                  onClick={() => {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                    const end = now.toISOString().split('T')[0];
                    setFilterDateFrom(start);
                    setFilterDateTo(end);
                    setPage(1);
                  }}
                  className="text-xs px-2 py-1.5 rounded-lg border border-border bg-white hover:bg-muted transition font-medium"
                >Muaj</button>
                <button
                  onClick={() => {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
                    const end = now.toISOString().split('T')[0];
                    setFilterDateFrom(start);
                    setFilterDateTo(end);
                    setPage(1);
                  }}
                  className="text-xs px-2 py-1.5 rounded-lg border border-border bg-white hover:bg-muted transition font-medium"
                >Vit</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Nga Data</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Deri më Date</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>Pastro filtrat</Button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-semibold text-sm">{filtered.length} fatura{hasActiveFilters && " (filtruara)"}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Nr.</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Klienti</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Subtotal</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">TVSH</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Total</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Statusi</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Gjendja</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Pagesa</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Faturoi</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Data</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                        <FileText className="w-7 h-7 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">Nuk ka fatura</p>
                      <p className="text-xs text-muted-foreground">Krijo faturën e parë duke klikuar butonin "Krijo Faturë"</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-primary cursor-pointer hover:underline" onClick={() => navigate(`/invoices/${inv.id}`)}>{inv.invoice_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold">{inv.client_name}</div>
                      {inv.client_email && <div className="text-xs text-muted-foreground mt-0.5">{inv.client_email}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">€{(inv.subtotal || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">€{(inv.vat_amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-foreground">€{(inv.amount || 0).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={inv.status || "draft"}
                        onChange={(e) => handleStatusChange(inv, e.target.value)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-full border-0 bg-slate-100 text-slate-600 cursor-pointer hover:bg-slate-200 transition"
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Dërguar</option>
                        <option value="paid">Paguar</option>
                        <option value="overdue">Vonuar</option>
                        <option value="cancelled">Anuluar</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium bg-muted px-2.5 py-1 rounded-full capitalize">{inv.is_open ? 'Haper' : 'Mbyllur'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium bg-muted px-2.5 py-1 rounded-full capitalize">{inv.payment_method || "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-muted-foreground">{inv.issued_by ? inv.issued_by.split("@")[0] : "—"}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{moment(inv.created_date).format("DD MMM YY")}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5 justify-end items-center">
                        <InvoicePDFButton invoice={inv} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => navigate(`/invoices/${inv.id}`)}>
                              <Eye className="w-4 h-4 mr-2" /> Shiko Faturën
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(inv)}>
                              <Pencil className="w-4 h-4 mr-2" /> Modifiko
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setSendDialog(inv)}>
                              <Send className="w-4 h-4 mr-2" /> Ridërgo Faturën
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendReminder(inv)}>
                              <Bell className="w-4 h-4 mr-2" /> Kujtesë për Faturën
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDuplicate(inv)}>
                              <Copy className="w-4 h-4 mr-2" /> Dyfisho
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(inv)} className="text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Fshi Faturën
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Duke shfaqur {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} nga {filtered.length} fatura
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-white hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
              >← Prapa</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className={cn("w-8 h-8 text-sm font-medium rounded-lg border transition",
                    page === n ? "bg-primary text-white border-primary" : "bg-white border-border hover:bg-muted"
                  )}>{n}</button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-white hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
              >Para →</button>
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Krijo Faturë të Re</DialogTitle>
            <DialogDescription>Zgjedh llojin e faturës dhe plotëso informacionet</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
              <Label className="block mb-2 font-semibold">Lloji i Faturës</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "standard", label: "Fatura Standard", desc: "Fatura normale" },
                  { value: "proforma", label: "Proforma", desc: "Fatura paraprake" },
                  { value: "credit_note", label: "Kredit Note", desc: "Zbritje/kthim" },
                ].map(type => (
                  <button
                    key={type.value}
                    onClick={() => setForm({ ...form, invoice_type: type.value })}
                    className={cn(
                      "p-3 rounded-lg border-2 transition text-left",
                      form.invoice_type === type.value
                        ? "bg-primary text-white border-primary shadow-lg"
                        : "bg-white border-border hover:border-primary/40"
                    )}
                  >
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className={cn("text-xs mt-1", form.invoice_type === type.value ? "text-primary/80" : "text-muted-foreground")}>
                      {type.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Klienti *</Label>
                <Input placeholder="Emri i klientit" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Email Klientit</Label>
                <Input type="email" placeholder="email@domain.com" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Telefon (me prefiks +355...)</Label>
                <Input placeholder="+355 6X XXX XXXX" value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div>
                <Label>Afati i Pagesës</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Artikujt / Shërbimet</Label>
              <InvoiceLineItems items={form.items} onChange={(items) => setForm({ ...form, items })} />
            </div>
            <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal (pa TVSH)</span>
                <span className="font-medium">€{formTotals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TVSH</span>
                <span className="font-medium">€{formTotals.vat_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-semibold">Total me TVSH</span>
                <span className="font-bold text-base">€{formTotals.amount.toFixed(2)}</span>
              </div>
            </div>
            <div>
              <Label>Shënime</Label>
              <Textarea placeholder="Shënime opsionale..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={2} />
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                <div>
                  <Label className="mb-1">Fatura Automatike</Label>
                  <p className="text-xs text-muted-foreground">Krijoni fatura të reja në mënyrë automatike në intervalin e zgjedhur</p>
                </div>
                <input type="checkbox" checked={form.is_recurring} onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })} className="h-4 w-4 cursor-pointer" />
              </div>
              {form.is_recurring && (
                <div className="mt-3">
                  <Label>Intervali</Label>
                  <Select value={form.recurring_interval} onValueChange={(v) => setForm({ ...form, recurring_interval: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Çdo muaj</SelectItem>
                      <SelectItem value="quarterly">Çdo 3 muaj</SelectItem>
                      <SelectItem value="yearly">Çdo vit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleCreate} disabled={submitting || !form.client_name || form.items.length === 0}>
              {submitting ? "Duke krijuar..." : "Krijo Faturë"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editInvoice} onOpenChange={(o) => { if (!o) { setEditInvoice(null); setForm(emptyForm()); } }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifiko Faturën — {editInvoice?.invoice_number}</DialogTitle>
            <DialogDescription>Përditëso të dhënat e faturës</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
              <Label className="block mb-2 font-semibold">Lloji i Faturës</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "standard", label: "Fatura Standard", desc: "Fatura normale" },
                  { value: "proforma", label: "Proforma", desc: "Fatura paraprake" },
                  { value: "credit_note", label: "Kredit Note", desc: "Zbritje/kthim" },
                ].map(type => (
                  <button
                    key={type.value}
                    onClick={() => setForm({ ...form, invoice_type: type.value })}
                    className={cn(
                      "p-3 rounded-lg border-2 transition text-left",
                      form.invoice_type === type.value
                        ? "bg-primary text-white border-primary shadow-lg"
                        : "bg-white border-border hover:border-primary/40"
                    )}
                  >
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className={cn("text-xs mt-1", form.invoice_type === type.value ? "text-primary/80" : "text-muted-foreground")}>
                      {type.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><Label>Klienti *</Label><Input placeholder="Emri i klientit" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Email Klientit</Label><Input type="email" placeholder="email@domain.com" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Telefon</Label><Input placeholder="+355 6X XXX XXXX" value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} className="mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Metoda e Pagesës</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Transfer Bankar</SelectItem>
                    <SelectItem value="card">Kartë</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Afati i Pagesës</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="mt-1.5" /></div>
            </div>
            <div>
              <Label className="mb-2 block">Artikujt / Shërbimet</Label>
              <InvoiceLineItems items={form.items} onChange={(items) => setForm({ ...form, items })} />
            </div>
            <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">€{calcTotals(form.items).subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">TVSH</span><span className="font-medium">€{calcTotals(form.items).vat_amount.toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-border pt-2"><span className="font-semibold">Total me TVSH</span><span className="font-bold text-base">€{calcTotals(form.items).amount.toFixed(2)}</span></div>
            </div>
            <div><Label>Shënime</Label><Textarea placeholder="Shënime opsionale..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={2} /></div>
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                <div>
                  <Label className="mb-1">Fatura Automatike</Label>
                  <p className="text-xs text-muted-foreground">Krijoni fatura të reja në mënyrë automatike në intervalin e zgjedhur</p>
                </div>
                <input type="checkbox" checked={form.is_recurring} onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })} className="h-4 w-4 cursor-pointer" />
              </div>
              {form.is_recurring && (
                <div className="mt-3">
                  <Label>Intervali</Label>
                  <Select value={form.recurring_interval} onValueChange={(v) => setForm({ ...form, recurring_interval: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Çdo muaj</SelectItem>
                      <SelectItem value="quarterly">Çdo 3 muaj</SelectItem>
                      <SelectItem value="yearly">Çdo vit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditInvoice(null); setForm(emptyForm()); }}>Anulo</Button>
            <Button onClick={handleUpdate} disabled={submitting || !form.client_name}>{ submitting ? "Duke ruajtur..." : "Ruaj Ndryshimet" }</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <SendInvoiceDialog invoice={sendDialog} open={!!sendDialog} onClose={() => setSendDialog(null)} />
      <MergePDFDialog invoices={invoices} open={mergePDFOpen} onClose={() => setMergePDFOpen(false)} />
    </div>
  );
}