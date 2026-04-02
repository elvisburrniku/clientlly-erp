import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Bell, MoreHorizontal } from "lucide-react";
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
        <Button onClick={() => { setForm(emptyForm()); setDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Shto Kujtesë
        </Button>
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-semibold text-sm">{reminders.length} kujtesash</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
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
              {reminders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Asnjë kujtesë të regjistruar</p>
                  </td>
                </tr>
              ) : (
                reminders.map(r => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
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