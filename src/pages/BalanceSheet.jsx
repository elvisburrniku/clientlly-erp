import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, ChevronDown, ChevronRight } from "lucide-react";
import moment from "moment";

function fmt(n) {
  return parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getBalance(row) {
  const d = parseFloat(row.total_debit);
  const c = parseFloat(row.total_credit);
  return row.normal_balance === 'debit' ? d - c : c - d;
}

function groupByAccountGroup(accounts) {
  const groups = {};
  const ungrouped = [];
  accounts.forEach(acc => {
    if (acc.group_id) {
      if (!groups[acc.group_id]) {
        groups[acc.group_id] = { id: acc.group_id, name: acc.group_name, sequence: acc.group_sequence, accounts: [] };
      }
      groups[acc.group_id].accounts.push(acc);
    } else {
      ungrouped.push(acc);
    }
  });
  const sorted = Object.values(groups).sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  return { groups: sorted, ungrouped };
}

export default function BalanceSheet() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateTo, setDateTo] = useState(() => moment().format('YYYY-MM-DD'));
  const [collapsedGroups, setCollapsedGroups] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/balance-sheet?to=${dateTo}`, { credentials: 'include' });
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const assets = data.filter(a => a.account_type === 'asset');
  const liabilities = data.filter(a => a.account_type === 'liability');
  const equity = data.filter(a => a.account_type === 'equity');

  const totalAssets = assets.reduce((s, r) => s + getBalance(r), 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + getBalance(r), 0);
  const totalEquity = equity.reduce((s, r) => s + getBalance(r), 0);

  const toggleGroup = (id) => setCollapsedGroups(prev => ({ ...prev, [id]: !prev[id] }));

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const W = 210, margin = 14;

    doc.setFillColor(107, 114, 126);
    doc.rect(0, 0, W, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BILANCI (BALANCE SHEET)', margin, 15);
    doc.setFontSize(8);
    doc.text(`Deri më: ${moment(dateTo).format('DD/MM/YYYY')}`, W - margin, 15, { align: 'right' });

    let y = 35;
    const renderSection = (title, items, total) => {
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, y);
      y += 8;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      items.forEach((row, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        if (i % 2 === 0) { doc.setFillColor(240, 240, 240); doc.rect(margin, y - 3, W - margin * 2, 5, 'F'); }
        doc.text(`${row.code} - ${row.name}`, margin + 5, y);
        doc.text(getBalance(row).toFixed(2), W - margin - 2, y, { align: 'right' });
        y += 5;
      });
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(220, 220, 240);
      doc.rect(margin, y, W - margin * 2, 6, 'F');
      doc.text(`TOTALI: ${title}`, margin + 5, y + 4);
      doc.text(total.toFixed(2), W - margin - 2, y + 4, { align: 'right' });
      y += 12;
    };

    renderSection('AKTIVET', assets, totalAssets);
    renderSection('DETYRIMET', liabilities, totalLiabilities);
    renderSection('KAPITALI', equity, totalEquity);

    doc.setFillColor(107, 114, 126);
    doc.rect(margin, y, W - margin * 2, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('DETYRIMET + KAPITALI', margin + 5, y + 5.5);
    doc.text((totalLiabilities + totalEquity).toFixed(2), W - margin - 2, y + 5.5, { align: 'right' });
    doc.save(`bilanci-${dateTo}.pdf`);
  };

  const exportExcel = async () => {
    const { utils, writeFile } = await import('xlsx');
    const wsData = [
      ['BILANCI (BALANCE SHEET)'],
      [`Deri më: ${moment(dateTo).format('DD/MM/YYYY')}`],
      [],
      ['AKTIVET'],
      ['Kodi', 'Llogaria', 'Shuma'],
      ...assets.map(r => [r.code, r.name, getBalance(r)]),
      ['', 'TOTALI AKTIVET', totalAssets],
      [],
      ['DETYRIMET'],
      ['Kodi', 'Llogaria', 'Shuma'],
      ...liabilities.map(r => [r.code, r.name, getBalance(r)]),
      ['', 'TOTALI DETYRIMET', totalLiabilities],
      [],
      ['KAPITALI'],
      ['Kodi', 'Llogaria', 'Shuma'],
      ...equity.map(r => [r.code, r.name, getBalance(r)]),
      ['', 'TOTALI KAPITALI', totalEquity],
      [],
      ['', 'DETYRIMET + KAPITALI', totalLiabilities + totalEquity],
    ];
    const ws = utils.aoa_to_sheet(wsData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Bilanci');
    writeFile(wb, `bilanci-${dateTo}.xlsx`);
  };

  const SectionWithGroups = ({ title, accounts, total, headerColorClass, totalColorClass }) => {
    const { groups, ungrouped } = groupByAccountGroup(accounts);
    return (
      <div className="mb-6">
        <h3 className={`text-base font-bold mb-2 px-4 py-2 rounded-lg ${headerColorClass}`}>{title}</h3>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nuk ka të dhëna</p>
        ) : (
          <>
            {groups.map(grp => {
              const grpTotal = grp.accounts.reduce((s, a) => s + getBalance(a), 0);
              const isCollapsed = collapsedGroups[grp.id];
              return (
                <div key={grp.id} className="mb-2">
                  <button
                    onClick={() => toggleGroup(grp.id)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-muted/30 hover:bg-muted/50 rounded-lg text-sm font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {grp.name}
                    </span>
                    <span className="font-mono text-sm">{fmt(grpTotal)}</span>
                  </button>
                  {!isCollapsed && (
                    <div className="pl-4">
                      {grp.accounts.map((row, i) => (
                        <div key={row.id} className={`flex justify-between py-1.5 px-4 ${i % 2 === 0 ? 'bg-muted/10' : ''}`}>
                          <span className="text-sm"><span className="font-mono text-muted-foreground mr-2 text-xs">{row.code}</span>{row.name}</span>
                          <span className="text-sm font-mono">{fmt(getBalance(row))}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {ungrouped.map((row, i) => (
              <div key={row.id} className={`flex justify-between py-1.5 px-4 ${i % 2 === 0 ? 'bg-muted/10' : ''}`}>
                <span className="text-sm"><span className="font-mono text-muted-foreground mr-2 text-xs">{row.code}</span>{row.name}</span>
                <span className="text-sm font-mono">{fmt(getBalance(row))}</span>
              </div>
            ))}
            <div className={`flex justify-between py-2 px-4 font-bold ${totalColorClass} rounded-lg mt-1`}>
              <span>Totali {title}</span>
              <span className="font-mono">{fmt(total)}</span>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Raporte Financiare</p>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Bilanci</h1>
        <p className="text-sm text-muted-foreground mt-1">Balance Sheet — Gjendja e aktiveve, detyrimeve dhe kapitalit</p>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <Label className="text-xs font-semibold mb-2 block">Deri në datë</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} data-testid="input-date-to" />
          </div>
          <Button onClick={loadData} disabled={loading} data-testid="button-generate">{loading ? 'Duke ngarkuar...' : 'Gjenero'}</Button>
          <Button onClick={exportPDF} variant="outline" className="gap-2" data-testid="button-export-pdf"><Download className="w-4 h-4" /> PDF</Button>
          <Button onClick={exportExcel} variant="outline" className="gap-2" data-testid="button-export-excel"><Download className="w-4 h-4" /> Excel</Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
        <SectionWithGroups title="Aktivet" accounts={assets} total={totalAssets} headerColorClass="bg-blue-50 text-blue-800" totalColorClass="bg-blue-50 text-blue-800" />
        <SectionWithGroups title="Detyrimet" accounts={liabilities} total={totalLiabilities} headerColorClass="bg-red-50 text-red-800" totalColorClass="bg-red-50 text-red-800" />
        <SectionWithGroups title="Kapitali" accounts={equity} total={totalEquity} headerColorClass="bg-purple-50 text-purple-800" totalColorClass="bg-purple-50 text-purple-800" />

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-blue-100 text-blue-800 rounded-xl p-4 text-center">
            <p className="text-sm font-semibold">Total Aktivet</p>
            <p className="text-xl font-bold font-mono" data-testid="text-total-assets">{fmt(totalAssets)}</p>
          </div>
          <div className="bg-purple-100 text-purple-800 rounded-xl p-4 text-center">
            <p className="text-sm font-semibold">Detyrimet + Kapitali</p>
            <p className="text-xl font-bold font-mono" data-testid="text-total-liabilities-equity">{fmt(totalLiabilities + totalEquity)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
