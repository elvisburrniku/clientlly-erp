import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import moment from "moment";

export default function TrialBalance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => moment().startOf('year').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(() => moment().format('YYYY-MM-DD'));

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/trial-balance?from=${dateFrom}&to=${dateTo}`, { credentials: 'include' });
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const totalDebit = data.reduce((s, r) => s + (parseFloat(r.balance) > 0 ? parseFloat(r.balance) : 0), 0);
  const totalCredit = data.reduce((s, r) => s + (parseFloat(r.balance) < 0 ? Math.abs(parseFloat(r.balance)) : 0), 0);

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const W = 210, margin = 14;

    doc.setFillColor(107, 114, 126);
    doc.rect(0, 0, W, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BILANCI I PROVËS (TRIAL BALANCE)', margin, 15);
    doc.setFontSize(8);
    doc.text(`${moment(dateFrom).format('DD/MM/YYYY')} - ${moment(dateTo).format('DD/MM/YYYY')}`, W - margin, 15, { align: 'right' });

    let y = 35;
    doc.setFillColor(107, 114, 126);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.rect(margin, y - 4, W - margin * 2, 7, 'F');
    doc.text('Kodi', margin + 2, y);
    doc.text('Llogaria', margin + 25, y);
    doc.text('Debit', margin + 120, y);
    doc.text('Kredit', W - margin - 2, y, { align: 'right' });
    y += 8;

    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    data.forEach((row, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (i % 2 === 0) { doc.setFillColor(240, 240, 240); doc.rect(margin, y - 3, W - margin * 2, 5, 'F'); }
      const balance = parseFloat(row.balance);
      doc.text(row.code, margin + 2, y);
      doc.text(row.name.slice(0, 40), margin + 25, y);
      doc.text(balance > 0 ? balance.toFixed(2) : '-', margin + 120, y);
      doc.text(balance < 0 ? Math.abs(balance).toFixed(2) : '-', W - margin - 2, y, { align: 'right' });
      y += 5;
    });

    doc.setFillColor(107, 114, 126);
    doc.rect(margin, y + 2, W - margin * 2, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTALI', margin + 25, y + 7);
    doc.text(totalDebit.toFixed(2), margin + 120, y + 7);
    doc.text(totalCredit.toFixed(2), W - margin - 2, y + 7, { align: 'right' });

    doc.save(`bilanci-proves-${dateFrom}-${dateTo}.pdf`);
  };

  const exportExcel = async () => {
    const { utils, writeFile } = await import('xlsx');
    const wsData = [
      ['Kodi', 'Llogaria', 'Lloji', 'Debit', 'Kredit'],
      ...data.map(r => {
        const bal = parseFloat(r.balance);
        return [r.code, r.name, r.account_type, bal > 0 ? bal : 0, bal < 0 ? Math.abs(bal) : 0];
      }),
      ['', 'TOTALI', '', totalDebit, totalCredit],
    ];
    const ws = utils.aoa_to_sheet(wsData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Bilanci i Provës');
    writeFile(wb, `bilanci-proves-${dateFrom}-${dateTo}.xlsx`);
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Raporte Financiare</p>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Bilanci i Provës</h1>
        <p className="text-sm text-muted-foreground mt-1">Trial Balance - Përmbledhje e llogarive për periudhën e zgjedhur</p>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <Label className="text-xs font-semibold mb-2 block">Nga data</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} data-testid="input-date-from" />
          </div>
          <div className="flex-1">
            <Label className="text-xs font-semibold mb-2 block">Deri në datë</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} data-testid="input-date-to" />
          </div>
          <Button onClick={loadData} disabled={loading} data-testid="button-generate">{loading ? 'Duke ngarkuar...' : 'Gjenero'}</Button>
          <Button onClick={exportPDF} variant="outline" className="gap-2" data-testid="button-export-pdf"><Download className="w-4 h-4" /> PDF</Button>
          <Button onClick={exportExcel} variant="outline" className="gap-2" data-testid="button-export-excel"><Download className="w-4 h-4" /> Excel</Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left py-3 px-6 font-semibold text-muted-foreground w-24">Kodi</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Llogaria</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground w-28">Lloji</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground w-32">Debit</th>
              <th className="text-right py-3 px-6 font-semibold text-muted-foreground w-32">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-12 text-muted-foreground">Nuk ka të dhëna për këtë periudhë</td></tr>
            ) : data.map((row, i) => {
              const balance = parseFloat(row.balance);
              return (
                <tr key={row.id} className={`${i % 2 === 0 ? 'bg-muted/10' : ''}`} data-testid={`row-tb-${row.code}`}>
                  <td className="py-2.5 px-6 font-mono font-semibold">{row.code}</td>
                  <td className="py-2.5 px-4">{row.name}</td>
                  <td className="py-2.5 px-4 capitalize text-muted-foreground">{row.account_type}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{balance > 0 ? balance.toFixed(2) : '-'}</td>
                  <td className="py-2.5 px-6 text-right font-mono">{balance < 0 ? Math.abs(balance).toFixed(2) : '-'}</td>
                </tr>
              );
            })}
            {data.length > 0 && (
              <tr className="border-t-2 border-foreground font-bold bg-primary/5">
                <td colSpan="3" className="py-3 px-6">Totali</td>
                <td className="py-3 px-4 text-right font-mono">{totalDebit.toFixed(2)}</td>
                <td className="py-3 px-6 text-right font-mono">{totalCredit.toFixed(2)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
