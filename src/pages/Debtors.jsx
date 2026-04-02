import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Download, AlertCircle, SlidersHorizontal, X, Filter, Calendar } from 'lucide-react';
import { Sheet as SheetComponent, SheetContent, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';

export default function Debtors() {
  const navigate = useNavigate();
  const [debtors, setDebtors] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const [filterDebtorName, setFilterDebtorName] = useState('');
  const [filterMinDebt, setFilterMinDebt] = useState('');
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await base44.entities.Invoice.list('-created_date', 500);
    calculateDebtors(data);
  };

  const calculateDebtors = (data) => {
    const debtorMap = {};
    
    data.forEach(inv => {
      if (inv.is_open && inv.status !== 'cancelled') {
        if (!debtorMap[inv.client_name]) {
          debtorMap[inv.client_name] = {
            name: inv.client_name,
            email: inv.client_email,
            phone: inv.client_phone || '',
            total_amount: 0,
            paid_amount: 0,
            invoices: [],
            days_overdue: 0,
            oldest_invoice_date: null
          };
        }
        const daysOverdue = inv.due_date ? Math.max(0, Math.floor((Date.now() - new Date(inv.due_date)) / (1000 * 60 * 60 * 24))) : 0;
        debtorMap[inv.client_name].total_amount += inv.amount || 0;
        debtorMap[inv.client_name].paid_amount += inv.payment_records?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        debtorMap[inv.client_name].invoices.push({
          number: inv.invoice_number,
          client_name: inv.client_name,
          amount: inv.amount,
          due_date: inv.due_date,
          status: inv.status,
          created_date: inv.created_date
        });
        debtorMap[inv.client_name].days_overdue = Math.max(debtorMap[inv.client_name].days_overdue, daysOverdue);
        if (!debtorMap[inv.client_name].oldest_invoice_date || new Date(inv.created_date) < new Date(debtorMap[inv.client_name].oldest_invoice_date)) {
          debtorMap[inv.client_name].oldest_invoice_date = inv.created_date;
        }
      }
    });

    const debtorsData = Object.values(debtorMap).map(d => ({
      ...d,
      balance: d.total_amount - d.paid_amount,
      invoices: d.invoices.sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    })).sort((a, b) => new Date(b.oldest_invoice_date) - new Date(a.oldest_invoice_date));

    setDebtors(debtorsData);
  };

  const filtered = debtors.filter(d => {
    if (filterDebtorName && !d.name.toLowerCase().includes(filterDebtorName.toLowerCase())) return false;
    if (filterMinDebt && d.balance < parseFloat(filterMinDebt)) return false;
    if (filterOverdueOnly && d.days_overdue === 0) return false;
    if (filterDateFrom && new Date(d.oldest_invoice_date) < new Date(filterDateFrom)) return false;
    if (filterDateTo && new Date(d.oldest_invoice_date) > new Date(filterDateTo + 'T23:59:59')) return false;
    return true;
  });

  const hasActiveFilters = filterDebtorName || filterMinDebt || filterOverdueOnly || filterDateFrom || filterDateTo;
  const activeFilterCount = [filterDebtorName, filterMinDebt, filterOverdueOnly, filterDateFrom, filterDateTo].filter(Boolean).length;

  const clearFilters = () => {
    setFilterDebtorName('');
    setFilterMinDebt('');
    setFilterOverdueOnly(false);
    setFilterDateFrom('');
    setFilterDateTo('');
    setPage(1);
  };

  const exportExcel = () => {
    const headers = ['Debitori', 'Email', 'Telefon', 'Shuma Totale', 'E Paguar', 'Në Pritje', 'Vonesa (ditë)', 'Nr. Faturave'];
    const rows = filtered.map(d => [
      d.name, d.email, d.phone,
      d.total_amount.toFixed(2), d.paid_amount.toFixed(2), d.balance.toFixed(2),
      d.days_overdue, d.invoices.length
    ]);
    const tableRows = rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('');
    const html = `<html><head><meta charset="UTF-8"></head><body><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debitoret_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = 297;
    const margin = 14;
    doc.setFillColor(67, 56, 202);
    doc.rect(0, 0, W, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Lista e Debitorëve', margin, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gjeneruar: ${new Date().toLocaleDateString('sq-AL')}  |  Total: ${filtered.length} debitorë`, W - margin, 14, { align: 'right' });
    const headers = ['Debitori', 'Email', 'Shuma Totale', 'E Paguar', 'Në Pritje', 'Vonesa (ditë)', 'Nr. Faturave'];
    const colW = [50, 60, 25, 25, 25, 20, 20];
    let x = margin;
    let y = 32;
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y - 5, W - margin * 2, 8, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    headers.forEach((h, i) => {
      doc.text(h, x + 2, y);
      x += colW[i];
    });
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    filtered.forEach((d, ri) => {
      if (y > 185) {
        doc.addPage();
        y = 20;
      }
      if (ri % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, y - 4, W - margin * 2, 8, 'F');
      }
      doc.setTextColor(30, 30, 30);
      const row = [
        d.name || '',
        d.email || '',
        `€${d.total_amount.toFixed(2)}`,
        `€${d.paid_amount.toFixed(2)}`,
        `€${d.balance.toFixed(2)}`,
        `${d.days_overdue}`,
        `${d.invoices.length}`
      ];
      x = margin;
      row.forEach((v, i) => {
        doc.text(String(v).slice(0, Math.floor(colW[i] / 2) + 2), x + 2, y);
        x += colW[i];
      });
      y += 8;
    });
    doc.setFillColor(67, 56, 202);
    doc.rect(0, 195, W, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text(`Totali i Borxhit: €${filtered.reduce((s, d) => s + d.balance, 0).toFixed(2)}`, W - margin, 201, { align: 'right' });
    doc.save(`lista_debitoret_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const totalOwed = filtered.reduce((sum, d) => sum + d.balance, 0);
  const overdueCount = filtered.filter(d => d.days_overdue > 0).length;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxhimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Debitorët</h1>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button variant="outline" onClick={exportExcel} className="gap-2">
            Excel
          </Button>
          <Button variant="outline" onClick={exportPDF} className="gap-2">
            <Download className="w-4 h-4" /> PDF Listë
          </Button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej Borxh</p>
          <p className="text-2xl font-bold mt-1 text-destructive">€{totalOwed.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">në pritje</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Në Vonese</p>
          <p className="text-2xl font-bold mt-1 text-warning">{overdueCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">debitorë</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5 col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total Debitorë</p>
          <p className="text-2xl font-bold mt-1">{filtered.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">aktiv</p>
        </div>
      </div>

      {/* Filter Trigger Button */}
      <button
        onClick={() => setFilterOpen(true)}
        className={cn(
          'flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all w-fit shadow-sm',
          hasActiveFilters
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border bg-white text-foreground hover:border-primary/50 hover:shadow-md'
        )}
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filtrat & Kërkimi
        {hasActiveFilters && (
          <span className="bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Filters Side Drawer */}
      <SheetComponent open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col">
          <div className="px-6 py-5 border-b border-border bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-[15px]">Filtrat & Kërkimi</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hasActiveFilters ? `${activeFilterCount} filtr aktiv` : 'Filtro debitorët'}
                </p>
              </div>
            </div>
            <SheetClose className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition">
              <X className="h-4 w-4" />
            </SheetClose>
          </div>
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Kërkimi</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Emri i debitorit..."
                  value={filterDebtorName}
                  onChange={(e) => {
                    setFilterDebtorName(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-9 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {filterDebtorName && (
                  <button
                    onClick={() => {
                      setFilterDebtorName('');
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="h-px bg-border mx-6" />
            <div className="px-6 pt-5 pb-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Borxhi Minimal</span>
              </div>
              <input
                type="number"
                placeholder="€ Minimumi"
                value={filterMinDebt}
                onChange={(e) => {
                  setFilterMinDebt(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="h-px bg-border mx-6" />
            <div className="px-6 pt-5 pb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterOverdueOnly}
                  onChange={(e) => {
                    setFilterOverdueOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm font-medium">Vetëm Vonesa</span>
              </label>
            </div>
            <div className="h-px bg-border mx-6" />
            <div className="px-6 pt-5 pb-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Periudha</span>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Nga Data</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => {
                      setFilterDateFrom(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Deri më Data</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => {
                      setFilterDateTo(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>
            {hasActiveFilters && (
              <>
                <div className="h-px bg-border mx-6" />
                <div className="px-6 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Filtrat Aktive</p>
                  <div className="flex flex-wrap gap-2">
                    {filterDebtorName && (
                      <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                        {filterDebtorName}
                        <button onClick={() => { setFilterDebtorName(''); setPage(1); }}><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {filterMinDebt && (
                      <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                        ≥€{filterMinDebt}
                        <button onClick={() => { setFilterMinDebt(''); setPage(1); }}><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {filterOverdueOnly && (
                      <span className="flex items-center gap-1.5 bg-warning/10 text-warning text-xs font-semibold px-3 py-1.5 rounded-full">
                        Vonesa
                        <button onClick={() => { setFilterOverdueOnly(false); setPage(1); }}><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {filterDateFrom && (
                      <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                        Nga {filterDateFrom}
                        <button onClick={() => { setFilterDateFrom(''); setPage(1); }}><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {filterDateTo && (
                      <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                        Deri {filterDateTo}
                        <button onClick={() => { setFilterDateTo(''); setPage(1); }}><X className="w-3 h-3" /></button>
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="border-t border-border px-6 py-4 bg-white space-y-2 shrink-0">
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="w-full rounded-xl">
                Pastro të gjithë Filtrat
              </Button>
            )}
            <SheetClose asChild>
              <Button className="w-full rounded-xl">Apliko & Mbyll</Button>
            </SheetClose>
          </div>
        </SheetContent>
      </SheetComponent>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
          <p className="font-semibold text-sm">{filtered.length} debitorë{hasActiveFilters && ' (filtruara)'}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
           <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5 w-12">Nr.</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Debitori</th>
               <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Nr. Fature</th>
               <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Shuma Totale</th>
               <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">E Paguar</th>
               <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Borxh</th>
               <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Vonesa</th>
             </tr>
           </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                        <AlertCircle className="w-7 h-7 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">Nuk ka debitorë</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.flatMap((d, dIdx) =>
                  d.invoices.map((inv, invIdx) => {
                    const rowNum = (page - 1) * PAGE_SIZE + dIdx + invIdx + 1;
                    return (
                  <tr key={d.name} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => navigate(`/debtor-detail/${encodeURIComponent(d.name)}`)}>  
                      <td className="px-6 py-4 text-sm text-muted-foreground font-medium text-right">{(page - 1) * PAGE_SIZE + ((d.invoices || []).indexOf(inv)) + 1}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-primary hover:underline">{d.name}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-muted-foreground">{inv.number}</td>
                      <td className="px-6 py-4 text-sm font-semibold">€{inv.amount?.toFixed(2) || '0.00'}</td>
                      <td className="px-6 py-4 text-sm text-success">€{(inv.status === 'paid' ? inv.amount : 0).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-destructive">€{(inv.status !== 'paid' ? inv.amount : 0).toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4">
                        {inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== 'paid' ? (
                          <span className="text-xs font-semibold bg-destructive/10 text-destructive px-2.5 py-1 rounded-full">
                            {Math.floor((Date.now() - new Date(inv.due_date)) / (1000 * 60 * 60 * 24))} ditë
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                    );
                    })
                    )
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
            <p className="text-sm text-muted-foreground">Duke shfaqur {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} nga {filtered.length} debitorë</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-white hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ← Prapa
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={cn(
                    'w-8 h-8 text-sm font-medium rounded-lg border transition',
                    page === n ? 'bg-primary text-white border-primary' : 'bg-white border-border hover:bg-muted'
                  )}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-white hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Para →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}