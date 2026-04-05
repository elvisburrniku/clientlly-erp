import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Trash2, MoreHorizontal, Download, Pencil, Search, FileText, TrendingUp } from "lucide-react";
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
  bill_id: "",
  bill_number: "",
  supplier_name: "",
  supplier_email: "",
  supplier_phone: "",
  reason: "",
  items: [{ type: "service", name: "", quantity: 1, unit: "cope", price_ex_vat: 0, vat_rate: 20, price_inc_vat: 0, line_total: 0 }],
});

const statusConfig = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-700" },
  issued: { label: "Lëshuar", cls: "bg-blue-100 text-blue-700" },
  applied: { label: "Aplikuar", cls: "bg-green-100 text-green-700" },
};

export default function DebitNotes() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [bills, setBills] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [user, data, billsData] = await Promise.all([
      base44.auth.me(),
      base44.entities.DebitNote.list("-created_date", 100),
      base44.entities.Bill.list("-created_date", 100),
    ]);
    setCurrentUser(user);
    setNotes(data);
    setBills(billsData);
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

  const fillFromBill = (billId) => {
    const bill = bills.find(b => b.id === billId);
    if (bill) {
      setForm(prev => ({
        ...prev,
        bill_id: bill.id,
        bill_number: bill.bill_number,
        supplier_name: bill.supplier_name,
        supplier_email: bill.supplier_email || "",
        supplier_phone: bill.supplier_phone || "",
      }));
    }
  };

  const handleCreate = async () => {
    if (!form.supplier_name || form.items.length === 0) return;
    setSubmitting(true);
    const { subtotal, vat_amount, amount } = calcTotals(form.items);
    const dnNumber = `DN-${Date.now().toString(36).toUpperCase()}`;
    await base44.entities.DebitNote.create({
      tenant_id: tenantId,
      debit_note_number: dnNumber,
      bill_id: form.bill_id || undefined,
      bill_number: form.bill_number || undefined,
      supplier_name: form.supplier_name,
      supplier_email: form.supplier_email,
      supplier_phone: form.supplier_phone,
      reason: form.reason,
      items: form.items,
      subtotal, vat_amount, amount,
      status: "draft",
      issued_by: currentUser?.email,
    });
    setDialogOpen(false);
    setForm(emptyForm());
    setSubmitting(false);
    toast.success("Nota debitore u krijua");
    loadData();
  };

  const handleUpdate = async () => {
    if (!editNote) return;
    setSubmitting(true);
    const { subtotal, vat_amount, amount } = calcTotals(form.items);
    await base44.entities.DebitNote.update(editNote.id, {
      supplier_name: form.supplier_name,
      supplier_email: form.supplier_email,
      supplier_phone: form.supplier_phone,
      reason: form.reason,
      items: form.items,
      subtotal, vat_amount, amount,
    });
    setEditNote(null);
    setForm(emptyForm());
    setSubmitting(false);
    toast.success("Nota debitore u përditësua");
    loadData();
  };

  const handleDelete = async (note) => {
    if (!window.confirm(`Fshi notën debitore ${note.debit_note_number}?`)) return;
    await base44.entities.DebitNote.delete(note.id);
    toast.success("Nota debitore u fshi");
    loadData();
  };

  const generatePDF = (note) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210; const margin = 14;
    doc.setFillColor(234, 88, 12);
    doc.rect(0, 0, W, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("NOTË DEBITORE", margin, 13);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(note.debit_note_number || "", margin, 22);
    doc.text(`Data: ${moment(note.created_date || note.created_at).format("DD/MM/YYYY")}`, W - margin, 22, { align: "right" });

    let y = 42;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("Furnitori:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(note.supplier_name || "", margin + 22, y);
    y += 7;
    if (note.bill_number) {
      doc.setFont("helvetica", "bold");
      doc.text("Ref. Faturë:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(note.bill_number, margin + 28, y);
      y += 7;
    }
    if (note.reason) {
      doc.setFont("helvetica", "bold");
      doc.text("Arsyeja:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(note.reason.slice(0, 80), margin + 20, y);
      y += 7;
    }
    y += 5;
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text(`Total: €${(note.amount || 0).toFixed(2)}`, W - margin, y, { align: "right" });
    doc.save(`nota_debitore_${note.debit_note_number || "draft"}.pdf`);
  };

  const openEdit = (note) => {
    setEditNote(note);
    setForm({
      bill_id: note.bill_id || "",
      bill_number: note.bill_number || "",
      supplier_name: note.supplier_name || "",
      supplier_email: note.supplier_email || "",
      supplier_phone: note.supplier_phone || "",
      reason: note.reason || "",
      items: note.items || [],
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const filtered = notes.filter(n => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return n.supplier_name?.toLowerCase().includes(q) || n.debit_note_number?.toLowerCase().includes(q);
  });

  const totalAmount = filtered.reduce((s, n) => s + (n.amount || 0), 0);
  const formTotals = calcTotals(form.items);

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxhimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Nota Debitore</h1>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setEditNote(null); setDialogOpen(true); }} className="gap-2 rounded-xl" data-testid="button-new-debit-note">
          <Plus className="w-4 h-4" /> Notë e Re
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-indigo-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-indigo-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total</p></div>
            <p className="text-2xl font-bold">{filtered.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">nota debitore</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-orange-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-orange-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vlera Totale</p></div>
            <p className="text-2xl font-bold text-orange-600">€{totalAmount.toLocaleString('en', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Kërko..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 rounded-xl" data-testid="input-search-debit-notes" />
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Nr.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Furnitori</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Ref. Faturë</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Shuma</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Statusi</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Data</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-12">Asnjë notë debitore</td></tr>
            ) : filtered.map((note) => {
              const sc = statusConfig[note.status] || statusConfig.draft;
              return (
                <tr key={note.id} className="border-b border-border last:border-0 hover:bg-muted/20" data-testid={`row-debit-note-${note.id}`}>
                  <td className="px-4 py-3 font-medium">{note.debit_note_number}</td>
                  <td className="px-4 py-3">{note.supplier_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{note.bill_number || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-orange-600">€{(note.amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", sc.cls)}>{sc.label}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{moment(note.created_date || note.created_at).format("DD/MM/YYYY")}</td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => generatePDF(note)}><Download className="w-4 h-4 mr-2" /> Shkarko PDF</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(note)}><Pencil className="w-4 h-4 mr-2" /> Ndrysho</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(note)}><Trash2 className="w-4 h-4 mr-2" /> Fshi</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen || !!editNote} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditNote(null); setForm(emptyForm()); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editNote ? "Ndrysho Notën Debitore" : "Notë Debitore e Re"}</DialogTitle>
            <DialogDescription>Plotësoni detajet e notës debitore</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editNote && (
              <div>
                <Label>Referenca e Faturës Blerëse (opsionale)</Label>
                <Select value={form.bill_id} onValueChange={(v) => fillFromBill(v)}>
                  <SelectTrigger><SelectValue placeholder="Zgjidh faturën blerëse..." /></SelectTrigger>
                  <SelectContent>
                    {bills.map(bill => (
                      <SelectItem key={bill.id} value={bill.id}>{bill.bill_number} - {bill.supplier_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Emri i Furnitorit *</Label>
                <Input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} data-testid="input-debit-note-supplier" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.supplier_email} onChange={e => setForm({ ...form, supplier_email: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Arsyeja</Label>
              <Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Arsyeja e notës debitore..." />
            </div>
            <div>
              <Label>Artikujt</Label>
              <InvoiceLineItems items={form.items} onChange={(items) => setForm({ ...form, items })} />
            </div>
            <div className="flex justify-end gap-4 text-sm">
              <span>Subtotal: <b>€{formTotals.subtotal.toFixed(2)}</b></span>
              <span>TVSH: <b>€{formTotals.vat_amount.toFixed(2)}</b></span>
              <span>Total: <b className="text-orange-600">€{formTotals.amount.toFixed(2)}</b></span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditNote(null); setForm(emptyForm()); }}>Anulo</Button>
            <Button onClick={editNote ? handleUpdate : handleCreate} disabled={submitting} data-testid="button-save-debit-note">
              {submitting ? "Duke ruajtur..." : editNote ? "Ruaj Ndryshimet" : "Krijo Notën"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
