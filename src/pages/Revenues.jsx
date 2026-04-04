import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Trash2, MoreHorizontal, Download, Pencil, Search, Sheet } from "lucide-react";
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

const emptyForm = () => ({
  title: "",
  description: "",
  amount: 0,
  category: "",
  source: "",
  revenue_date: new Date().toISOString().split("T")[0],
  payment_method: "bank",
  reference: "",
  notes: "",
});

export default function Revenues() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [revenues, setRevenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [editRevenue, setEditRevenue] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const data = await base44.entities.Revenue.list("-created_date", 200);
    setRevenues(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.title || form.amount <= 0) {
      toast.error("Plotësoni titullin dhe shumën");
      return;
    }
    setSubmitting(true);
    await base44.entities.Revenue.create({
      tenant_id: tenantId,
      title: form.title,
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category,
      source: form.source,
      revenue_date: form.revenue_date,
      payment_method: form.payment_method,
      reference: form.reference,
      notes: form.notes,
    });
    setDialogOpen(false);
    setForm(emptyForm());
    setSubmitting(false);
    toast.success("Të ardhura u shtuan");
    loadData();
  };

  const handleUpdate = async () => {
    if (!editRevenue) return;
    setSubmitting(true);
    await base44.entities.Revenue.update(editRevenue.id, {
      title: form.title,
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category,
      source: form.source,
      revenue_date: form.revenue_date,
      payment_method: form.payment_method,
      reference: form.reference,
      notes: form.notes,
    });
    setEditRevenue(null);
    setForm(emptyForm());
    setSubmitting(false);
    toast.success("Të ardhurat u përditësuan");
    loadData();
  };

  const handleDelete = async (rev) => {
    if (!window.confirm("Fshi këtë regjistrim?")) return;
    await base44.entities.Revenue.delete(rev.id);
    toast.success("Regjistrimi u fshi");
    loadData();
  };

  const openEdit = (rev) => {
    setEditRevenue(rev);
    setForm({
      title: rev.title || "",
      description: rev.description || "",
      amount: rev.amount || 0,
      category: rev.category || "",
      source: rev.source || "",
      revenue_date: rev.revenue_date || "",
      payment_method: rev.payment_method || "bank",
      reference: rev.reference || "",
      notes: rev.notes || "",
    });
  };

  const exportExcel = () => {
    const headers = ["Titulli", "Burimi", "Kategoria", "Shuma", "Data", "Metoda", "Referenca"];
    const rows = filtered.map(r => [
      r.title || "", r.source || "", r.category || "",
      (r.amount || 0).toFixed(2), r.revenue_date || "",
      r.payment_method || "", r.reference || "",
    ]);
    const html = `<html><head><meta charset="UTF-8"></head><body><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `te_ardhurat_${new Date().toISOString().slice(0, 10)}.xls`; a.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = 297; const margin = 14;
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, W, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Lista e Të Ardhurave", margin, 14);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Total: €${totalAmount.toFixed(2)}  |  ${filtered.length} regjistrime`, W - margin, 14, { align: "right" });

    const headers = ["Titulli", "Burimi", "Kategoria", "Shuma", "Data", "Metoda"];
    const colW = [55, 40, 35, 25, 25, 25];
    let x = margin; let y = 32;
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y - 5, W - margin * 2, 8, "F");
    doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 100, 100);
    headers.forEach((h, i) => { doc.text(h, x + 2, y); x += colW[i]; });
    y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    filtered.forEach((rev, ri) => {
      if (y > 185) { doc.addPage(); y = 20; }
      if (ri % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(margin, y - 4, W - margin * 2, 8, "F"); }
      doc.setTextColor(30, 30, 30);
      x = margin;
      const row = [(rev.title || "").slice(0, 28), (rev.source || "").slice(0, 20), (rev.category || "").slice(0, 18), `€${(rev.amount || 0).toFixed(2)}`, rev.revenue_date ? moment(rev.revenue_date).format("DD/MM/YY") : "—", rev.payment_method || "—"];
      row.forEach((v, i) => { doc.text(String(v), x + 2, y); x += colW[i]; });
      y += 8;
    });
    doc.save(`te_ardhurat_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const filtered = revenues.filter(r => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!r.title?.toLowerCase().includes(q) && !r.source?.toLowerCase().includes(q)) return false;
    }
    if (dateFrom && new Date(r.revenue_date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(r.revenue_date) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  const totalAmount = filtered.reduce((s, r) => s + (r.amount || 0), 0);
  const thisMonth = revenues.filter(r => {
    const d = new Date(r.revenue_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxhimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Të Ardhurat</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel} className="gap-2 rounded-xl">
            <Sheet className="w-4 h-4" /> Excel
          </Button>
          <Button variant="outline" onClick={exportPDF} className="gap-2 rounded-xl">
            <Download className="w-4 h-4" /> PDF
          </Button>
          <Button onClick={() => { setForm(emptyForm()); setEditRevenue(null); setDialogOpen(true); }} className="gap-2 rounded-xl" data-testid="button-new-revenue">
            <Plus className="w-4 h-4" /> Shto Të Ardhura
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total Regjistrime</p>
          <p className="text-2xl font-bold mt-1">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total Të Ardhura</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">€{totalAmount.toLocaleString('en', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ky Muaj</p>
          <p className="text-2xl font-bold mt-1 text-primary">€{thisMonth.toLocaleString('en', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Kërko titull ose burim..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 rounded-xl" data-testid="input-search-revenues" />
        </div>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[160px] rounded-xl" placeholder="Nga" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px] rounded-xl" placeholder="Deri" />
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Titulli</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Burimi</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Kategoria</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Shuma</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Metoda</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Data</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-12">Asnjë regjistrim</td></tr>
            ) : filtered.map((rev) => (
              <tr key={rev.id} className="border-b border-border last:border-0 hover:bg-muted/20" data-testid={`row-revenue-${rev.id}`}>
                <td className="px-4 py-3 font-medium">{rev.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{rev.source || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{rev.category || "—"}</td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-600">€{(rev.amount || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{rev.payment_method || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{rev.revenue_date ? moment(rev.revenue_date).format("DD/MM/YYYY") : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(rev)}><Pencil className="w-4 h-4 mr-2" /> Ndrysho</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(rev)}><Trash2 className="w-4 h-4 mr-2" /> Fshi</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen || !!editRevenue} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditRevenue(null); setForm(emptyForm()); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editRevenue ? "Ndrysho Të Ardhurat" : "Shto Të Ardhura"}</DialogTitle>
            <DialogDescription>Regjistroni të ardhura jo-faturë</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Titulli *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="p.sh. Shitje dyqani" data-testid="input-revenue-title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Shuma *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} data-testid="input-revenue-amount" />
              </div>
              <div>
                <Label>Kategoria</Label>
                <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="p.sh. Shitje" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Burimi</Label>
                <Input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="p.sh. Dyqani kryesor" />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.revenue_date} onChange={e => setForm({ ...form, revenue_date: e.target.value })} />
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
                    <SelectItem value="other">Tjetër</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Referenca</Label>
                <Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Shënime</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Shënime shtesë..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditRevenue(null); setForm(emptyForm()); }}>Anulo</Button>
            <Button onClick={editRevenue ? handleUpdate : handleCreate} disabled={submitting} data-testid="button-save-revenue">
              {submitting ? "Duke ruajtur..." : editRevenue ? "Ruaj Ndryshimet" : "Shto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
