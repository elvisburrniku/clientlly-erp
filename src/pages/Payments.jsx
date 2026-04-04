import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Download, CreditCard, Banknote, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";
import { jsPDF } from "jspdf";

const METHOD_LABELS = {
  cash: "Para",
  bank_transfer: "Transferi Bankar",
  card: "Kartë",
  bank: "Bankë",
  other: "Tjetër",
};

const METHOD_ICONS = {
  cash: Banknote,
  bank_transfer: Building2,
  card: CreditCard,
  bank: Building2,
  other: CreditCard,
};

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterClient, setFilterClient] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await base44.entities.Payment.list("-created_date", 1000);
      setPayments(data);
    } catch (err) {
      console.error("Gabim gjatë ngarkimit të pagesave:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = payments.filter(p => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (
        !p.invoice_number?.toLowerCase().includes(q) &&
        !p.client_name?.toLowerCase().includes(q) &&
        !p.notes?.toLowerCase().includes(q)
      ) return false;
    }
    if (filterClient && filterClient !== "all" && p.client_name !== filterClient) return false;
    if (filterMethod && filterMethod !== "all" && p.payment_method !== filterMethod) return false;
    if (filterDateFrom && p.payment_date && new Date(p.payment_date) < new Date(filterDateFrom)) return false;
    if (filterDateTo && p.payment_date && new Date(p.payment_date) > new Date(filterDateTo + "T23:59:59")) return false;
    return true;
  });

  const totalCollected = filtered.reduce((s, p) => s + (p.amount || 0), 0);

  const byMethod = filtered.reduce((acc, p) => {
    const m = p.payment_method || "other";
    acc[m] = (acc[m] || 0) + (p.amount || 0);
    return acc;
  }, {});

  const uniqueClients = [...new Set(payments.map(p => p.client_name).filter(Boolean))].sort();

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = 297; const margin = 14;
    doc.setFillColor(67, 56, 202);
    doc.rect(0, 0, W, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Lista e Pagesave", margin, 14);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Total: €${totalCollected.toFixed(2)}  |  ${filtered.length} pagesa`, W - margin, 14, { align: "right" });
    const headers = ["Data", "Nr. Faturës", "Klienti", "Shuma", "Metoda", "Shënime"];
    const colW = [28, 35, 60, 25, 30, 70];
    let x = margin; let y = 32;
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y - 5, W - margin * 2, 8, "F");
    doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 100, 100);
    headers.forEach((h, i) => { doc.text(h, x + 2, y); x += colW[i]; });
    y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    filtered.forEach((p, ri) => {
      if (y > 185) { doc.addPage(); y = 20; }
      if (ri % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(margin, y - 4, W - margin * 2, 8, "F"); }
      doc.setTextColor(30, 30, 30);
      const row = [
        p.payment_date ? moment(p.payment_date).format("DD/MM/YY") : "—",
        p.invoice_number || "—",
        (p.client_name || "—").slice(0, 28),
        `€${(p.amount || 0).toFixed(2)}`,
        METHOD_LABELS[p.payment_method] || p.payment_method || "—",
        (p.notes || "").slice(0, 35),
      ];
      x = margin;
      row.forEach((v, i) => { doc.text(String(v), x + 2, y); x += colW[i]; });
      y += 8;
    });
    doc.save(`pagesat_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const hasActiveFilters = searchTerm || filterMethod || filterDateFrom || filterDateTo || filterClient;

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxhimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Pagesat</h1>
        </div>
        <Button variant="outline" onClick={exportPDF} className="gap-2 rounded-xl" data-testid="button-export-payments-pdf">
          <Download className="w-4 h-4" /> PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total Pagesa</p>
          <p className="text-2xl font-bold mt-1">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total Mbledhur</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">€{totalCollected.toLocaleString('en', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Para Cash</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">€{(byMethod["cash"] || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Transferi Bankar</p>
          <p className="text-2xl font-bold mt-1 text-violet-600">€{((byMethod["bank_transfer"] || 0) + (byMethod["bank"] || 0)).toLocaleString('en', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Kartë</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">€{(byMethod["card"] || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tjetër</p>
          <p className="text-2xl font-bold mt-1 text-slate-600">€{(byMethod["other"] || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Kërko nr. fature, klient..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
            data-testid="input-search-payments"
          />
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[180px] rounded-xl" data-testid="select-filter-client">
            <SelectValue placeholder="Të gjithë klientët" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjithë klientët</SelectItem>
            {uniqueClients.map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterMethod} onValueChange={setFilterMethod}>
          <SelectTrigger className="w-[160px] rounded-xl" data-testid="select-filter-method">
            <SelectValue placeholder="Të gjitha metodat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha metodat</SelectItem>
            <SelectItem value="cash">Para</SelectItem>
            <SelectItem value="bank_transfer">Transferi Bankar</SelectItem>
            <SelectItem value="card">Kartë</SelectItem>
            <SelectItem value="bank">Bankë</SelectItem>
            <SelectItem value="other">Tjetër</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filterDateFrom}
          onChange={e => setFilterDateFrom(e.target.value)}
          className="w-[160px] rounded-xl"
          data-testid="input-filter-date-from"
        />
        <Input
          type="date"
          value={filterDateTo}
          onChange={e => setFilterDateTo(e.target.value)}
          className="w-[160px] rounded-xl"
          data-testid="input-filter-date-to"
        />
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => { setSearchTerm(""); setFilterMethod(""); setFilterDateFrom(""); setFilterDateTo(""); setFilterClient(""); }}
            data-testid="button-clear-filters"
          >
            Pastro filtrat
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Data</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Nr. Faturës</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Klienti</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Shuma</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Metoda</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Shënime</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground py-12">
                  {payments.length === 0 ? "Asnjë pagesë e regjistruar" : "Asnjë pagesë gjendet me filtrat aktualë"}
                </td>
              </tr>
            ) : filtered.map((p) => {
              const MethodIcon = METHOD_ICONS[p.payment_method] || CreditCard;
              return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20" data-testid={`row-payment-${p.id}`}>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.payment_date ? moment(p.payment_date).format("DD/MM/YYYY") : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">{p.invoice_number || "—"}</td>
                  <td className="px-4 py-3">{p.client_name || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                    €{(parseFloat(p.amount) || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MethodIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground capitalize">
                        {METHOD_LABELS[p.payment_method] || p.payment_method || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">{p.notes || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex justify-end">
            <span className="text-sm font-semibold">
              Total: <span className="text-emerald-600">€{totalCollected.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
