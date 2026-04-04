import { useState, useEffect } from 'react';
  import { useParams, useNavigate } from 'react-router-dom';
  import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft } from 'lucide-react';
import { jsPDF } from 'jspdf';
import moment from 'moment';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ClientDetail() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => moment().subtract(12, 'months').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(() => moment().format('YYYY-MM-DD'));

  useEffect(() => {
    loadData();
  }, [clientId]);

  const loadData = async () => {
    const c = await base44.entities.Client.list('-created_date', 1000);
    const found = c.find(x => x.id === clientId);
    setClient(found);

    const invs = await base44.entities.Invoice.list('-created_date', 500);
    const clientInvs = invs.filter(i => i.client_name === found?.name);
    setInvoices(clientInvs);
    setLoading(false);
  };

  const filterDataByDate = (data) => {
    return data.filter(item => {
      const itemDate = moment(item.created_date);
      return itemDate.isBetween(moment(dateFrom), moment(dateTo), null, '[]');
    });
  };

  const buildLedger = () => {
    const filtered = filterDataByDate(invoices);
    const ledger = [];

    // Get opening balance from transactions before dateFrom
    const beforePeriod = invoices.filter(inv => moment(inv.created_date).isBefore(moment(dateFrom)));
    let openingBalance = beforePeriod.reduce((sum, inv) => {
      if (inv.status === 'paid') return sum;
      return sum + parseFloat(inv.amount || 0);
    }, 0);

    // Add opening balance as first row
    ledger.push({
      nr: 1,
      date: moment(dateFrom).format('DD/MM/YYYY'),
      orderDate: moment(dateFrom).format('DD/MM/YYYY'),
      type: 'Gjendja fillestare',
      reference: '-',
      debit: 0,
      credit: 0,
      balance: openingBalance
    });

    let balance = openingBalance;
    let rowNr = 2;

    filtered.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)).forEach(inv => {
      const amount = parseFloat(inv.amount || 0);
      const isPayment = inv.status === 'paid' && (inv.payment_records?.length > 0);
      
      if (isPayment) {
        const paidAmount = inv.payment_records.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
        balance -= paidAmount;
        ledger.push({
          nr: rowNr,
          date: moment(inv.created_date).format('DD/MM/YYYY'),
          orderDate: moment(inv.created_date).format('DD/MM/YYYY'),
          type: 'Pagesa',
          reference: `${inv.invoice_number}`,
          paymentMethod: inv.payment_method || '-',
          debit: 0,
          credit: paidAmount,
          balance: balance
        });
        rowNr++;
      } else if (inv.status !== 'paid') {
        balance += amount;
        ledger.push({
          nr: rowNr,
          date: moment(inv.created_date).format('DD/MM/YYYY'),
          orderDate: moment(inv.created_date).format('DD/MM/YYYY'),
          type: 'Fatura',
          reference: inv.invoice_number,
          debit: amount,
          credit: 0,
          balance: balance
        });
        rowNr++;
      }
    });

    return ledger;
  };

  const exportAccountCardPDF = () => {
    const ledgerData = buildLedger();
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const W = 297;
    const H = 210;
    const margin = 14;
    let y = 40;

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Kartela e Bleresit/Furnitorit - ${client?.name || ''}`, margin, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periudha: ${dateFrom} deri ${dateTo}`, margin, 30);

    // Table header
    const col = [10, 18, 18, 22, 28, 18, 22, 22, 22];
    const headers = ['Nr.', 'Data Dok.', 'Data Urdh.', 'Lloji', 'Nr Urdh.', 'Metoda', 'Debi (€)', 'Kredia (€)', 'Saldo (€)'];
    
    // Header row
    doc.setFillColor(40, 40, 40);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    
    let xPos = margin;
    headers.forEach((h, i) => {
      doc.rect(xPos, y - 5, col[i], 8, 'F');
      doc.text(h, xPos + 1, y, { maxWidth: col[i] - 2 });
      xPos += col[i];
    });
    
    y += 10;
    
    // Data rows
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    ledgerData.forEach((row, idx) => {
      if (y > H - 20) {
        doc.addPage();
        y = 20;
      }
      
      if (idx % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        xPos = margin;
        col.forEach(w => {
          doc.rect(xPos, y - 4, w, 6, 'F');
          xPos += w;
        });
      }
      
      xPos = margin;
      const values = [
        row.nr,
        row.date,
        row.orderDate,
        row.type,
        row.reference,
        row.paymentMethod || '-',
        row.debit > 0 ? row.debit.toFixed(2) : '0.00',
        row.credit > 0 ? row.credit.toFixed(2) : '0.00',
        row.balance.toFixed(2)
      ];
      
      values.forEach((v, i) => {
        const align = i >= 6 ? 'right' : 'left';
        const txt = String(v).substring(0, col[i] - 2);
        doc.text(txt, xPos + 1, y, { align, maxWidth: col[i] - 2 });
        xPos += col[i];
      });
      
      y += 6;
    });
    
    // Totals
    doc.setFillColor(200, 200, 200);
    doc.setFont('helvetica', 'bold');
    xPos = margin;
    col.forEach((w, i) => {
      doc.rect(xPos, y - 4, w, 6, 'F');
      xPos += w;
    });
    
    const totalDebit = ledgerData.reduce((s, r) => s + r.debit, 0);
    const totalCredit = ledgerData.reduce((s, r) => s + r.credit, 0);
    const finalBalance = ledgerData[ledgerData.length - 1]?.balance || 0;
    
    xPos = margin;
    const totals = ['', '', '', '', '', '', totalDebit.toFixed(2), totalCredit.toFixed(2), finalBalance.toFixed(2)];
    totals.forEach((v, i) => {
      if (v) {
        const align = i >= 6 ? 'right' : 'left';
        doc.text(v, xPos + 1, y, { align, maxWidth: col[i] - 2 });
      }
      xPos += col[i];
    });

    // Footer
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Kjo Kartel e blersit u gjenerua nga: ERP Finance', W / 2, H - 5, { align: 'center' });

    doc.save(`kartela_${client?.name?.replace(/\s+/g, '_') || 'klient'}_${dateFrom}_${dateTo}.pdf`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Klienti nuk u gjet</p>
        <Button onClick={() => navigate('/clients')} className="mt-4">Kthehu te Klientët</Button>
      </div>
    );
  }

  const ledger = buildLedger();
  const finalBalance = ledger[ledger.length - 1]?.balance || 0;

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/clients')} className="p-2 hover:bg-muted rounded-lg transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <p className="text-muted-foreground mt-1">Kartela e Bleres/Furnitorit</p>
        </div>
      </div>

      {/* Client Info Card */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Informacioni i Klientit</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Emri</p>
            <p className="font-semibold">{client.name}</p>
          </div>
          {client.nipt && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">NIPT</p>
              <p className="font-semibold">{client.nipt}</p>
            </div>
          )}
          {client.phone && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Telefon</p>
              <p className="font-semibold">{client.phone}</p>
            </div>
          )}
          {client.email && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Email</p>
              <p className="font-semibold">{client.email}</p>
            </div>
          )}
          {client.address && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Adresa</p>
              <p className="font-semibold">{client.address}</p>
            </div>
          )}
        </div>
      </div>

      {/* Date Range */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
        <h3 className="text-base font-semibold mb-4">Periudha e Raportit</h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <Label className="text-xs font-semibold mb-2 block">Nga data</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <Label className="text-xs font-semibold mb-2 block">Deri në datë</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <Button onClick={exportAccountCardPDF} className="gap-2">
            <Download className="w-4 h-4" /> Shkarko Kartela PDF
          </Button>
        </div>
      </div>

      {/* Account Ledger */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-semibold">Lëvizjet e Llogaris</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-semibold">Nr</th>
                <th className="text-left py-3 px-4 font-semibold">Data</th>
                <th className="text-left py-3 px-4 font-semibold">Data Urdh</th>
                <th className="text-left py-3 px-4 font-semibold">Lloji</th>
                <th className="text-left py-3 px-4 font-semibold">Nr Urdh</th>
                <th className="text-left py-3 px-4 font-semibold">Metoda</th>
                <th className="text-right py-3 px-4 font-semibold">Debi (€)</th>
                <th className="text-right py-3 px-4 font-semibold">Kredia (€)</th>
                <th className="text-right py-3 px-4 font-semibold">Saldo (€)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ledger.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-muted/20' : 'hover:bg-muted/20'}>
                  <td className="py-2.5 px-4 text-xs text-muted-foreground">{row.nr}</td>
                  <td className="py-2.5 px-4 text-xs">{row.date}</td>
                  <td className="py-2.5 px-4 text-xs">{row.orderDate}</td>
                  <td className="py-2.5 px-4 text-xs font-medium">{row.type}</td>
                  <td className="py-2.5 px-4 text-xs">{row.reference}</td>
                  <td className="py-2.5 px-4 text-xs">{row.paymentMethod || '-'}</td>
                  <td className="py-2.5 px-4 text-xs text-right">{row.debit > 0 ? `${row.debit.toFixed(2)}` : '-'}</td>
                  <td className="py-2.5 px-4 text-xs text-right">{row.credit > 0 ? `${row.credit.toFixed(2)}` : '-'}</td>
                  <td className={`py-2.5 px-4 text-xs text-right font-semibold ${row.balance > 0 ? 'text-destructive' : 'text-success'}`}>
                    {row.balance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            {ledger.length > 1 && (
              <tfoot>
                <tr className="bg-primary/10 border-t-2 border-t-primary font-semibold">
                  <td colSpan="6" className="py-3 px-4">TOTALI</td>
                  <td className="py-3 px-4 text-right">{ledger.reduce((s, r) => s + r.debit, 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">{ledger.reduce((s, r) => s + r.credit, 0).toFixed(2)}</td>
                  <td className={`py-3 px-4 text-right ${finalBalance > 0 ? 'text-destructive' : 'text-success'}`}>
                    {finalBalance.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}