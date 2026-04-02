import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Bell, MoreHorizontal, SlidersHorizontal, X, Download, FileSpreadsheet, Search } from "lucide-react";
import { Sheet, SheetContent, SheetClose, SheetTrigger } from "@/components/ui/sheet";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const emptyForm = () => ({
  invoice_id: "",
  client_name: "",
  client_email: "",
  invoice_number: "",
  due_date: "",
  amount: 0,
  reminder_type: "before_due",
  days_before: 3,
  is_active: true,
});

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterInvoice, setFilterInvoice] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [showClientDrop, setShowClientDrop] = useState(false);
  const [showInvoiceDrop, setShowInvoiceDrop] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [remindersData, invoicesData] = await Promise.all([
        base44.entities.Reminder.list("-created_date", 100),
        base44.entities.Invoice.list("-created_date", 100),
      ]);
      setReminders(remindersData);
      setInvoices(invoicesData);
    } catch (err) {
      console.error("Load error:", err);
    }
    setLoading(false);
  };

  const handleInvoiceSelect = (invoiceId) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;
    setForm({
      ...form,
      invoice_id: inv.id,
      client_name: inv.client_name,
      client_email: inv.client_email,
      invoice_number: inv.invoice_number,
      due_date: inv.due_date || "",
      amount: inv.amount || 0,
    });
  };

  const handleCreate = async () => {
    if (!form.invoice_id || !form.client_email || !form.due_date) {
      toast.error("Plotësoni të gjitha fushat");
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.Reminder.create(form);
      toast.success("Kujtesa u shtua");
      setForm(emptyForm());
      setDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error("Gabim në ruajtje");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Fshi këtë kujtesë?")) return;
    try {
      await base44.entities.Reminder.delete(id);
      toast.success("Kujtesa u fshi");
      loadData();
    } catch (err) {
      toast.error("Gabim në fshirje");
    }
  };

  const handleToggle = async (id, isActive) => {
    try {
      await base44.entities.Reminder.update(id, { is_active: !isActive });
      toast.success(isActive ? "Kujtesa u çaktivizua" : "Kujtesa u aktivizua");
      loadData();
    } catch (err) {
      toast.error("Gabim");
    }
  };

  const filtered = reminders.filter(r => {
    if (filterType && r.reminder_type !== filterType) return false;
    if (filterClient && r.client_name !== filterClient) return false;
    if (filterInvoice && r.invoice_number !== filterInvoice) return false;
    return true;
  });

  const hasFilters = filterType || filterClient || filterInvoice;
  const activeFilterCount = [filterType, filterClient, filterInvoice].filter(Boolean).length;
  const clearFilters = () => { setFilterType(""); setFilterClient(""); setFilterInvoice(""); setClientQuery(""); setInvoiceQuery(""); };

  const uniqueClients = [...new Set(reminders.map(r => r.client_name).filter(Boolean))];
  const uniqueInvoices = [...new Set(reminders.map(r => r.invoice_number).filter(Boolean))];

  const filteredClientSuggestions = clientQuery ? uniqueClients.filter(c => c.toLowerCase().includes(clientQuery.toLowerCase())) : uniqueClients.slice(0, 8);
  const filteredInvoiceSuggestions = invoiceQuery ? uniqueInvoices.filter(i => i.toLowerCase().includes(invoiceQuery.toLowerCase())) : uniqueInvoices.slice(0, 8);

  const exportExcel = () => {
    const headers = ["Fatura", "Klienti", "Email", "Afati", "Shuma", "Lloji", "Statusi"];
    const rows = filtered.map(r => [
      r.invoice_number, r.client_name, r.client_email,
      moment(r.due_date).format("DD MMM YYYY"),
      (r.amount || 0).toFixed(2),
      r.reminder_type === "before_due" ? `${r.days_before || 3}d para` : typeLabels[r.reminder_type],
      r.is_active ? "Aktiv" : "Joaktiv",
    ]);
    const html = `<html><head><meta charset="UTF-8"></head><body><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `kujtesat_${new Date().toISOString().slice(0,10)}.xls`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210; const H = 297; const margin = 14; const cw = W - margin * 2;
    doc.setFillColor(67,56,202); doc.rect(0,0,W,38,"F");
    doc.setTextColor(255,255,255); doc.setFontSize(18); doc.setFont("helvetica","bold");
    doc.text("KUJTESAT PËR PAGESA", margin, 18);
    doc.setFontSize(8); doc.setFont("helvetica","normal");
    doc.text("Gjeneruar: " + new Date().toLocaleDateString("sq-AL"), margin, 28);
    let y = 50;
    doc.setFillColor(67,56,202); doc.rect(margin,y-4,cw,8,"F");
    doc.setTextColor(255,255,255); doc.setFontSize(8); doc.setFont("helvetica","bold");
    doc.text("Fatura", margin+2, y+1); doc.text("Klienti", margin+30, y+1);
    doc.text("Afati", margin+90, y+1); doc.text("Shuma", margin+120, y+1);
    doc.text("Lloji", margin+145, y+1); doc.text("Statusi", margin+170, y+1);
    y += 10;
    doc.setFont("helvetica","normal"); doc.setFontSize(8);
    filtered.forEach((r, ri) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (ri % 2 === 0) { doc.setFillColor(245,247,255); doc.rect(margin,y-4,cw,7,"F"); }
      doc.setTextColor(40,40,40);
      doc.text((r.invoice_number||"—").slice(0,12), margin+2, y);
      doc.text((r.client_name||"—").slice(0,28), margin+30, y);
      doc.text(moment(r.due_date).format("DD MMM YY"), margin+90, y);
      doc.text("\u20ac"+(r.amount||0).toFixed(2), margin+120, y);
      doc.text(r.reminder_type==="before_due" ? `${r.days_before||3}d para` : (typeLabels[r.reminder_type]||"—"), margin+145, y);
      doc.setTextColor(r.is_active ? 22 : 150, r.is_active ? 163 : 150, r.is_active ? 74 : 150);
      doc.text(r.is_active ? "Aktiv" : "Joaktiv", margin+170, y);
      y += 7;
    });
    doc.setFillColor(67,56,202); doc.rect(0,H-14,W,14,"F");
    doc.setTextColor(255,255,255); doc.setFontSize(7); doc.setFont("helvetica","normal");
    doc.text("Ky dokument u gjenerua automatikisht.", W/2, H-6, { align: "center" });
    doc.save(`kujtesat_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const typeLabels = { before_due: "Para afatit", on_due: "Në afatin", after_due: "Pas afatit" };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxhimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Kujtesat për Pagesat</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportExcel} className="gap-2"><FileSpreadsheet className="w-4 h-4" /> Excel</Button>
          <Button variant="outline" onClick={exportPDF} className="gap-2"><Download className="w-4 h-4" /> PDF</Button>
          <Button onClick={() => { setForm(emptyForm()); setDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Shto Kujtesë
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Kujtesat Aktive</p>
          <p className="text-2xl font-bold mt-1">{reminders.filter(r => r.is_active).length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">të aktivizuara</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej Kujtesash</p>
          <p className="text-2xl font-bold mt-1">{reminders.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">regjistrime</p>
        </div>
      </div>

      {/* Filter */}
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
                <p className="text-xs text-muted-foreground mt-0.5">{hasFilters ? `${activeFilterCount} filtr aktiv` : "Filtro kujtesat"}</p>
              </div>
            </div>
            <SheetClose className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition"><X className="h-4 w-4" /></SheetClose>
          </div>
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="px-6 pt-6 pb-5 space-y-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">Kërkim</span>
              {/* Client dropdown */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Klienti</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="text" placeholder="Kërko klientin..." value={filterClient || clientQuery}
                    onChange={e => { setClientQuery(e.target.value); setFilterClient(""); setShowClientDrop(true); }}
                    onFocus={() => setShowClientDrop(true)}
                    onBlur={() => setTimeout(() => setShowClientDrop(false), 150)}
                    className="w-full pl-10 pr-9 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  {(filterClient || clientQuery) && <button onMouseDown={e => { e.preventDefault(); setFilterClient(""); setClientQuery(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
                  {showClientDrop && filteredClientSuggestions.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {filteredClientSuggestions.map(c => {
                        const reminder = reminders.find(r => r.client_name === c);
                        const typeMap = { before_due: { label: "Para", cls: "bg-blue-100 text-blue-700" }, on_due: { label: "Afat", cls: "bg-amber-100 text-amber-700" }, after_due: { label: "Pas", cls: "bg-red-100 text-red-700" } };
                        const badge = typeMap[reminder?.reminder_type] || { label: "K", cls: "bg-slate-100 text-slate-600" };
                        return (
                          <button key={c} onMouseDown={() => { setFilterClient(c); setClientQuery(c); setShowClientDrop(false); }}
                            className={cn("w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 transition flex items-center gap-3", filterClient === c && "bg-primary/10 font-semibold text-primary")}>
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", badge.cls)}>{badge.label}</span>
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {/* Invoice dropdown */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Numri i Faturës</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="text" placeholder="Kërko faturën..." value={filterInvoice || invoiceQuery}
                    onChange={e => { setInvoiceQuery(e.target.value); setFilterInvoice(""); setShowInvoiceDrop(true); }}
                    onFocus={() => setShowInvoiceDrop(true)}
                    onBlur={() => setTimeout(() => setShowInvoiceDrop(false), 150)}
                    className="w-full pl-10 pr-9 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  {(filterInvoice || invoiceQuery) && <button onMouseDown={e => { e.preventDefault(); setFilterInvoice(""); setInvoiceQuery(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
                  {showInvoiceDrop && filteredInvoiceSuggestions.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {filteredInvoiceSuggestions.map(i => {
                        const rem = reminders.find(r => r.invoice_number === i);
                        return (
                          <button key={i} onMouseDown={() => { setFilterInvoice(i); setInvoiceQuery(i); setShowInvoiceDrop(false); }}
                            className={cn("w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 transition flex items-center gap-3", filterInvoice === i && "bg-primary/10 font-semibold text-primary")}>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-violet-100 text-violet-700">F</span>
                            <span className="flex-1">{i}</span>
                            {rem?.client_name && <span className="text-xs text-muted-foreground truncate max-w-[100px]">{rem.client_name}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="h-px bg-border mx-6" />
            <div className="px-6 pt-5 pb-5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-3">Lloji</span>
              <div className="flex bg-muted rounded-xl p-1">
                {[["","Të gjitha"],["before_due","Para afatit"],["on_due","Në afatin"],["after_due","Pas afatit"]].map(([v,l]) => (
                  <button key={v} onClick={() => setFilterType(v)}
                    className={cn("flex-1 px-2 py-1.5 text-xs font-semibold rounded-lg transition-all",
                      filterType === v ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l}</button>
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
          <p className="font-semibold text-sm">{filtered.length} kujtesa{hasFilters ? " (filtruara)" : ""}</p>
          {hasFilters && <button onClick={clearFilters} className="px-3 py-1 text-xs font-semibold rounded-lg border border-destructive/40 text-destructive hover:bg-destructive hover:text-white transition-all">✕ Pastro</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Nr. Rendor</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Fatura</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Data Faturës</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Klienti</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Email</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Afati</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Shuma</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Lloji</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Statusi</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Nuk ka kujtesa</p>
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 text-sm text-muted-foreground font-medium">{idx + 1}</td>
                    <td className="px-6 py-4"><span className="text-sm font-semibold text-primary">{r.invoice_number}</span></td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{invoices.find(i => i.id === r.invoice_id)?.created_date ? moment(invoices.find(i => i.id === r.invoice_id).created_date).format("DD MMM YY") : "—"}</td>
                    <td className="px-6 py-4 text-sm">{r.client_name}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{r.client_email}</td>
                    <td className="px-6 py-4 text-sm">{moment(r.due_date).format("DD MMM YY")}</td>
                    <td className="px-6 py-4 text-sm font-medium">€{(r.amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium bg-muted px-2.5 py-1 rounded-full">
                        {r.reminder_type === "before_due" ? `${r.days_before || 3}d para` : typeLabels[r.reminder_type]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                        {r.is_active ? "Aktiv" : "Joaktiv"}
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
                          <DropdownMenuItem onClick={() => handleToggle(r.id, r.is_active)}>
                            {r.is_active ? "Çaktivizo" : "Aktivizo"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(r.id)} className="text-destructive focus:text-destructive">
                            Fshi
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
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) setForm(emptyForm()); setDialogOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Shto Kujtesë të Re</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Zgjedh Faturën *</Label>
              <Select value={form.invoice_id} onValueChange={handleInvoiceSelect}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Zgjedh faturën..." /></SelectTrigger>
                <SelectContent>
                  {invoices.filter(i => i.is_open !== false).map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoice_number} - {inv.client_name} (€{inv.amount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.invoice_id && (
              <>
                <div>
                  <Label>Klienti *</Label>
                  <Input disabled value={form.client_name} className="mt-1.5" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input disabled value={form.client_email} className="mt-1.5" />
                </div>
                <div>
                  <Label>Lloji i Kujtesës</Label>
                  <Select value={form.reminder_type} onValueChange={(v) => setForm({ ...form, reminder_type: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="before_due">Para afatit</SelectItem>
                      <SelectItem value="on_due">Në afatin</SelectItem>
                      <SelectItem value="after_due">Pas afatit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.reminder_type === "before_due" && (
                  <div>
                    <Label>Ditë Para Afatit</Label>
                    <Input type="number" value={form.days_before} onChange={(e) => setForm({ ...form, days_before: parseInt(e.target.value) || 3 })} className="mt-1.5" min="1" />
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setForm(emptyForm()); setDialogOpen(false); }}>Anulo</Button>
            <Button onClick={handleCreate} disabled={submitting}>{submitting ? "Duke ruajtur..." : "Shto Kujtesë"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}