import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Users, Truck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";

export default function FinancialCards() {
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedType, setSelectedType] = useState('customer');
  const [selectedId, setSelectedId] = useState('');
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => moment().startOf('year').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(() => moment().format('YYYY-MM-DD'));

  useEffect(() => {
    const loadEntities = async () => {
      const [c, s] = await Promise.all([
        base44.entities.Client.list('name', 500),
        base44.entities.Supplier.list('name', 500),
      ]);
      setClients(c);
      setSuppliers(s);
    };
    loadEntities();
  }, []);

  const loadCard = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/financial-card/${selectedType}/${selectedId}?from=${dateFrom}&to=${dateTo}`, { credentials: 'include' });
      const result = await res.json();
      setCardData(result);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const exportPDF = async () => {
    if (!cardData) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const W = 210, margin = 14;
    const entityName = cardData.entity?.name || 'Pa Emër';

    doc.setFillColor(107, 114, 126);
    doc.rect(0, 0, W, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`KARTELA FINANCIARE - ${entityName.toUpperCase()}`, margin, 15);
    doc.setFontSize(8);
    doc.text(`${moment(dateFrom).format('DD/MM/YYYY')} - ${moment(dateTo).format('DD/MM/YYYY')}`, W - margin, 15, { align: 'right' });

    let y = 35;
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    if (cardData.entity) {
      doc.text(`Emri: ${cardData.entity.name || ''}`, margin, y); y += 6;
      doc.text(`Email: ${cardData.entity.email || ''}`, margin, y); y += 6;
      doc.text(`Tel: ${cardData.entity.phone || ''}`, margin, y); y += 6;
      if (cardData.entity.nuis) { doc.text(`NUIS: ${cardData.entity.nuis}`, margin, y); y += 6; }
      y += 4;
    }

    if (selectedType === 'customer' && cardData.invoices?.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('FATURAT', margin, y); y += 6;

      doc.setFillColor(107, 114, 126);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.rect(margin, y - 3, W - margin * 2, 6, 'F');
      doc.text('Nr. Faturës', margin + 2, y);
      doc.text('Data', margin + 40, y);
      doc.text('Total', margin + 80, y);
      doc.text('Paguar', margin + 110, y);
      doc.text('Bilanci', W - margin - 2, y, { align: 'right' });
      y += 7;

      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'normal');
      let runningBalance = 0;
      cardData.invoices.forEach((inv, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const total = parseFloat(inv.total || 0);
        const paid = parseFloat(inv.paid_amount || 0);
        runningBalance += total - paid;
        if (i % 2 === 0) { doc.setFillColor(240, 240, 240); doc.rect(margin, y - 3, W - margin * 2, 5, 'F'); }
        doc.text(inv.invoice_number || '', margin + 2, y);
        doc.text(moment(inv.issue_date).format('DD/MM/YYYY'), margin + 40, y);
        doc.text(total.toFixed(2), margin + 80, y);
        doc.text(paid.toFixed(2), margin + 110, y);
        doc.text(runningBalance.toFixed(2), W - margin - 2, y, { align: 'right' });
        y += 5;
      });
    }

    if (selectedType === 'vendor' && cardData.expenses?.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('SHPENZIMET', margin, y); y += 6;

      doc.setFillColor(107, 114, 126);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.rect(margin, y - 3, W - margin * 2, 6, 'F');
      doc.text('Përshkrimi', margin + 2, y);
      doc.text('Data', margin + 70, y);
      doc.text('Total', W - margin - 2, y, { align: 'right' });
      y += 7;

      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'normal');
      cardData.expenses.forEach((exp, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        if (i % 2 === 0) { doc.setFillColor(240, 240, 240); doc.rect(margin, y - 3, W - margin * 2, 5, 'F'); }
        doc.text((exp.description || '').slice(0, 35), margin + 2, y);
        doc.text(exp.expense_date ? moment(exp.expense_date).format('DD/MM/YYYY') : '', margin + 70, y);
        doc.text(parseFloat(exp.total || 0).toFixed(2), W - margin - 2, y, { align: 'right' });
        y += 5;
      });
    }

    doc.save(`kartela-${selectedType}-${entityName}.pdf`);
  };

  const exportExcel = async () => {
    if (!cardData) return;
    const { utils, writeFile } = await import('xlsx');
    const entityName = cardData.entity?.name || 'Pa Emër';
    let wsData = [
      [`KARTELA FINANCIARE - ${entityName}`],
      [`Periudha: ${moment(dateFrom).format('DD/MM/YYYY')} - ${moment(dateTo).format('DD/MM/YYYY')}`],
      [],
    ];

    if (selectedType === 'customer') {
      wsData.push(['Nr. Faturës', 'Data', 'Total', 'Paguar', 'Bilanci']);
      let running = 0;
      cardData.invoices?.forEach(inv => {
        const total = parseFloat(inv.total || 0);
        const paid = parseFloat(inv.paid_amount || 0);
        running += total - paid;
        wsData.push([inv.invoice_number, moment(inv.issue_date).format('DD/MM/YYYY'), total, paid, running]);
      });
    } else {
      wsData.push(['Përshkrimi', 'Data', 'Kategoria', 'Pa TVSH', 'TVSH', 'Total']);
      cardData.expenses?.forEach(exp => {
        wsData.push([exp.description, exp.expense_date ? moment(exp.expense_date).format('DD/MM/YYYY') : '', exp.category_name, parseFloat(exp.subtotal || 0), parseFloat(exp.tax_amount || 0), parseFloat(exp.total || 0)]);
      });
    }

    const ws = utils.aoa_to_sheet(wsData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Kartela');
    writeFile(wb, `kartela-${selectedType}-${entityName}.xlsx`);
  };

  const entities = selectedType === 'customer' ? clients : suppliers;
  const totalInvoiced = cardData?.invoices?.reduce((s, i) => s + parseFloat(i.total || 0), 0) || 0;
  const totalPaid = cardData?.invoices?.reduce((s, i) => s + parseFloat(i.paid_amount || 0), 0) || 0;
  const totalExpenses = cardData?.expenses?.reduce((s, e) => s + parseFloat(e.total || 0), 0) || 0;

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Kontabilitet</p>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Kartela Financiare</h1>
        <p className="text-sm text-muted-foreground mt-1">Historiku i transaksioneve dhe bilanci për klient/furnitor</p>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-40">
            <Label className="text-xs font-semibold mb-2 block">Lloji</Label>
            <Tabs value={selectedType} onValueChange={v => { setSelectedType(v); setSelectedId(''); setCardData(null); }}>
              <TabsList className="w-full">
                <TabsTrigger value="customer" className="gap-1 flex-1" data-testid="tab-customer"><Users className="w-3 h-3" /> Klient</TabsTrigger>
                <TabsTrigger value="vendor" className="gap-1 flex-1" data-testid="tab-vendor"><Truck className="w-3 h-3" /> Furnitor</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex-1">
            <Label className="text-xs font-semibold mb-2 block">{selectedType === 'customer' ? 'Klienti' : 'Furnitori'}</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger data-testid="select-entity"><SelectValue placeholder="Zgjidh..." /></SelectTrigger>
              <SelectContent>
                {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-2 block">Nga</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} data-testid="input-date-from" />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-2 block">Deri</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} data-testid="input-date-to" />
          </div>
          <Button onClick={loadCard} disabled={loading || !selectedId} data-testid="button-generate">{loading ? 'Duke ngarkuar...' : 'Shfaq'}</Button>
          <Button onClick={exportPDF} variant="outline" className="gap-2" disabled={!cardData} data-testid="button-export-pdf"><Download className="w-4 h-4" /> PDF</Button>
          <Button onClick={exportExcel} variant="outline" className="gap-2" disabled={!cardData} data-testid="button-export-excel"><Download className="w-4 h-4" /> Excel</Button>
        </div>
      </div>

      {cardData && (
        <>
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
            <h3 className="text-base font-bold mb-3">{cardData.entity?.name || 'Pa Emër'}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">Email:</span> {cardData.entity?.email || '-'}</div>
              <div><span className="text-muted-foreground">Tel:</span> {cardData.entity?.phone || '-'}</div>
              <div><span className="text-muted-foreground">Adresa:</span> {cardData.entity?.address || '-'}</div>
              {cardData.entity?.nuis && <div><span className="text-muted-foreground">NUIS:</span> {cardData.entity.nuis}</div>}
            </div>
          </div>

          {selectedType === 'customer' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-5">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Total Faturuar</p>
                  <p className="text-2xl font-bold mt-1" data-testid="text-total-invoiced">{totalInvoiced.toFixed(2)}</p>
                </Card>
                <Card className="p-5">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Total Paguar</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">{totalPaid.toFixed(2)}</p>
                </Card>
                <Card className="p-5">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Bilanci</p>
                  <p className={`text-2xl font-bold mt-1 ${(totalInvoiced - totalPaid) > 0 ? 'text-red-600' : 'text-green-600'}`} data-testid="text-balance">
                    {(totalInvoiced - totalPaid).toFixed(2)}
                  </p>
                </Card>
              </div>

              <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Nr. Faturës</th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Data</th>
                      <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Statusi</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Total</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Paguar</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Bilanci</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardData.invoices?.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-8 text-muted-foreground">Nuk ka fatura</td></tr>
                    ) : (() => {
                      let runningBalance = 0;
                      return cardData.invoices?.map((inv, i) => {
                        const total = parseFloat(inv.total || 0);
                        const paid = parseFloat(inv.paid_amount || 0);
                        runningBalance += total - paid;
                        return (
                          <tr key={inv.id} className={`${i % 2 === 0 ? 'bg-muted/10' : ''}`} data-testid={`row-card-invoice-${inv.id}`}>
                            <td className="py-2.5 px-4 font-semibold">{inv.invoice_number || '-'}</td>
                            <td className="py-2.5 px-4">{moment(inv.issue_date).format('DD/MM/YYYY')}</td>
                            <td className="py-2.5 px-4 text-center">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {inv.status === 'paid' ? 'Paguar' : inv.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono">{total.toFixed(2)}</td>
                            <td className="py-2.5 px-4 text-right font-mono text-green-600">{paid.toFixed(2)}</td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold">{runningBalance.toFixed(2)}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {selectedType === 'vendor' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-5">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Shpenzime</p>
                  <p className="text-2xl font-bold mt-1">{cardData.expenses?.length || 0}</p>
                </Card>
                <Card className="p-5">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Total</p>
                  <p className="text-2xl font-bold mt-1 text-primary" data-testid="text-total-expenses">{totalExpenses.toFixed(2)}</p>
                </Card>
              </div>

              <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Përshkrimi</th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Data</th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Kategoria</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Pa TVSH</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">TVSH</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardData.expenses?.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-8 text-muted-foreground">Nuk ka shpenzime</td></tr>
                    ) : cardData.expenses?.map((exp, i) => (
                      <tr key={exp.id} className={`${i % 2 === 0 ? 'bg-muted/10' : ''}`} data-testid={`row-card-expense-${exp.id}`}>
                        <td className="py-2.5 px-4 max-w-[200px] truncate">{exp.description || '-'}</td>
                        <td className="py-2.5 px-4">{exp.expense_date ? moment(exp.expense_date).format('DD/MM/YYYY') : '-'}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">{exp.category_name || '-'}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{parseFloat(exp.subtotal || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{parseFloat(exp.tax_amount || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold">{parseFloat(exp.total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {cardData.expenses?.length > 0 && (
                      <tr className="border-t-2 border-foreground font-bold bg-primary/5">
                        <td colSpan="5" className="py-3 px-4">Totali</td>
                        <td className="py-3 px-4 text-right font-mono">{totalExpenses.toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
