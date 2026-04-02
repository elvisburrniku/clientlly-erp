import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Minus, Wallet, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, X, Download, Sheet, Calendar } from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function Cashbox() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState("cash_in");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const data = await base44.entities.CashTransaction.list("-created_date", 100);
    setTransactions(data);
    setLoading(false);
  };

  const filtered = transactions.filter(t => {
    const d = new Date(t.created_date);
    if (filterType && t.type !== filterType) return false;
    if (filterDateFrom && d < new Date(filterDateFrom)) return false;
    if (filterDateTo && d > new Date(filterDateTo + "T23:59:59")) return false;
    return true;
  });

  const cashIn = transactions.filter((t) => t.type === "cash_in").reduce((s, t) => s + (t.amount || 0), 0);
  const cashOut = transactions.filter((t) => t.type === "cash_out").reduce((s, t) => s + (t.amount || 0), 0);
  const balance = cashIn - cashOut;

  const filteredIn = filtered.filter(t => t.type === "cash_in").reduce((s, t) => s + (t.amount || 0), 0);
  const filteredOut = filtered.filter(t => t.type === "cash_out").reduce((s, t) => s + (t.amount || 0), 0);

  const hasFilters = filterType || filterDateFrom || filterDateTo;

  const clearFilters = () => { setFilterType(""); setFilterDateFrom(""); setFilterDateTo(""); };

  const exportExcel = () => {
    const headers = ["Data", "Tipi", "Shuma", "Shënim", "Referenca"];
    const rows = filtered.map(t => [
      moment(t.created_date).format("DD MMM YYYY HH:mm"),
      t.type === "cash_in" ? "Hyrje" : "Dalje",
      (t.type === "cash_in" ? "+" : "-") + (t.amount || 0).toFixed(2),
      t.note || "",
      t.reference_type || "manual",
    ]);
    const tableRows = rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join("")}</tr>`).join("");
    const html = `<html><head><meta charset="UTF-8"></head><body><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `arka_${new Date().toISOString().slice(0,10)}.xls`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210; const margin = 14;
    doc.setFillColor(67, 56, 202);
    doc.rect(0, 0, W, 22, "F");
    doc.setTextColor(255,255,255);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Raporti i Arkës", margin, 14);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Gjeneruar: ${new Date().toLocaleDateString("sq-AL")}`, W - margin, 14, { align: "right" });

    // Summary box
    let y = 32;
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, y, (W - margin*2)/3 - 3, 20, 3, 3, "F");
    doc.setTextColor(22, 163, 74); doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("HYRJET (Filtr)", margin + 2, y + 7);
    doc.setFontSize(12);
    doc.text(`\u20ac${filteredIn.toFixed(2)}`, margin + 2, y + 16);

    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin + (W - margin*2)/3 + 1, y, (W - margin*2)/3 - 3, 20, 3, 3, "F");
    doc.setTextColor(220, 38, 38); doc.setFontSize(8);
    doc.text("DALJET (Filtr)", margin + (W - margin*2)/3 + 3, y + 7);
    doc.setFontSize(12);
    doc.text(`\u20ac${filteredOut.toFixed(2)}`, margin + (W - margin*2)/3 + 3, y + 16);

    doc.setFillColor(239, 246, 255);
    doc.roundedRect(margin + (W - margin*2)*2/3 + 2, y, (W - margin*2)/3 - 3, 20, 3, 3, "F");
    doc.setTextColor(67, 56, 202); doc.setFontSize(8);
    doc.text("BILANCI TOTAL", margin + (W - margin*2)*2/3 + 4, y + 7);
    doc.setFontSize(12);
    doc.text(`\u20ac${balance.toFixed(2)}`, margin + (W - margin*2)*2/3 + 4, y + 16);

    y += 28;
    const headers = ["Data", "Tipi", "Shuma", "Shënim"];
    const colW = [38, 22, 28, 88];
    doc.setFillColor(243,244,246);
    doc.rect(margin, y - 5, W - margin*2, 8, "F");
    doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(100,100,100);
    let x = margin;
    headers.forEach((h, i) => { doc.text(h, x + 2, y); x += colW[i]; });
    y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    filtered.forEach((t, ri) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (ri % 2 === 0) { doc.setFillColor(249,250,251); doc.rect(margin, y - 4, W - margin*2, 8, "F"); }
      doc.setTextColor(t.type === "cash_in" ? 22 : 220, t.type === "cash_in" ? 163 : 38, t.type === "cash_in" ? 74 : 38);
      const row = [
        moment(t.created_date).format("DD MMM YY HH:mm"),
        t.type === "cash_in" ? "Hyrje" : "Dalje",
        (t.type === "cash_in" ? "+" : "-") + `\u20ac${(t.amount||0).toFixed(2)}`,
        (t.note || "").slice(0, 45),
      ];
      x = margin;
      row.forEach((v, i) => { doc.text(String(v), x + 2, y); x += colW[i]; });
      y += 8;
    });
    doc.save(`arka_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const openDialog = (type) => {
    setDialogType(type);
    setAmount("");
    setNote("");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setSubmitting(true);
    await base44.entities.CashTransaction.create({
      amount: parseFloat(amount),
      type: dialogType,
      note,
      reference_type: "manual",
    });
    setDialogOpen(false);
    setSubmitting(false);
    loadTransactions();
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Arka</h1>
          <p className="text-sm text-muted-foreground mt-1">Menaxhimi i parave të gatshme</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportExcel} className="gap-2"><Sheet className="w-4 h-4" /> Excel</Button>
          <Button variant="outline" onClick={exportPDF} className="gap-2"><Download className="w-4 h-4" /> PDF Raport</Button>
          <Button onClick={() => openDialog("cash_in")} className="gap-2"><Plus className="w-4 h-4" /> Shto Para</Button>
          <Button onClick={() => openDialog("cash_out")} variant="outline" className="gap-2"><Minus className="w-4 h-4" /> Tërhiq Para</Button>
        </div>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bilanci</p>
              <p className="text-xl font-bold">€{balance.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hyrjet</p>
              <p className="text-xl font-bold text-success">€{cashIn.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <ArrowUpCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Daljet</p>
              <p className="text-xl font-bold text-destructive">€{cashOut.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex bg-muted rounded-xl p-1">
          {["", "cash_in", "cash_out"].map(type => (
            <button key={type} onClick={() => setFilterType(type)}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                filterType === type ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>
              {type === "" ? "Të gjitha" : type === "cash_in" ? "Hyrjet" : "Daljet"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
            className="px-3 py-1.5 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary/30" />
          <span className="text-xs text-muted-foreground">—</span>
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
            className="px-3 py-1.5 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary/30" />
        </div>
        {[{ label: "Sot", action: () => { const t = new Date().toISOString().split('T')[0]; setFilterDateFrom(t); setFilterDateTo(t); }},
          { label: "Ky Muaj", action: () => { const n = new Date(); setFilterDateFrom(new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0]); setFilterDateTo(n.toISOString().split('T')[0]); }},
          { label: "Ky Vit", action: () => { const n = new Date(); setFilterDateFrom(new Date(n.getFullYear(), 0, 1).toISOString().split('T')[0]); setFilterDateTo(n.toISOString().split('T')[0]); }},
        ].map(p => (
          <button key={p.label} onClick={p.action} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-white hover:bg-primary hover:text-white hover:border-primary transition-all">{p.label}</button>
        ))}
        {hasFilters && <button onClick={clearFilters} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-destructive/40 text-destructive hover:bg-destructive hover:text-white transition-all">✕ Pastro</button>}
      </div>

      {/* Filtered summary */}
      {hasFilters && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-success/5 border border-success/20 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Hyrjet (filtruara)</p>
            <p className="text-lg font-bold text-success mt-0.5">€{filteredIn.toFixed(2)}</p>
          </div>
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Daljet (filtruara)</p>
            <p className="text-lg font-bold text-destructive mt-0.5">€{filteredOut.toFixed(2)}</p>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Neto (filtruara)</p>
            <p className={cn("text-lg font-bold mt-0.5", filteredIn - filteredOut >= 0 ? "text-success" : "text-destructive")}>€{(filteredIn - filteredOut).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Transactions table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="text-base font-semibold">{filtered.length} transaksione{hasFilters ? " (filtruara)" : ""}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Data</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Tipi</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Shuma</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Shënim</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Referenca</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-sm text-muted-foreground py-12">
                    Nuk ka transaksione
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 text-sm">{moment(t.created_date).format("DD MMM YYYY, HH:mm")}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
                        t.type === "cash_in"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      )}>
                        {t.type === "cash_in" ? "Hyrje" : "Dalje"}
                      </span>
                    </td>
                    <td className={cn(
                      "px-5 py-3.5 text-sm font-semibold",
                      t.type === "cash_in" ? "text-success" : "text-destructive"
                    )}>
                      {t.type === "cash_in" ? "+" : "-"}€{(t.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{t.note || "—"}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground capitalize">{t.reference_type || "manual"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Remove Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "cash_in" ? "Shto Para në Arkë" : "Tërhiq Para nga Arka"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Shuma (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Shënim</Label>
              <Textarea
                placeholder="Shënim opsional..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSubmit} disabled={submitting || !amount}>
              {submitting ? "Duke ruajtur..." : "Ruaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}