import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/useLanguage";
import { Plus, Minus, Wallet, ArrowDownCircle, ArrowUpCircle, Download, FileSpreadsheet, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { Sheet as SheetDrawer, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function Cashbox() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const tenantId = user?.tenant_id;
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
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => { loadTransactions(); }, []);

  const loadTransactions = async () => {
    if (!tenantId) return;
    const data = await base44.entities.CashTransaction.filter({ tenant_id: tenantId }, "-created_date", 200);
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

  const cashIn = transactions.filter(t => t.type === "cash_in").reduce((s, t) => s + (t.amount || 0), 0);
  const cashOut = transactions.filter(t => t.type === "cash_out").reduce((s, t) => s + (t.amount || 0), 0);
  const balance = cashIn - cashOut;

  const filteredIn = filtered.filter(t => t.type === "cash_in").reduce((s, t) => s + (t.amount || 0), 0);
  const filteredOut = filtered.filter(t => t.type === "cash_out").reduce((s, t) => s + (t.amount || 0), 0);

  const hasFilters = filterType || filterDateFrom || filterDateTo;
  const activeFilterCount = [filterType, filterDateFrom, filterDateTo].filter(Boolean).length;
  const clearFilters = () => { setFilterType(""); setFilterDateFrom(""); setFilterDateTo(""); };

  const exportExcel = () => {
    const headers = ["Data", "Tipi", "Debi", "Kredi", "Shënim", "Referenca"];
    const rows = filtered.map(t => [
      moment(t.created_date).format("DD MMM YYYY HH:mm"),
      t.type === "cash_in" ? "Hyrje (Kredi)" : "Dalje (Debi)",
      t.type === "cash_out" ? (t.amount || 0).toFixed(2) : "",
      t.type === "cash_in" ? (t.amount || 0).toFixed(2) : "",
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
    const W = 210; const H = 297; const margin = 14; const cw = W - margin * 2;

    // ── Header ────────────────────────────────────────────────
    doc.setFillColor(67, 56, 202);
    doc.rect(0, 0, W, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("RAPORTI I ARKES", margin, 18);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text("Gjeneruar: " + new Date().toLocaleDateString("sq-AL"), margin, 28);
    if (filterDateFrom || filterDateTo) {
      doc.text("Periudha: " + (filterDateFrom || "...") + " - " + (filterDateTo || "..."), W - margin, 28, { align: "right" });
    }

    let y = 50;

    // ── Summary title ──────────────────────────────────────────
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 100, 100);
    doc.text("PERMBLEDHJA FINANCIARE", margin, y);
    y += 3;
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
    doc.line(margin, y, W - margin, y);
    y += 7;

    const boxW = (cw - 6) / 3;

    // KREDI box (hyrjet)
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, y, boxW, 22, 2, 2, "F");
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 130, 70);
    doc.text("KREDI (Hyrjet)", margin + 3, y + 7);
    doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(22, 163, 74);
    doc.text("\u20ac" + filteredIn.toFixed(2), margin + 3, y + 17);

    // DEBI box (daljet)
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin + boxW + 3, y, boxW, 22, 2, 2, "F");
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(150, 50, 50);
    doc.text("DEBI (Daljet)", margin + boxW + 6, y + 7);
    doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(220, 38, 38);
    doc.text("\u20ac" + filteredOut.toFixed(2), margin + boxW + 6, y + 17);

    // NETO box
    const neto = filteredIn - filteredOut;
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(margin + (boxW + 3) * 2, y, boxW, 22, 2, 2, "F");
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 150);
    doc.text("NETO (Bilanci)", margin + (boxW + 3) * 2 + 3, y + 7);
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.setTextColor(neto >= 0 ? 22 : 220, neto >= 0 ? 163 : 38, neto >= 0 ? 74 : 38);
    doc.text("\u20ac" + neto.toFixed(2), margin + (boxW + 3) * 2 + 3, y + 17);

    y += 30;

    // Bilanci total i gjithesej
    doc.setFillColor(245, 247, 255);
    doc.roundedRect(margin, y, cw, 14, 2, 2, "F");
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
    doc.text("Bilanci Total i Arkes (te gjitha transaksionet):", margin + 4, y + 5);
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(67, 56, 202);
    doc.text("\u20ac" + balance.toFixed(2), W - margin - 4, y + 9, { align: "right" });
    y += 22;

    // ── Transactions table ─────────────────────────────────────
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 100, 100);
    doc.text("LISTA E TRANSAKSIONEVE", margin, y);
    y += 3;
    doc.line(margin, y, W - margin, y);
    y += 5;

    // Table header
    doc.setFillColor(67, 56, 202);
    doc.rect(margin, y - 4, cw, 8, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("Data", margin + 2, y + 1);
    doc.text("Tipi", margin + 44, y + 1);
    doc.text("Debi", margin + 88, y + 1);
    doc.text("Kredi", margin + 118, y + 1);
    doc.text("Shenim", margin + 148, y + 1);
    y += 10;

    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    filtered.forEach((t, ri) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (ri % 2 === 0) { doc.setFillColor(245, 247, 255); doc.rect(margin, y - 4, cw, 7, "F"); }
      doc.setTextColor(40, 40, 40);
      doc.text(moment(t.created_date).format("DD MMM YY HH:mm"), margin + 2, y);
      if (t.type === "cash_in") {
        doc.setTextColor(22, 163, 74);
        doc.text("Hyrje (Kredi)", margin + 44, y);
        doc.setTextColor(180, 180, 180); doc.text("-", margin + 90, y);
        doc.setTextColor(22, 163, 74); doc.text("\u20ac" + (t.amount || 0).toFixed(2), margin + 118, y);
      } else {
        doc.setTextColor(220, 38, 38);
        doc.text("Dalje (Debi)", margin + 44, y);
        doc.setTextColor(220, 38, 38); doc.text("\u20ac" + (t.amount || 0).toFixed(2), margin + 88, y);
        doc.setTextColor(180, 180, 180); doc.text("-", margin + 120, y);
      }
      doc.setTextColor(100, 100, 100);
      doc.text((t.note || "").slice(0, 24), margin + 148, y);
      y += 7;
    });

    // ── Footer ─────────────────────────────────────────────────
    doc.setFillColor(67, 56, 202);
    doc.rect(0, H - 14, W, 14, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text("Ky dokument u gjenerua automatikisht.", W / 2, H - 6, { align: "center" });

    doc.save("arka_" + new Date().toISOString().slice(0, 10) + ".pdf");
  };

  const openDialog = (type) => {
    setDialogType(type);
    setAmount("");
    setNote("");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    const val = parseFloat(amount);

    // Block cash_out if insufficient balance
    if (dialogType === "cash_out" && val > balance) {
      toast.error(`Nuk ka mjete të mjaftueshme në arkë! Bilanci aktual: €${balance.toFixed(2)}`);
      return;
    }

    setSubmitting(true);
    await base44.entities.CashTransaction.create({
      amount: val,
      type: dialogType,
      note,
      reference_type: "manual",
      tenant_id: tenantId,
    });
    setDialogOpen(false);
    setSubmitting(false);
    await loadTransactions();

    // Check balance threshold and send notification if needed
    base44.functions.invoke("checkCashboxBalance", {}).catch(() => {});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('cashbox')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('cashManagement')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
           <Button variant="outline" onClick={exportExcel} className="gap-2"><FileSpreadsheet className="w-4 h-4" /> {t('exportExcel')}</Button>
           <Button variant="outline" onClick={exportPDF} className="gap-2"><Download className="w-4 h-4" /> {t('exportPDF')}</Button>
           <Button onClick={() => openDialog("cash_in")} className="gap-2"><Plus className="w-4 h-4" /> {t('addCash')}</Button>
           <Button onClick={() => openDialog("cash_out")} variant="outline" className="gap-2"><Minus className="w-4 h-4" /> {t('withdrawCash')}</Button>
          </div>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="h-[3px] w-full bg-indigo-500" />
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('balance')}</p>
                <p className="text-xl font-bold">€{balance.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="h-[3px] w-full bg-emerald-500" />
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <ArrowDownCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('cashIn')}</p>
                <p className="text-xl font-bold text-success">€{cashIn.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="h-[3px] w-full bg-rose-500" />
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <ArrowUpCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('cashOut')}</p>
                <p className="text-xl font-bold text-destructive">€{cashOut.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter button */}
      <div className="flex items-center gap-2">
        <SheetDrawer open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all w-fit shadow-sm",
                hasFilters
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-white text-foreground hover:border-primary/50 hover:shadow-md"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtrat & Kërkimi
              {hasFilters && (
                <span className="bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col">
            <div className="px-6 py-5 border-b border-border bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-[15px]">Filtrat & Kërkimi</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {hasFilters ? `${activeFilterCount} filtr aktiv` : "Filtro transaksionet e arkës"}
                  </p>
                </div>
              </div>
              <SheetClose className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition">
                <X className="h-4 w-4" />
              </SheetClose>
            </div>
            <div className="flex-1 overflow-y-auto bg-background">
              <div className="px-6 pt-6 pb-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tipi</span>
                </div>
                <div className="flex bg-muted rounded-xl p-1">
                  {["", "cash_in", "cash_out"].map(type => (
                    <button key={type} onClick={() => setFilterType(type)}
                      className={cn("flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                        filterType === type ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}>
                      {type === "" ? "Të gjitha" : type === "cash_in" ? "Hyrjet" : "Daljet"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-px bg-border mx-6" />
              <div className="px-6 pt-5 pb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Periudha</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: "Sot", action: () => { const t = new Date().toISOString().split('T')[0]; setFilterDateFrom(t); setFilterDateTo(t); }},
                    { label: "Ky Muaj", action: () => { const n = new Date(); setFilterDateFrom(new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0]); setFilterDateTo(n.toISOString().split('T')[0]); }},
                    { label: "Ky Vit", action: () => { const n = new Date(); setFilterDateFrom(new Date(n.getFullYear(), 0, 1).toISOString().split('T')[0]); setFilterDateTo(n.toISOString().split('T')[0]); }},
                  ].map(p => (
                    <button key={p.label} onClick={p.action} className="py-2 text-xs font-semibold rounded-xl border border-border bg-white hover:bg-primary hover:text-white hover:border-primary transition-all">{p.label}</button>
                  ))}
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Nga Data</label>
                    <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Deri më Data</label>
                    <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
              </div>
              {hasFilters && (
                <>
                  <div className="h-px bg-border mx-6" />
                  <div className="px-6 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Filtrat Aktive</p>
                    <div className="flex flex-wrap gap-2">
                      {filterType && (
                        <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                          {filterType === "cash_in" ? "Hyrjet" : "Daljet"}
                          <button onClick={() => setFilterType("")}><X className="w-3 h-3" /></button>
                        </span>
                      )}
                      {filterDateFrom && (
                        <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                          Nga {filterDateFrom}
                          <button onClick={() => setFilterDateFrom("")}><X className="w-3 h-3" /></button>
                        </span>
                      )}
                      {filterDateTo && (
                        <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                          Deri {filterDateTo}
                          <button onClick={() => setFilterDateTo("")}><X className="w-3 h-3" /></button>
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="border-t border-border px-6 py-4 bg-white space-y-2 shrink-0">
              {hasFilters && (
                <Button variant="outline" onClick={clearFilters} className="w-full rounded-xl">Pastro të gjithë Filtrat</Button>
              )}
              <SheetClose asChild>
                <Button className="w-full rounded-xl">Apliko & Mbyll</Button>
              </SheetClose>
            </div>
          </SheetContent>
        </SheetDrawer>
      </div>

      {/* Filtered summary */}
      {hasFilters && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-success/5 border border-success/20 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Kredi / Hyrjet</p>
            <p className="text-lg font-bold text-success mt-0.5">€{filteredIn.toFixed(2)}</p>
          </div>
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Debi / Daljet</p>
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
        <div className="p-5 border-b border-border flex items-center justify-between gap-3">
          <p className="font-semibold text-sm">{filtered.length} transaksione{hasFilters ? " (filtruara)" : ""}</p>
          <div className="flex items-center gap-1.5 ml-auto">
            {[
              { label: "Sot", action: () => { const t = new Date().toISOString().split('T')[0]; setFilterDateFrom(t); setFilterDateTo(t); } },
              { label: "Muaj", action: () => { const n = new Date(); setFilterDateFrom(new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0]); setFilterDateTo(n.toISOString().split('T')[0]); } },
              { label: "Vit", action: () => { const n = new Date(); setFilterDateFrom(new Date(n.getFullYear(), 0, 1).toISOString().split('T')[0]); setFilterDateTo(n.toISOString().split('T')[0]); } },
            ].map(p => (
              <button key={p.label} onClick={p.action}
                className="px-3 py-1 text-xs font-semibold rounded-lg border border-border bg-white hover:bg-primary hover:text-white hover:border-primary transition-all">
                {p.label}
              </button>
            ))}
            {hasFilters && (
              <button onClick={clearFilters} className="px-3 py-1 text-xs font-semibold rounded-lg border border-destructive/40 text-destructive hover:bg-destructive hover:text-white transition-all">
                ✕ Pastro
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Nr. Rendor</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Data</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Tipi</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Debi</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Kredi</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Bilanci</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Shënim</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Referenca</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-sm text-muted-foreground py-12">
                    Nuk ka transaksione
                  </td>
                </tr>
              ) : (
                (() => {
                  // Calculate running balance oldest→newest, then display newest first
                  const sorted = [...filtered].reverse();
                  let running = transactions
                    .filter(t => !filtered.find(f => f.id === t.id))
                    .reduce((s, t) => t.type === 'cash_in' ? s + t.amount : s - t.amount, 0);
                  const withBalance = sorted.map(t => {
                    running += t.type === 'cash_in' ? t.amount : -t.amount;
                    return { ...t, runningBalance: running };
                  });
                  return withBalance.reverse().map((t, idx) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-muted-foreground font-medium">{idx + 1}</td>
                    <td className="px-5 py-3.5 text-sm">{moment(t.created_date).format("DD MMM YYYY, HH:mm")}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
                        t.type === "cash_in" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      )}>
                        {t.type === "cash_in" ? "Hyrje" : "Dalje"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-destructive">
                      {t.type === "cash_out" ? `€${(t.amount || 0).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-success">
                      {t.type === "cash_in" ? `€${(t.amount || 0).toLocaleString()}` : "—"}
                    </td>
                    <td className={cn("px-5 py-3.5 text-sm font-bold text-right", t.runningBalance >= 0 ? "text-primary" : "text-destructive")}>
                      €{t.runningBalance.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{t.note || "—"}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground capitalize">{t.reference_type || "manual"}</td>
                  </tr>
                  ));
                })()
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
              <Input type="number" min="0" step="0.01" placeholder="0.00"
                value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Shënim</Label>
              <Textarea placeholder="Shënim opsional..." value={note}
                onChange={(e) => setNote(e.target.value)} className="mt-1.5" rows={3} />
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