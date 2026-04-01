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
  items: [{ type: "service", name: "", quantity: 1, unit: "cope", price_ex_vat: 0, vat_rate: 20, price_inc_vat: 0, line_total: 0 }],
});
    toast.success("Kujtesa u dërgua");
  };

  const openEdit = (inv) => {
    setForm({
      invoice_type: inv.invoice_type || "standard",
      client_name: inv.client_name || "",
      client_email: inv.client_email || "",
      client_phone: inv.client_phone || "",
      payment_method: inv.payment_method || "cash",
      due_date: inv.due_date || "",
      description: inv.description || "",
      items: inv.items || [],
    });
    setEditInvoice(inv);
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