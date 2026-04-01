import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, FileText, Send, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";
import InvoiceLineItems from "../components/invoices/InvoiceLineItems";
import SendInvoiceDialog from "../components/invoices/SendInvoiceDialog";

const emptyForm = () => ({
  client_name: "",
  client_email: "",
  client_phone: "",
  payment_method: "cash",
  due_date: "",
  description: "",
  items: [{ type: "service", name: "", quantity: 1, unit: "cope", price_ex_vat: 0, vat_rate: 20, price_inc_vat: 0, line_total: 0 }],
});

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendDialog, setSendDialog] = useState(null); // invoice to send
  const [currentUser, setCurrentUser] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);

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

  const toggleOpen = async (inv) => {
    await base44.entities.Invoice.update(inv.id, { is_open: !inv.is_open });
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

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Faturat</h1>
          <p className="text-sm text-muted-foreground mt-1">{invoices.length} fatura gjithsej</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Krijo Faturë
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Nr. Faturës</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Klienti</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Subtotal</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">TVSH</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Total</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Statusi</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Hapur/Mbyllur</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Pagesa</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Afati</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Data</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Veprime</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center text-sm text-muted-foreground py-12">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    Nuk ka fatura
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-semibold text-primary">{inv.invoice_number}</td>
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-medium">{inv.client_name}</div>
                      {inv.client_email && <div className="text-xs text-muted-foreground">{inv.client_email}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">€{(inv.subtotal || 0).toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">€{(inv.vat_amount || 0).toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-foreground">€{(inv.amount || 0).toFixed(2)}</td>
                    <td className="px-5 py-3.5">{statusBadge(inv.status)}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => toggleOpen(inv)} className="flex items-center gap-1.5 text-xs font-medium">
                        {inv.is_open !== false ? (
                          <><ToggleRight className="w-5 h-5 text-emerald-500" /><span className="text-emerald-600">Hapur</span></>
                        ) : (
                          <><ToggleLeft className="w-5 h-5 text-muted-foreground" /><span className="text-muted-foreground">Mbyllur</span></>
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground capitalize">{inv.payment_method || "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{inv.due_date || "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{moment(inv.created_date).format("DD MMM YY")}</td>
                    <td className="px-5 py-3.5">
                      <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setSendDialog(inv)}>
                        <Send className="w-3 h-3" /> Dërgo
                      </Button>
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
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Krijo Faturë të Re</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Client info */}
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

            {/* Line items */}
            <div>
              <Label className="mb-2 block">Artikujt / Shërbimet</Label>
              <InvoiceLineItems
                items={form.items}
                onChange={(items) => setForm({ ...form, items })}
              />
            </div>

            {/* Totals */}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleCreate} disabled={submitting || !form.client_name || form.items.length === 0}>
              {submitting ? "Duke krijuar..." : "Krijo Faturë"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <SendInvoiceDialog invoice={sendDialog} open={!!sendDialog} onClose={() => setSendDialog(null)} />
    </div>
  );
}