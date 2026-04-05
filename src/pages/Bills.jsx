import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Trash2, MoreHorizontal, Download, Pencil, Search, Copy, Banknote, FileText, CheckCircle } from "lucide-react";
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

const emptyForm = () => ({
  supplier_name: "",
  supplier_email: "",
  supplier_phone: "",
  supplier_nipt: "",
  supplier_address: "",
  payment_method: "bank",
  due_date: "",
  description: "",
  items: [{ type: "service", name: "", quantity: 1, unit: "cope", price_ex_vat: 0, vat_rate: 20, price_inc_vat: 0, line_total: 0 }],
});

const statusConfig = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-700" },
  received: { label: "Marrë", cls: "bg-blue-100 text-blue-700" },
  partially_paid: { label: "Pjesërisht", cls: "bg-amber-100 text-amber-700" },
  paid: { label: "Paguar", cls: "bg-green-100 text-green-700" },
  overdue: { label: "Vonuar", cls: "bg-red-100 text-red-700" },
};

export default function Bills() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [editBill, setEditBill] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [paymentDialog, setPaymentDialog] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [user, data, supps] = await Promise.all([
      base44.auth.me(),
      base44.entities.Bill.list("-created_date", 100),
      base44.entities.Supplier.list("-created_date", 100),
    ]);
    setCurrentUser(user);
    setBills(data);
    setSuppliers(supps);
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

  const fillSupplierData = (supplierId) => {
    const s = suppliers.find(x => x.id === supplierId);
    if (s) {
      setForm(prev => ({
        ...prev,
        supplier_name: s.name,
        supplier_email: s.email || "",
        supplier_phone: s.phone || "",
        supplier_nipt: s.nuis || "",
        supplier_address: s.address || "",
      }));
    }
  };

  const handleCreate = async () => {
    if (!form.supplier_name || form.items.length === 0) return;
    setSubmitting(true);
    const { subtotal, vat_amount, amount } = calcTotals(form.items);
    const billNumber = `BILL-${Date.now().toString(36).toUpperCase()}`;
    await base44.entities.Bill.create({
      tenant_id: tenantId,
      bill_number: billNumber,
      supplier_name: form.supplier_name,
      supplier_email: form.supplier_email,
      supplier_phone: form.supplier_phone,
      supplier_nipt: form.supplier_nipt || undefined,
      supplier_address: form.supplier_address || undefined,
      items: form.items,
      subtotal, vat_amount, amount,
      paid_amount: 0,
      payment_method: form.payment_method,
      due_date: form.due_date || undefined,
      description: form.description,
      status: "draft",
      is_open: true,
      issued_by: currentUser?.email,
    });
    setDialogOpen(false);
    setForm(emptyForm());
    setSubmitting(false);
    toast.success("Fatura blerëse u krijua");
    loadData();
  };

  const handleUpdate = async () => {
    if (!editBill) return;
    setSubmitting(true);
    const { subtotal, vat_amount, amount } = calcTotals(form.items);
    await base44.entities.Bill.update(editBill.id, {
      supplier_name: form.supplier_name,
      supplier_email: form.supplier_email,
      supplier_phone: form.supplier_phone,
      supplier_nipt: form.supplier_nipt,
      supplier_address: form.supplier_address,
      items: form.items,
      subtotal, vat_amount, amount,
      payment_method: form.payment_method,
      due_date: form.due_date || undefined,
      description: form.description,
    });
    setEditBill(null);
    setForm(emptyForm());
    setSubmitting(false);
    toast.success("Fatura blerëse u përditësua");
    loadData();
  };

  const handleDelete = async (bill) => {
    if (!window.confirm(`Fshi faturën blerëse ${bill.bill_number}?`)) return;
    await base44.entities.Bill.delete(bill.id);
    toast.success("Fatura blerëse u fshi");
    loadData();
  };

  const handleDuplicate = async (bill) => {
    const billNumber = `BILL-${Date.now().toString(36).toUpperCase()}`;
    const copy = {
      tenant_id: tenantId,
      bill_number: billNumber,
      supplier_name: bill.supplier_name,
      supplier_email: bill.supplier_email,
      supplier_phone: bill.supplier_phone,
      supplier_nipt: bill.supplier_nipt,
      supplier_address: bill.supplier_address,
      items: bill.items,
      subtotal: bill.subtotal,
      vat_amount: bill.vat_amount,
      amount: bill.amount,
      paid_amount: 0,
      payment_method: bill.payment_method,
      due_date: bill.due_date,
      description: bill.description,
      status: "draft",
      is_open: true,
      issued_by: currentUser?.email,
    };
    await base44.entities.Bill.create(copy);
    toast.success("Fatura blerëse u dyfishua");
    loadData();
  };

  const handleRecordPayment = async () => {
    if (!paymentDialog || !paymentAmount || parseFloat(paymentAmount) <= 0) return;
    const bill = paymentDialog;
    const amt = parseFloat(paymentAmount);
    const records = bill.payment_records || [];
    records.push({ amount: amt, method: paymentMethod, date: new Date().toISOString(), recorded_by: currentUser?.email });
    const totalPaid = records.reduce((s, r) => s + r.amount, 0);
    const newStatus = totalPaid >= (bill.amount || 0) ? "paid" : "partially_paid";
    await base44.entities.Bill.update(bill.id, {
      payment_records: records,
      paid_amount: totalPaid,
      status: newStatus,
      is_open: newStatus !== "paid",
    });
    setPaymentDialog(null);
    setPaymentAmount("");
    toast.success(`Pagesa €${amt.toFixed(2)} u regjistrua`);
    loadData();
  };

  const handleStatusChange = async (bill, newStatus) => {
    await base44.entities.Bill.update(bill.id, { status: newStatus });
    toast.success(`Statusi ndryshoi në ${newStatus}`);
    loadData();
  };

  const generatePDF = (bill) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210; const margin = 14;
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, W, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("FATURË BLERËSE", margin, 13);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(bill.bill_number || "", margin, 22);
    doc.text(`Data: ${moment(bill.created_date || bill.created_at).format("DD/MM/YYYY")}`, W - margin, 22, { align: "right" });

    let y = 42;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("Furnitori:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(bill.supplier_name || "", margin + 22, y);
    y += 7;
    if (bill.supplier_nipt) { doc.text(`NIPT: ${bill.supplier_nipt}`, margin, y); y += 7; }

    y += 5;
    const items = bill.items || [];
    if (items.length > 0) {
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y - 4, W - margin * 2, 8, "F");
      doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 100, 100);
      const headers = ["Përshkrimi", "Sasi", "Çmimi", "TVSH%", "Total"];
      const colW = [70, 20, 25, 20, 25];
      let x = margin;
      headers.forEach((h, i) => { doc.text(h, x + 2, y); x += colW[i]; });
      y += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(30, 30, 30);
      items.forEach((item) => {
        let x = margin;
        const row = [item.name || "", String(item.quantity || 0), `€${(item.price_ex_vat || 0).toFixed(2)}`, `${item.vat_rate || 0}%`, `€${(item.line_total || 0).toFixed(2)}`];
        row.forEach((v, i) => { doc.text(v, x + 2, y); x += colW[i]; });
        y += 7;
      });
    }

    y += 5;
    doc.setFontSize(9);
    doc.text(`Subtotal: €${(bill.subtotal || 0).toFixed(2)}`, W - margin, y, { align: "right" }); y += 5;
    doc.text(`TVSH: €${(bill.vat_amount || 0).toFixed(2)}`, W - margin, y, { align: "right" }); y += 5;
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text(`Total: €${(bill.amount || 0).toFixed(2)}`, W - margin, y, { align: "right" });

    doc.save(`fatura_blerese_${bill.bill_number || "draft"}.pdf`);
  };

  const openEdit = (bill) => {
    setEditBill(bill);
    setForm({
      supplier_name: bill.supplier_name || "",
      supplier_email: bill.supplier_email || "",
      supplier_phone: bill.supplier_phone || "",
      supplier_nipt: bill.supplier_nipt || "",
      supplier_address: bill.supplier_address || "",
      payment_method: bill.payment_method || "bank",
      due_date: bill.due_date || "",
      description: bill.description || "",
      items: bill.items || [],
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const filtered = bills.filter(b => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!b.supplier_name?.toLowerCase().includes(q) && !b.bill_number?.toLowerCase().includes(q)) return false;
    }
    if (statusFilter && statusFilter !== "all" && b.status !== statusFilter) return false;
    return true;
  });

  const totalAmount = filtered.reduce((s, b) => s + (b.amount || 0), 0);
  const totalPaid = filtered.reduce((s, b) => s + (b.paid_amount || 0), 0);
  const formTotals = calcTotals(form.items);

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxhimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Faturat Blerëse</h1>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setEditBill(null); setDialogOpen(true); }} className="gap-2 rounded-xl" data-testid="button-new-bill">
          <Plus className="w-4 h-4" /> Faturë e Re
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-indigo-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-indigo-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total Fatura</p></div>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-blue-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><Banknote className="w-4 h-4 text-blue-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vlera Totale</p></div>
            <p className="text-2xl font-bold text-blue-600">€{totalAmount.toLocaleString('en', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-emerald-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-emerald-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">E Paguar</p></div>
            <p className="text-2xl font-bold text-green-600">€{totalPaid.toLocaleString('en', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Kërko furnitor ose nr..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 rounded-xl" data-testid="input-search-bills" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Të gjithë statuset" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjithë</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="received">Marrë</SelectItem>
            <SelectItem value="partially_paid">Pjesërisht</SelectItem>
            <SelectItem value="paid">Paguar</SelectItem>
            <SelectItem value="overdue">Vonuar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Nr.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Furnitori</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Shuma</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Paguar</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Statusi</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Afati</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Data</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-muted-foreground py-12">Asnjë faturë blerëse</td></tr>
            ) : filtered.map((bill) => {
              const sc = statusConfig[bill.status] || statusConfig.draft;
              return (
                <tr key={bill.id} className="border-b border-border last:border-0 hover:bg-muted/20" data-testid={`row-bill-${bill.id}`}>
                  <td className="px-4 py-3 font-medium">{bill.bill_number}</td>
                  <td className="px-4 py-3">{bill.supplier_name}</td>
                  <td className="px-4 py-3 text-right font-semibold">€{(bill.amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-green-600">€{(bill.paid_amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", sc.cls)}>{sc.label}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{bill.due_date || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{moment(bill.created_date || bill.created_at).format("DD/MM/YYYY")}</td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPaymentDialog(bill)}><Banknote className="w-4 h-4 mr-2" /> Regjistro Pagesë</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generatePDF(bill)}><Download className="w-4 h-4 mr-2" /> Shkarko PDF</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(bill)}><Pencil className="w-4 h-4 mr-2" /> Ndrysho</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(bill)}><Copy className="w-4 h-4 mr-2" /> Dyfisho</DropdownMenuItem>
                        {bill.status === "draft" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(bill, "received")}>Shëno si Marrë</DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(bill)}><Trash2 className="w-4 h-4 mr-2" /> Fshi</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen || !!editBill} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditBill(null); setForm(emptyForm()); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editBill ? "Ndrysho Faturën Blerëse" : "Faturë Blerëse e Re"}</DialogTitle>
            <DialogDescription>Plotësoni detajet e faturës blerëse</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editBill && suppliers.length > 0 && (
              <div>
                <Label>Zgjidh Furnitorin</Label>
                <Select onValueChange={(v) => fillSupplierData(v)}>
                  <SelectTrigger><SelectValue placeholder="Zgjidh furnitorin..." /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Emri i Furnitorit *</Label>
                <Input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} data-testid="input-bill-supplier" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.supplier_email} onChange={e => setForm({ ...form, supplier_email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>NIPT</Label>
                <Input value={form.supplier_nipt} onChange={e => setForm({ ...form, supplier_nipt: e.target.value })} />
              </div>
              <div>
                <Label>Afati i Pagesës</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Metoda e Pagesës</Label>
                <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bankë</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Kartë</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Përshkrimi</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Artikujt</Label>
              <InvoiceLineItems items={form.items} onChange={(items) => setForm({ ...form, items })} />
            </div>
            <div className="flex justify-end gap-4 text-sm">
              <span>Subtotal: <b>€{formTotals.subtotal.toFixed(2)}</b></span>
              <span>TVSH: <b>€{formTotals.vat_amount.toFixed(2)}</b></span>
              <span>Total: <b className="text-primary">€{formTotals.amount.toFixed(2)}</b></span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditBill(null); setForm(emptyForm()); }}>Anulo</Button>
            <Button onClick={editBill ? handleUpdate : handleCreate} disabled={submitting} data-testid="button-save-bill">
              {submitting ? "Duke ruajtur..." : editBill ? "Ruaj Ndryshimet" : "Krijo Faturën"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!paymentDialog} onOpenChange={(open) => { if (!open) setPaymentDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Regjistro Pagesë</DialogTitle>
            <DialogDescription>
              Fatura: {paymentDialog?.bill_number} — Total: €{(paymentDialog?.amount || 0).toFixed(2)} — Paguar: €{(paymentDialog?.paid_amount || 0).toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Shuma e Pagesës</Label>
              <Input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" data-testid="input-payment-amount" />
            </div>
            <div>
              <Label>Metoda</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bankë</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Kartë</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(null)}>Anulo</Button>
            <Button onClick={handleRecordPayment} data-testid="button-confirm-payment">Regjistro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {bills.some(b => b.payment_records && b.payment_records.length > 0) && (
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Historiku i Pagesave</h3>
          <div className="space-y-2">
            {bills.filter(b => b.payment_records && b.payment_records.length > 0).slice(0, 10).map(bill => (
              <div key={bill.id}>
                <p className="text-sm font-semibold mb-1">{bill.bill_number} — {bill.supplier_name}</p>
                {(bill.payment_records || []).map((p, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-muted-foreground ml-4 py-1">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    <span>€{p.amount.toFixed(2)}</span>
                    <span>{p.method}</span>
                    <span>{moment(p.date).format("DD/MM/YYYY HH:mm")}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
