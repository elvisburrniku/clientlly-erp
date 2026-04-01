import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [form, setForm] = useState({
    client_name: "",
    amount: "",
    description: "",
    payment_method: "cash",
    due_date: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [user, data] = await Promise.all([
      base44.auth.me(),
      base44.entities.Invoice.list("-created_date", 100),
    ]);
    setCurrentUser(user);
    setInvoices(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.client_name || !form.amount) return;
    setSubmitting(true);

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const newInvoice = {
      invoice_number: invoiceNumber,
      client_name: form.client_name,
      amount: parseFloat(form.amount),
      description: form.description,
      payment_method: form.payment_method,
      due_date: form.due_date || undefined,
      status: "draft",
      issued_by: currentUser.email,
    };

    await base44.entities.Invoice.create(newInvoice);

    // If paid by cash, add to user's cash_on_hand
    if (form.payment_method === "cash") {
      const users = await base44.entities.User.filter({ email: currentUser.email });
      if (users.length > 0) {
        const u = users[0];
        await base44.entities.User.update(u.id, {
          cash_on_hand: (u.cash_on_hand || 0) + parseFloat(form.amount),
        });
      }
    }

    setDialogOpen(false);
    setForm({ client_name: "", amount: "", description: "", payment_method: "cash", due_date: "" });
    setSubmitting(false);
    toast.success("Fatura u krijua me sukses");
    loadData();
  };

  const statusBadge = (status) => {
    const styles = {
      draft: "bg-muted text-muted-foreground",
      sent: "bg-primary/10 text-primary",
      paid: "bg-success/10 text-success",
      overdue: "bg-destructive/10 text-destructive",
      cancelled: "bg-muted text-muted-foreground",
    };
    const labels = { draft: "Draft", sent: "Dërguar", paid: "Paguar", overdue: "Vonuar", cancelled: "Anuluar" };
    return (
      <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", styles[status])}>
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
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Faturat</h1>
          <p className="text-sm text-muted-foreground mt-1">Menaxhimi i faturave</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Krijo Faturë
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Nr. Faturës</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Klienti</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Shuma</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Statusi</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Pagesa</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-sm text-muted-foreground py-12">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    Nuk ka fatura
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium">{inv.invoice_number}</td>
                    <td className="px-5 py-3.5 text-sm">{inv.client_name}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold">€{(inv.amount || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5">{statusBadge(inv.status)}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground capitalize">{inv.payment_method || "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{moment(inv.created_date).format("DD MMM YYYY")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Krijo Faturë të Re</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Klienti</Label>
              <Input
                placeholder="Emri i klientit"
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Shuma (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Metoda e pagesës</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Transfer Bankar</SelectItem>
                  <SelectItem value="card">Kartë</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Afati i pagesës</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Përshkrimi</Label>
              <Textarea
                placeholder="Përshkrim opsional..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleCreate} disabled={submitting || !form.client_name || !form.amount}>
              {submitting ? "Duke krijuar..." : "Krijo Faturë"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}