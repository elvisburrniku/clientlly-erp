import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import moment from "moment";

export default function TaxSummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => moment().startOf('month').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(() => moment().endOf('month').format('YYYY-MM-DD'));

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/tax-summary?from=${dateFrom}&to=${dateTo}`, { credentials: 'include' });
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const exportPDF = async () => {
    if (!data) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const W = 210, margin = 14;

    doc.setFillColor(107, 114, 126);
    doc.rect(0, 0, W, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PËRMBLEDHJE E TVSH-SË', margin, 15);
    doc.setFontSize(8);
    doc.text(`${moment(dateFrom).format('DD/MM/YYYY')} - ${moment(dateTo).format('DD/MM/YYYY')}`, W - margin, 15, { align: 'right' });

    let y = 40;
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SHITJET (Output VAT)', margin, y);
    y += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Numri i faturave: ${data.sales.invoice_count}`, margin + 5, y); y += 7;
    doc.text(`Vlera pa TVSH: ${parseFloat(data.sales.total_sales).toFixed(2)}`, margin + 5, y); y += 7;
    doc.text(`TVSH e mbledhur: ${parseFloat(data.sales.vat_collected).toFixed(2)}`, margin + 5, y); y += 7;
    doc.text(`Vlera me TVSH: ${parseFloat(data.sales.total_with_vat).toFixed(2)}`, margin + 5, y); y += 15;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('BLERJET (Input VAT)', margin, y);
    y += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Numri i shpenzimeve: ${data.purchases.expense_count}`, margin + 5, y); y += 7;
    doc.text(`Vlera pa TVSH: ${parseFloat(data.purchases.total_purchases).toFixed(2)}`, margin + 5, y); y += 7;
    doc.text(`TVSH e paguar: ${parseFloat(data.purchases.vat_paid).toFixed(2)}`, margin + 5, y); y += 7;
    doc.text(`Vlera me TVSH: ${parseFloat(data.purchases.total_with_vat).toFixed(2)}`, margin + 5, y); y += 15;

    doc.setFillColor(107, 114, 126);
    doc.rect(margin, y, W - margin * 2, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const netVat = data.net_vat;
    doc.text(`TVSH NETO ${netVat >= 0 ? 'PËR TU PAGUAR' : 'PËR TU RIMBURSUAR'}:  ${Math.abs(netVat).toFixed(2)}`, margin + 5, y + 8);

    doc.save(`permbledhje-tvsh-${dateFrom}-${dateTo}.pdf`);
  };

  const exportExcel = async () => {
    if (!data) return;
    const { utils, writeFile } = await import('xlsx');
    const wsData = [
      ['PËRMBLEDHJE E TVSH-SË'],
      [`Periudha: ${moment(dateFrom).format('DD/MM/YYYY')} - ${moment(dateTo).format('DD/MM/YYYY')}`],
      [],
      ['SHITJET (Output VAT)'],
      ['Numri i faturave', data.sales.invoice_count],
      ['Vlera pa TVSH', parseFloat(data.sales.total_sales)],
      ['TVSH e mbledhur', parseFloat(data.sales.vat_collected)],
      ['Vlera me TVSH', parseFloat(data.sales.total_with_vat)],
      [],
      ['BLERJET (Input VAT)'],
      ['Numri i shpenzimeve', data.purchases.expense_count],
      ['Vlera pa TVSH', parseFloat(data.purchases.total_purchases)],
      ['TVSH e paguar', parseFloat(data.purchases.vat_paid)],
      ['Vlera me TVSH', parseFloat(data.purchases.total_with_vat)],
      [],
      ['TVSH NETO', data.net_vat],
    ];
    const ws = utils.aoa_to_sheet(wsData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'TVSH');
    writeFile(wb, `permbledhje-tvsh-${dateFrom}-${dateTo}.xlsx`);
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Raporte Financiare</p>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Përmbledhje e TVSH-së</h1>
        <p className="text-sm text-muted-foreground mt-1">Tax Summary - TVSH e mbledhur vs TVSH e paguar</p>
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

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 border-l-4 border-l-green-500">
              <p className="text-xs text-muted-foreground font-semibold uppercase">TVSH e Mbledhur</p>
              <p className="text-2xl font-bold mt-1 text-green-600" data-testid="text-vat-collected">{parseFloat(data.vat_collected).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">{data.sales.invoice_count} fatura</p>
            </Card>
            <Card className="p-5 border-l-4 border-l-red-500">
              <p className="text-xs text-muted-foreground font-semibold uppercase">TVSH e Paguar</p>
              <p className="text-2xl font-bold mt-1 text-red-600" data-testid="text-vat-paid">{parseFloat(data.vat_paid).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">{data.purchases.expense_count} shpenzime</p>
            </Card>
            <Card className={`p-5 border-l-4 ${data.net_vat >= 0 ? 'border-l-orange-500' : 'border-l-blue-500'}`}>
              <p className="text-xs text-muted-foreground font-semibold uppercase">
                {data.net_vat >= 0 ? 'TVSH për tu Paguar' : 'TVSH për Rimbursim'}
              </p>
              <p className={`text-2xl font-bold mt-1 ${data.net_vat >= 0 ? 'text-orange-600' : 'text-blue-600'}`} data-testid="text-net-vat">
                {Math.abs(data.net_vat).toFixed(2)}
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
              <h3 className="text-base font-bold mb-4 text-green-700">Shitjet (Output VAT)</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">Numri i faturave</span>
                  <span className="text-sm font-semibold">{data.sales.invoice_count}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">Vlera pa TVSH</span>
                  <span className="text-sm font-semibold font-mono">{parseFloat(data.sales.total_sales).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">TVSH e mbledhur (20%)</span>
                  <span className="text-sm font-bold font-mono text-green-600">{parseFloat(data.sales.vat_collected).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 bg-green-50 px-3 rounded-lg">
                  <span className="text-sm font-semibold">Vlera me TVSH</span>
                  <span className="text-sm font-bold font-mono">{parseFloat(data.sales.total_with_vat).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
              <h3 className="text-base font-bold mb-4 text-red-700">Blerjet (Input VAT)</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">Numri i shpenzimeve</span>
                  <span className="text-sm font-semibold">{data.purchases.expense_count}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">Vlera pa TVSH</span>
                  <span className="text-sm font-semibold font-mono">{parseFloat(data.purchases.total_purchases).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">TVSH e paguar (Input)</span>
                  <span className="text-sm font-bold font-mono text-red-600">{parseFloat(data.purchases.vat_paid).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 bg-red-50 px-3 rounded-lg">
                  <span className="text-sm font-semibold">Vlera me TVSH</span>
                  <span className="text-sm font-bold font-mono">{parseFloat(data.purchases.total_with_vat).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-6 text-center ${data.net_vat >= 0 ? 'bg-orange-50 border-2 border-orange-200' : 'bg-blue-50 border-2 border-blue-200'}`}>
            <p className="text-sm font-semibold text-muted-foreground mb-2">
              {data.net_vat >= 0 ? 'TVSH Neto për tu Paguar në ATK' : 'TVSH Neto për Rimbursim nga ATK'}
            </p>
            <p className={`text-4xl font-bold ${data.net_vat >= 0 ? 'text-orange-600' : 'text-blue-600'}`}>
              {Math.abs(data.net_vat).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              TVSH e mbledhur ({parseFloat(data.vat_collected).toFixed(2)}) - TVSH e paguar ({parseFloat(data.vat_paid).toFixed(2)})
            </p>
          </div>
        </>
      )}
    </div>
  );
}
