import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import moment from "moment";

export default function ATKSalesBook() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => moment().startOf('month').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(() => moment().endOf('month').format('YYYY-MM-DD'));

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/atk-sales-book?from=${dateFrom}&to=${dateTo}`, { credentials: 'include' });
      const result = await res.json();
      setData(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const totalSubtotal = data.reduce((s, r) => s + parseFloat(r.subtotal || 0), 0);
  const totalTax = data.reduce((s, r) => s + parseFloat(r.tax_amount || 0), 0);
  const totalAmount = data.reduce((s, r) => s + parseFloat(r.total || 0), 0);

  const exportExcel = async () => {
    const { utils, writeFile } = await import('xlsx');
    const wsData = [
      ['LIBRI I SHITJEVE - ATK'],
      [`Periudha: ${moment(dateFrom).format('DD/MM/YYYY')} - ${moment(dateTo).format('DD/MM/YYYY')}`],
      [],
      ['Nr.', 'Nr. Faturës', 'Data', 'Blerësi', 'NIPT/NUIS', 'Vlera pa TVSH', 'TVSH', 'Vlera me TVSH'],
      ...data.map((row, i) => [
        i + 1,
        row.invoice_number || '',
        moment(row.issue_date).format('DD/MM/YYYY'),
        row.client_name || '',
        row.client_nuis || '',
        parseFloat(row.subtotal || 0),
        parseFloat(row.tax_amount || 0),
        parseFloat(row.total || 0),
      ]),
      [],
      ['', '', '', '', 'TOTALI', totalSubtotal, totalTax, totalAmount],
    ];
    const ws = utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Libri i Shitjeve');
    writeFile(wb, `libri-shitjeve-atk-${dateFrom}-${dateTo}.xlsx`);
  };

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF('landscape');
    const W = 297, margin = 14;

    doc.setFillColor(107, 114, 126);
    doc.rect(0, 0, W, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('LIBRI I SHITJEVE - ATK', margin, 15);
    doc.setFontSize(8);
    doc.text(`${moment(dateFrom).format('DD/MM/YYYY')} - ${moment(dateTo).format('DD/MM/YYYY')}`, W - margin, 15, { align: 'right' });

    let y = 35;
    doc.setFillColor(107, 114, 126);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.rect(margin, y - 4, W - margin * 2, 7, 'F');
    doc.text('Nr.', margin + 2, y);
    doc.text('Nr. Faturës', margin + 15, y);
    doc.text('Data', margin + 50, y);
    doc.text('Blerësi', margin + 80, y);
    doc.text('NIPT/NUIS', margin + 150, y);
    doc.text('Pa TVSH', margin + 195, y);
    doc.text('TVSH', margin + 225, y);
    doc.text('Me TVSH', W - margin - 2, y, { align: 'right' });
    y += 8;

    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    data.forEach((row, i) => {
      if (y > 190) { doc.addPage(); y = 20; }
      if (i % 2 === 0) { doc.setFillColor(240, 240, 240); doc.rect(margin, y - 3, W - margin * 2, 5, 'F'); }
      doc.text(String(i + 1), margin + 2, y);
      doc.text(row.invoice_number || '', margin + 15, y);
      doc.text(moment(row.issue_date).format('DD/MM/YYYY'), margin + 50, y);
      doc.text((row.client_name || '').slice(0, 30), margin + 80, y);
      doc.text(row.client_nuis || '', margin + 150, y);
      doc.text(parseFloat(row.subtotal || 0).toFixed(2), margin + 195, y);
      doc.text(parseFloat(row.tax_amount || 0).toFixed(2), margin + 225, y);
      doc.text(parseFloat(row.total || 0).toFixed(2), W - margin - 2, y, { align: 'right' });
      y += 5;
    });

    doc.setFillColor(107, 114, 126);
    doc.rect(margin, y + 2, W - margin * 2, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTALI', margin + 80, y + 7);
    doc.text(totalSubtotal.toFixed(2), margin + 195, y + 7);
    doc.text(totalTax.toFixed(2), margin + 225, y + 7);
    doc.text(totalAmount.toFixed(2), W - margin - 2, y + 7, { align: 'right' });

    doc.save(`libri-shitjeve-atk-${dateFrom}-${dateTo}.pdf`);
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Raporte ATK</p>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Libri i Shitjeve</h1>
        <p className="text-sm text-muted-foreground mt-1">ATK Sales Book - Regjistri i faturave të shitjeve sipas formatit fiskal</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Fatura</p>
          <p className="text-2xl font-bold mt-1" data-testid="text-invoice-count">{data.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Pa TVSH</p>
          <p className="text-2xl font-bold mt-1">{totalSubtotal.toFixed(2)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground font-semibold uppercase">TVSH</p>
          <p className="text-2xl font-bold mt-1 text-orange-600">{totalTax.toFixed(2)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Me TVSH</p>
          <p className="text-2xl font-bold mt-1 text-primary">{totalAmount.toFixed(2)}</p>
        </Card>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground w-10">Nr.</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Nr. Faturës</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Data</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Blerësi</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">NIPT/NUIS</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Pa TVSH</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">TVSH</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Me TVSH</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-12 text-muted-foreground">Nuk ka fatura për këtë periudhë</td></tr>
              ) : data.map((row, i) => (
                <tr key={row.id} className={`${i % 2 === 0 ? 'bg-muted/10' : ''}`} data-testid={`row-sales-${row.id}`}>
                  <td className="py-2.5 px-4 text-muted-foreground">{i + 1}</td>
                  <td className="py-2.5 px-4 font-semibold">{row.invoice_number || '-'}</td>
                  <td className="py-2.5 px-4">{moment(row.issue_date).format('DD/MM/YYYY')}</td>
                  <td className="py-2.5 px-4">{row.client_name || '-'}</td>
                  <td className="py-2.5 px-4 font-mono text-muted-foreground">{row.client_nuis || '-'}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{parseFloat(row.subtotal || 0).toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{parseFloat(row.tax_amount || 0).toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold">{parseFloat(row.total || 0).toFixed(2)}</td>
                </tr>
              ))}
              {data.length > 0 && (
                <tr className="border-t-2 border-foreground font-bold bg-primary/5">
                  <td colSpan="5" className="py-3 px-4">Totali</td>
                  <td className="py-3 px-4 text-right font-mono">{totalSubtotal.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-mono">{totalTax.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-mono">{totalAmount.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
