import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/useLanguage";
import { Plus, FileText, Send, Search, Download, Sheet, Layers, MoreHorizontal, Eye, Bell, Copy, Pencil, Trash2, Filter, X, SlidersHorizontal, Calendar, User, Hash, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet as SheetComponent, SheetContent, SheetClose } from "@/components/ui/sheet";
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
import PaymentDialog from "../components/invoices/PaymentDialog";

const emptyForm = () => ({
  invoice_type: "standard",
  client_name: "",
  client_email: "",
  client_phone: "",
  client_nipt: "",
  client_address: "",
  payment_method: "cash",
  payment_notes: "",
  internal_notes: "",
  due_date: "",
  description: "",
  is_recurring: false,
  recurring_interval: "monthly",
  items: [{ type: "service", name: "", quantity: 1, unit: "cope", price_ex_vat: 0, vat_rate: 20, price_inc_vat: 0, line_total: 0 }],
});

export default function Invoices() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const tenantId = user?.tenant_id;
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [filterSearchType, setFilterSearchType] = useState("client");
  const [filterClient, setFilterClient] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [settings, setSettings] = useState(null);
  const [paymentDialog, setPaymentDialog] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => { loadData(); loadSettings(); loadClients(); }, []);

  const loadClients = async () => {
    const data = await base44.entities.Client.list("-created_date", 100);
    setClients(data);
  };

  const fillClientData = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setForm(prev => ({
        ...prev,
        client_name: client.name,
        client_email: client.email,
        client_phone: client.phone || "",
        client_nipt: client.nipt || "",
        client_address: client.address || "",
      }));
    }
  };

  const loadData = async () => {
    const [user, data] = await Promise.all([
      base44.auth.me(),
      base44.entities.Invoice.list("-created_date", 100),
    ]);
    setCurrentUser(user);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const inv of data) {
      if (inv.due_date && inv.status !== "paid" && inv.status !== "cancelled" && inv.status !== "overdue") {
        const due = new Date(inv.due_date);
        if (due < today) {
          inv.status = "overdue";
          base44.entities.Invoice.update(inv.id, { status: "overdue" }).catch(() => {});
        }
      }
      const totalPaid = (inv.payment_records || []).reduce((s, p) => s + (p.amount || 0), 0);
      if (totalPaid > 0 && totalPaid < (inv.amount || 0) && inv.status !== "partially_paid" && inv.status !== "paid" && inv.status !== "overdue") {
        inv.status = "partially_paid";
        base44.entities.Invoice.update(inv.id, { status: "partially_paid" }).catch(() => {});
      }
    }
    setInvoices(data);
    setLoading(false);
  };

  const loadSettings = async () => {
    const sets = await base44.entities.InvoiceSettings.list("-created_date", 1);
    const s = sets.length > 0 ? sets[0] : null;
    setSettings(s);
    return s;
  };

  const getDefaultDueDate = (s) => {
    const days = s?.default_due_days ?? 10;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const generateInvoiceNumber = async () => {
    let format = settings?.invoice_number_format || "INV-{###}";
    let counter = (settings?.invoice_number_counter || 0) + 1;
    let number = format.replace("{###}", String(counter).padStart(3, "0")).replace("{YYYY}", new Date().getFullYear());
    if (settings) {
      await base44.entities.InvoiceSettings.update(settings.id, { invoice_number_counter: counter });
    } else {
      await base44.entities.InvoiceSettings.create({ invoice_number_format: format, invoice_number_counter: counter, tenant_id: tenantId });
    }
    await loadSettings();
    return number;
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
    const invoiceNumber = await generateInvoiceNumber();
    const { subtotal, vat_amount, amount } = calcTotals(form.items);
    const newInvoice = {
      tenant_id: tenantId,
      invoice_type: form.invoice_type || "standard",
      invoice_number: invoiceNumber,
      client_name: form.client_name,
      client_email: form.client_email,
      client_phone: form.client_phone,
      client_nipt: form.client_nipt || undefined,
      client_address: form.client_address || undefined,
      items: form.items,
      subtotal, vat_amount, amount,
      payment_method: form.payment_method,
      payment_notes: form.payment_notes || undefined,
      internal_notes: form.internal_notes || undefined,
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
        await base44.entities.User.update(u.id, { cash_on_hand: parseFloat(u.cash_on_hand || 0) + parseFloat(amount || 0) });
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
      inv.invoice_number, inv.client_name, inv.client_email || "", inv.client_phone || "",
      parseFloat(inv.subtotal || 0).toFixed(2), parseFloat(inv.vat_amount || 0).toFixed(2), parseFloat(inv.amount || 0).toFixed(2),
      inv.status || "", inv.is_open !== false ? "Hapur" : "Mbyllur", inv.payment_method || "",
      inv.due_date || "", inv.created_date ? new Date(inv.created_date).toLocaleDateString("sq-AL") : "",
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
        inv.invoice_number || "", inv.client_name || "",
        `€${parseFloat(inv.subtotal||0).toFixed(2)}`, `€${parseFloat(inv.vat_amount||0).toFixed(2)}`, `€${parseFloat(inv.amount||0).toFixed(2)}`,
        inv.status || "", inv.is_open !== false ? "Hapur" : "Mbyllur", inv.payment_method || "",
        inv.created_date ? new Date(inv.created_date).toLocaleDateString("sq-AL") : "",
      ];
      x = margin;
      row.forEach((v, i) => { doc.text(String(v).slice(0, Math.floor(colW[i]/2) + 2), x + 2, y); x += colW[i]; });
      y += 8;
    });
    doc.setFillColor(67,56,202); doc.rect(0, 195, W, 10, "F");
    doc.setTextColor(255,255,255); doc.setFontSize(7);
    doc.text(`Totali: €${filtered.reduce((s,i) => s+parseFloat(i.amount||0), 0).toFixed(2)}`, W - margin, 201, { align: "right" });
    doc.save(`lista_faturat_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const handleDuplicate = async (inv) => {
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const copy = {
      tenant_id: tenantId,
      invoice_number: invoiceNumber, client_name: inv.client_name, client_email: inv.client_email,
      client_phone: inv.client_phone, items: inv.items, subtotal: inv.subtotal, vat_amount: inv.vat_amount,
      amount: inv.amount, payment_method: inv.payment_method, due_date: inv.due_date,
      description: inv.description, status: "draft", is_open: true, issued_by: currentUser?.email,
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
      body: `<p>Pershendetje ${inv.client_name},</p><p>Ju kujtojmë se fatura <b>${inv.invoice_number}</b> me vlerë <b>€${parseFloat(inv.amount||0).toFixed(2)}</b>${inv.due_date ? ` me afat ${inv.due_date}` : ""} është ende e papaguar.</p><p>Ju lutem kryeni pagesën sa më parë.</p><p>Faleminderit!</p>`,
    });
    toast.success("Kujtesa u dërgua");
  };

  const getTotalPaid = (inv) => {
    if (!inv) return 0;
    return (inv.payment_records || []).reduce((s, p) => s + p.amount, 0);
  };

  const handleUpdate = async () => {
    if (!editInvoice) return;
    setSubmitting(true);
    const { subtotal, vat_amount, amount } = calcTotals(form.items);
    await base44.entities.Invoice.update(editInvoice.id, {
      invoice_type: form.invoice_type || "standard",
      client_name: form.client_name, client_email: form.client_email, client_phone: form.client_phone,
      client_nipt: form.client_nipt, client_address: form.client_address,
      items: form.items, subtotal, vat_amount, amount,
      payment_method: form.payment_method, payment_notes: form.payment_notes,
      due_date: form.due_date || undefined, description: form.description,
      is_recurring: form.is_recurring || false,
      recurring_interval: form.is_recurring ? form.recurring_interval : undefined,
    });
    setEditInvoice(null);
    setForm(emptyForm());
    setSubmitting(false);
    toast.success("Fatura u përditësua");
    loadData();
  };

  const formTotals = calcTotals(form.items);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const openEdit = (inv) => {
    setEditInvoice(inv);
    setForm({
      invoice_type: inv.invoice_type || "standard",
      client_name: inv.client_name, client_email: inv.client_email, client_phone: inv.client_phone,
      client_nipt: inv.client_nipt, client_address: inv.client_address,
      payment_method: inv.payment_method, payment_notes: inv.payment_notes || "",
      internal_notes: inv.internal_notes || "", due_date: inv.due_date || "",
      description: inv.description || "", is_recurring: inv.is_recurring || false,
      recurring_interval: inv.recurring_interval || "monthly", items: inv.items || [],
    });
  };

  const handleDelete = async (inv) => {
    if (!window.confirm(`Fshi faturën ${inv.invoice_number}?`)) return;
    await base44.entities.Invoice.delete(inv.id);
    toast.success("Fatura u fshi");
    loadData();
  };



  const handleConvertProforma = async (inv) => {
    if (inv.invoice_type !== "proforma") return;
    setSubmitting(true);
    const invoiceNumber = await generateInvoiceNumber();
    const newInvoice = { ...inv, invoice_type: "standard", invoice_number: invoiceNumber, converted_from_proforma: true, parent_invoice_id: inv.id };
    delete newInvoice.id; delete newInvoice.created_date; delete newInvoice.updated_date; delete newInvoice.created_by;
    await base44.entities.Invoice.create(newInvoice);
    setSubmitting(false);
    toast.success("Proforma u konvertua në faturë standarde");
    loadData();
  };

  const handleStatusChange = async (inv, newStatus) => {
    if (inv.invoice_type === "proforma" && newStatus === "paid") {
      toast.error("Proforma nuk mund të shënohet si paguar.");
      return;
    }
    await base44.entities.Invoice.update(inv.id, { status: newStatus });
    toast.success(`Statusi ndryshoi në ${newStatus}`);
    loadData();
  };

  const handleMarkHandDelivered = async (inv) => {
    await base44.entities.Invoice.update(inv.id, { hand_delivered: true });
    toast.success(`Fatura u shënua si e dorëzuar në dorë`);
    loadData();
  };

  const hasActiveFilters = filterClient || filterMonth || filterYear || filterDateFrom || filterDateTo;
  const activeFilterCount = [filterClient, filterDateFrom, filterDateTo].filter(Boolean).length;

  const clearFilters = () => {
    setFilterClient(""); setFilterMonth(""); setFilterYear("");
    setFilterDateFrom(""); setFilterDateTo(""); setPage(1);
  };

  const filtered = invoices.filter(inv => {
    const d = new Date(inv.created_date);
    if (filterClient) {
      const q = filterClient.toLowerCase();
      if (filterSearchType === "client") { if (!inv.client_name?.toLowerCase().includes(q)) return false; }
      else { if (!inv.invoice_number?.toLowerCase().includes(q)) return false; }
    }
    if (filterMonth && (d.getMonth() + 1) !== parseInt(filterMonth)) return false;
    if (filterYear && d.getFullYear() !== parseInt(filterYear)) return false;
    if (filterDateFrom && d < new Date(filterDateFrom)) return false;
    if (filterDateTo && d > new Date(filterDateTo + "T23:59:59")) return false;
    if (statusFilter === "paid" && inv.status !== "paid") return false;
    if (statusFilter === "unpaid" && (inv.status === "paid" || inv.status === "cancelled")) return false;
    if (statusFilter === "overdue" && inv.status !== "overdue") return false;
    if (statusFilter === "partially_paid" && inv.status !== "partially_paid") return false;
    return true;
  });

  const openCount = invoices.filter(i => i.is_open !== false).length;
  const totalRevenue = invoices.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">{t('manage')}</p>
            <h1 className="text-4xl font-bold tracking-tight">{t('invoices')}</h1>
          </div>
          <p className="text-sm text-muted-foreground pt-1">{new Date().toLocaleDateString('sq-AL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button variant="outline" onClick={exportExcel} className="gap-2 rounded-xl">
            <Sheet className="w-4 h-4" /> {t('exportExcel')}
          </Button>
          <Button variant="outline" onClick={exportPDFList} className="gap-2 rounded-xl">
            <Download className="w-4 h-4" /> {t('exportPDF')}
          </Button>
          <Button variant="outline" onClick={() => setMergePDFOpen(true)} className="gap-2 rounded-xl">
            <Layers className="w-4 h-4" /> Merge
          </Button>
          <Button onClick={() => { setForm({ ...emptyForm(), due_date: getDefaultDueDate(settings) }); setDialogOpen(true); }} className="gap-2 rounded-xl">
            <Plus className="w-4 h-4" /> {t('newInvoice')}
          </Button>
        </div>
        </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-indigo-500" />
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('total')}</p>
            <p className="text-2xl font-bold mt-1">{invoices.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('invoices')}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-emerald-500" />
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('openInvoices')}</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{openCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('unpaid')}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden col-span-2 sm:col-span-1">
          <div className="h-[3px] w-full bg-violet-500" />
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('total')}</p>
            <p className="text-2xl font-bold mt-1 text-primary">€{totalRevenue.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('withVat')}</p>
          </div>
        </div>
      </div>

      {/* Filter Trigger Button */}
      <button
       onClick={() => setSearchOpen(true)}
       className={cn(
         "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all w-fit shadow-sm",
         hasActiveFilters
           ? "border-primary bg-primary/5 text-primary"
           : "border-border bg-white text-foreground hover:border-primary/50 hover:shadow-md"
       )}
      >
       <SlidersHorizontal className="w-4 h-4" />
       Filtrat & Kërkimi
       {hasActiveFilters && (
         <span className="bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
           {activeFilterCount}
         </span>
       )}
      </button>

      {/* Filters Drawer */}
      <SheetComponent open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="right" className="w-full sm:w-[420px] p-0 flex flex-col bg-gradient-to-b from-white to-slate-50">
          <div className="px-6 py-5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 rounded-b-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
                <SlidersHorizontal className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-[15px]">Filtrat & Kërkimi</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hasActiveFilters ? `${activeFilterCount} filtr aktiv` : "Filtro dhe kërko faturat"}
                </p>
              </div>
            </div>
            <SheetClose className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-muted-foreground hover:text-foreground transition">
              <X className="h-4 w-4" />
            </SheetClose>
          </div>
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Kërkim</span>
              </div>
              <div className="bg-muted rounded-xl p-1 flex gap-1 mb-3">
                <button onClick={() => { setFilterSearchType("client"); setFilterClient(""); setPage(1); }}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all",
                    filterSearchType === "client" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}>
                  <User className="w-3 h-3" /> Klienti
                </button>
                <button onClick={() => { setFilterSearchType("invoice"); setFilterClient(""); setPage(1); }}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all",
                    filterSearchType === "invoice" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}>
                  <Hash className="w-3 h-3" /> Nr. Faturës
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input type="text"
                  placeholder={filterSearchType === "client" ? "Emri i klientit..." : "Nr. faturës..."}
                  value={filterClient}
                  onChange={(e) => { setFilterClient(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-9 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {filterClient && (
                  <button onClick={() => { setFilterClient(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="h-px bg-border mx-6" />
            <div className="px-6 pt-5 pb-6">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Statusi i Pagesës</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { value: "", label: "Të Gjitha", activeClass: "bg-primary/10 border-primary text-primary", hoverClass: "hover:border-primary/30" },
                  { value: "paid", label: "✓ Paguar", activeClass: "bg-green-100 border-green-500 text-green-700", hoverClass: "hover:border-green-300" },
                  { value: "unpaid", label: "✕ Papaguar", activeClass: "bg-red-100 border-red-500 text-red-700", hoverClass: "hover:border-red-300" },
                  { value: "partially_paid", label: "◐ Pjesërisht", activeClass: "bg-amber-100 border-amber-500 text-amber-700", hoverClass: "hover:border-amber-300" },
                  { value: "overdue", label: "⚠ Vonuar", activeClass: "bg-red-100 border-red-500 text-red-700", hoverClass: "hover:border-red-300" },
                ].map(opt => (
                  <button key={opt.value}
                    onClick={() => { setStatusFilter(opt.value); setPage(1); }}
                    className={cn(
                      "py-2 px-3 text-xs font-semibold rounded-lg border transition-all",
                      statusFilter === opt.value ? opt.activeClass : `border-border bg-white ${opt.hoverClass}`
                    )}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-px bg-border mx-6" />
            <div className="px-6 pt-5 pb-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Periudha</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "Sot", action: () => { const t = new Date().toISOString().split('T')[0]; setFilterDateFrom(t); setFilterDateTo(t); setPage(1); } },
                  { label: "Ky Muaj", action: () => { const now = new Date(); setFilterDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]); setFilterDateTo(now.toISOString().split('T')[0]); setPage(1); } },
                  { label: "Ky Vit", action: () => { const now = new Date(); setFilterDateFrom(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]); setFilterDateTo(now.toISOString().split('T')[0]); setPage(1); } },
                ].map(p => (
                  <button key={p.label} onClick={p.action} className="py-2 text-xs font-semibold rounded-xl border border-border bg-white hover:bg-primary hover:text-white hover:border-primary transition-all">{p.label}</button>
                ))}
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Nga Data</label>
                  <input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Deri më Data</label>
                  <input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            </div>
            {hasActiveFilters && (
              <>
                <div className="h-px bg-border mx-6" />
                <div className="px-6 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Filtrat Aktive</p>
                  <div className="flex flex-wrap gap-2">
                    {filterClient && (
                      <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                        {filterClient}
                        <button onClick={() => { setFilterClient(""); setPage(1); }}><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {filterDateFrom && (
                      <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                        Nga {filterDateFrom}
                        <button onClick={() => { setFilterDateFrom(""); setPage(1); }}><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {filterDateTo && (
                      <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                        Deri {filterDateTo}
                        <button onClick={() => { setFilterDateTo(""); setPage(1); }}><X className="w-3 h-3" /></button>
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="border-t border-border px-6 py-4 bg-white space-y-2 shrink-0">
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="w-full rounded-xl">Pastro të gjithë Filtrat</Button>
            )}
            <SheetClose asChild>
              <Button className="w-full rounded-xl">Apliko & Mbyll</Button>
            </SheetClose>
          </div>
        </SheetContent>
      </SheetComponent>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden transition-shadow hover:shadow-md w-full">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
          <p className="font-semibold text-sm">{filtered.length} fatura{hasActiveFilters && " (filtruara)"}</p>
          <div className="flex items-center gap-1.5 ml-auto">
            {[
              { label: "Sot", action: () => { const t = new Date().toISOString().split('T')[0]; setFilterDateFrom(t); setFilterDateTo(t); setPage(1); } },
              { label: "Muaj", action: () => { const now = new Date(); setFilterDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]); setFilterDateTo(now.toISOString().split('T')[0]); setPage(1); } },
              { label: "Vit", action: () => { const now = new Date(); setFilterDateFrom(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]); setFilterDateTo(now.toISOString().split('T')[0]); setPage(1); } },
            ].map(p => (
              <button key={p.label} onClick={p.action}
                className="px-3 py-1 text-xs font-semibold rounded-lg border border-border bg-white hover:bg-primary hover:text-white hover:border-primary transition-all">
                {p.label}
              </button>
            ))}
            {hasActiveFilters && (
              <button onClick={clearFilters} className="px-3 py-1 text-xs font-semibold rounded-lg border border-destructive/40 text-destructive hover:bg-destructive hover:text-white transition-all">
                ✕ Pastro
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">NR.</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Nr. Faturës</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Klienti</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Data</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Subtotal</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">TVSH</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Total</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Statusi</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Gjendja</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Pagesa</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Faturoi</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (
                <tr>
                   <td colSpan={13} className="text-center py-16">
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
                paginated.map((inv, idx) => (
                  <tr key={inv.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4 text-sm text-muted-foreground font-medium">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-primary cursor-pointer hover:underline" onClick={() => navigate(`/invoices/${inv.id}`)}>{inv.invoice_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold">{inv.client_name}</div>
                      {inv.client_email && <div className="text-xs text-muted-foreground mt-0.5">{inv.client_email}</div>}
                      <div className="mt-1.5 flex gap-1">
                        {inv.invoice_type === "proforma" && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Proforma</span>}
                        {inv.invoice_type === "credit_note" && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Kredit Note</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{inv.created_date ? moment(inv.created_date).format("DD MMM YYYY") : "—"}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">€{parseFloat(inv.subtotal || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">€{parseFloat(inv.vat_amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4"><span className="text-sm font-bold text-foreground">€{parseFloat(inv.amount || 0).toFixed(2)}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <select value={inv.status || "draft"} onChange={(e) => handleStatusChange(inv, e.target.value)}
                          className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer transition",
                            inv.status === "paid" ? "bg-green-100 text-green-700" :
                            inv.status === "overdue" ? "bg-red-100 text-red-700" :
                            inv.status === "partially_paid" ? "bg-amber-100 text-amber-700" :
                            inv.status === "sent" ? "bg-blue-100 text-blue-700" :
                            inv.status === "cancelled" ? "bg-gray-100 text-gray-700" :
                            "bg-slate-100 text-slate-600"
                          )}>
                          <option value="draft">Draft</option>
                          <option value="sent">Dërguar</option>
                          <option value="partially_paid">Pjesërisht Paguar</option>
                          <option value="paid">Paguar</option>
                          <option value="overdue">Vonuar</option>
                          <option value="cancelled">Anuluar</option>
                        </select>
                        {inv.hand_delivered && <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">✓ në dorë</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-xs font-medium bg-muted px-2.5 py-1 rounded-full">{inv.is_open ? 'Haper' : 'Mbyllur'}</span></td>
                    <td className="px-6 py-4"><span className="text-xs font-medium bg-muted px-2.5 py-1 rounded-full capitalize">{inv.payment_method || "—"}</span></td>
                    <td className="px-6 py-4"><span className="text-xs text-muted-foreground">{inv.issued_by ? inv.issued_by.split("@")[0] : "—"}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5 justify-end items-center">
                        <InvoicePDFButton invoice={inv} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                         <DropdownMenuContent align="end" className="w-48">
                           <DropdownMenuItem onClick={() => navigate(`/invoices/${inv.id}`)}><Eye className="w-4 h-4 mr-2" /> Shiko Faturën</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => openEdit(inv)}><Pencil className="w-4 h-4 mr-2" /> Modifiko</DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem onClick={() => setSendDialog(inv)}><Send className="w-4 h-4 mr-2" /> Ridërgo Faturën</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleSendReminder(inv)}><Bell className="w-4 h-4 mr-2" /> Kujtese për Faturën</DropdownMenuItem>
                           {!inv.hand_delivered && <DropdownMenuItem onClick={() => handleMarkHandDelivered(inv)}><FileText className="w-4 h-4 mr-2" /> Shëno si Dorëzuar në Dorë</DropdownMenuItem>}
                           {inv.is_open && <DropdownMenuItem onClick={() => setPaymentDialog(inv)}><Banknote className="w-4 h-4 mr-2" /> Shto Pagesë</DropdownMenuItem>}
                           {inv.invoice_type === "proforma" && <DropdownMenuItem onClick={() => handleConvertProforma(inv)}><FileText className="w-4 h-4 mr-2" /> Konverto në Faturë</DropdownMenuItem>}
                           <DropdownMenuSeparator />
                           <DropdownMenuItem onClick={() => handleDuplicate(inv)}><Copy className="w-4 h-4 mr-2" /> Dyfisho</DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem onClick={() => handleDelete(inv)} className="text-destructive focus:text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Fshi Faturën</DropdownMenuItem>
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
            <p className="text-sm text-muted-foreground">Duke shfaqur {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} nga {filtered.length} fatura</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-white hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition">← Prapa</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className={cn("w-8 h-8 text-sm font-medium rounded-lg border transition",
                    page === n ? "bg-primary text-white border-primary" : "bg-white border-border hover:bg-muted"
                  )}>{n}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-white hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition">Para →</button>
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Krijo Faturë të Re</DialogTitle>
            <DialogDescription>Plotëso të dhënat e faturës hap pas hapi</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">1</div>
                <h3 className="font-semibold text-sm">Lloji i Faturës</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 pl-8">
                {[
                  { value: "standard", label: "Standard", desc: "Fatura normale" },
                  { value: "proforma", label: "Proforma", desc: "Paraprake" },
                  { value: "credit_note", label: "Kredit Note", desc: "Zbritje/kthim" },
                ].map(type => (
                  <button key={type.value} onClick={() => setForm({ ...form, invoice_type: type.value })}
                    className={cn("p-2.5 rounded-lg border-2 transition text-left text-xs",
                      form.invoice_type === type.value ? "bg-primary text-white border-primary" : "bg-white border-border hover:border-primary/40"
                    )}>
                    <div className="font-semibold">{type.label}</div>
                    <div className="text-[10px] mt-0.5 opacity-75">{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">2</div>
                <h3 className="font-semibold text-sm">Të dhënat e Klientit</h3>
              </div>
              <div className="space-y-3 pl-8">
                <Select value="" onValueChange={(clientId) => fillClientData(clientId)}>
                  <SelectTrigger><SelectValue placeholder="Zgjedh klientin ekzistues" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Emri i klientit *" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="NIPT" value={form.client_nipt} onChange={(e) => setForm({ ...form, client_nipt: e.target.value })} />
                  <Input placeholder="Adresa" value={form.client_address} onChange={(e) => setForm({ ...form, client_address: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">3</div>
                <h3 className="font-semibold text-sm">Artikujt / Shërbimet *</h3>
              </div>
              <div className="pl-8">
                <InvoiceLineItems items={form.items} onChange={(items) => setForm({ ...form, items })} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">4</div>
                <h3 className="font-semibold text-sm">Pagesa dhe Shënime</h3>
              </div>
              <div className="space-y-3 pl-8">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Metoda</Label>
                    <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                      <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Transfer</SelectItem>
                        <SelectItem value="card">Kartë</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Afat Pagese</Label>
                    <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="mt-1" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Default: {settings?.default_due_days ?? 10} ditë</p>
                  </div>
                  <div>
                    <Label className="text-xs">Shënime Pagese</Label>
                    <Input placeholder="Llogaria..." value={form.payment_notes} onChange={(e) => setForm({ ...form, payment_notes: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <Textarea placeholder="Shënime brendshme (të fshehura nga klienti)" value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} rows={2} />
                <Textarea placeholder="Shënime shtesë" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary/8 to-primary/4 rounded-xl p-4 space-y-2.5 text-sm border border-primary/15">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal (pa TVSH)</span><span className="font-semibold">€{formTotals.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">TVSH</span><span className="font-semibold">€{formTotals.vat_amount.toFixed(2)}</span></div>
              <div className="border-t border-primary/20 pt-2 flex justify-between">
                <span className="font-bold">Total me TVSH</span>
                <span className="text-lg font-bold text-primary">€{formTotals.amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleCreate} disabled={submitting || !form.client_name || form.items.length === 0} className="gap-2">
              {submitting ? "Duke krijuar..." : "Krijo Faturë"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editInvoice} onOpenChange={(o) => { if (!o) { setEditInvoice(null); setForm(emptyForm()); } }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
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
                  <button key={type.value} onClick={() => setForm({ ...form, invoice_type: type.value })}
                    className={cn("p-3 rounded-lg border-2 transition text-left",
                      form.invoice_type === type.value ? "bg-primary text-white border-primary shadow-lg" : "bg-white border-border hover:border-primary/40"
                    )}>
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className={cn("text-xs mt-1", form.invoice_type === type.value ? "opacity-80" : "text-muted-foreground")}>{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Klienti *</Label>
                <Select value="" onValueChange={(clientId) => fillClientData(clientId)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Zgjedh klientin" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Emri i klientit" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="mt-1.5" />
              </div>
              <div><Label>Email Klientit</Label><Input type="email" placeholder="email@domain.com" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Telefon</Label><Input placeholder="+355 6X XXX XXXX" value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} className="mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>NIPT</Label><Input placeholder="L XXXX XXXXX K XX" value={form.client_nipt} onChange={(e) => setForm({ ...form, client_nipt: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Adresa</Label><Input placeholder="Adresa e klientit" value={form.client_address} onChange={(e) => setForm({ ...form, client_address: e.target.value })} className="mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <div><Label>Afati i Pagesës</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Shënime Pagese</Label><Input placeholder="Llogarinë, termin e pagesës..." value={form.payment_notes} onChange={(e) => setForm({ ...form, payment_notes: e.target.value })} className="mt-1.5" /></div>
            </div>
            <div><Label>Shënime Brendshme</Label><Textarea placeholder="Shënime të fshehura nga klienti..." value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} className="mt-1.5" rows={2} /></div>
            <div className="border-t pt-4">
              <Label className="mb-3 block font-semibold text-sm">Artikujt / Shërbimet</Label>
              <InvoiceLineItems items={form.items} onChange={(items) => setForm({ ...form, items })} />
            </div>
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 space-y-3 text-sm border border-primary/10">
              <div className="flex justify-between"><span className="text-muted-foreground font-medium">Subtotal (pa TVSH)</span><span className="font-semibold text-base">€{calcTotals(form.items).subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground font-medium">TVSH</span><span className="font-semibold text-base">€{calcTotals(form.items).vat_amount.toFixed(2)}</span></div>
              <div className="border-t border-primary/20 pt-3 flex justify-between"><span className="font-bold">Total me TVSH</span><span className="font-bold text-lg text-primary">€{calcTotals(form.items).amount.toFixed(2)}</span></div>
            </div>
            <div><Label>Shënime</Label><Textarea placeholder="Shënime opsionale..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditInvoice(null); setForm(emptyForm()); }}>Anulo</Button>
            <Button onClick={handleUpdate} disabled={submitting || !form.client_name}>{submitting ? "Duke ruajtur..." : "Ruaj Ndryshimet"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <SendInvoiceDialog invoice={sendDialog} open={!!sendDialog} onClose={() => setSendDialog(null)} />
      <MergePDFDialog invoices={invoices} open={mergePDFOpen} onClose={() => setMergePDFOpen(false)} />

      {/* Payment Dialog */}
      <PaymentDialog invoice={paymentDialog} isOpen={!!paymentDialog} onOpenChange={(o) => { if (!o) setPaymentDialog(null); }} onPaymentAdded={loadData} />
    </div>
  );
}