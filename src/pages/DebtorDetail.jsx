import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, FileText, ArrowLeft, Mail, Phone, AlertCircle, Send, Eye, Banknote } from 'lucide-react';
import { jsPDF } from 'jspdf';
import moment from 'moment';
import InvoicePDFButton from '../components/invoices/InvoicePDFButton';
import SendInvoiceDialog from '../components/invoices/SendInvoiceDialog';
import PaymentDialog from '../components/invoices/PaymentDialog';

export default function DebtorDetail() {
  const { debtorName } = useParams();
  const navigate = useNavigate();
  const decodedName = decodeURIComponent(debtorName);
  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendDialog, setSendDialog] = useState(null);
  const [paymentDialog, setPaymentDialog] = useState(null);

  useEffect(() => {
    loadData();
  }, [debtorName]);

  const loadData = async () => {
    const invs = await base44.entities.Invoice.list('-created_date', 500);
    const debtorInvs = invs.filter(i => i.client_name === decodedName && i.is_open && i.status !== 'cancelled');
    setAllInvoices(debtorInvs);
    setLoading(false);
  };

  const exportInvoicesPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = 297;
    const margin = 14;
    doc.setFillColor(67, 56, 202);
    doc.rect(0, 0, W, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Faturat në Pritje - ${decodedName}`, margin, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gjeneruar: ${new Date().toLocaleDateString('sq-AL')}`, W - margin, 14, { align: 'right' });
    
    const headers = ['Nr. Faturës', 'Total', 'TVSH', 'Me TVSH', 'Afati', 'Data'];
    const colW = [40, 35, 35, 35, 35, 30];
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
    allInvoices.forEach((inv, ri) => {
      if (y > 185) {
        doc.addPage();
        y = 20;
      }
      if (ri % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, y - 4, W - margin * 2, 8, 'F');
      }
      doc.setTextColor(30, 30, 30);
      const daysOverdue = inv.due_date ? Math.max(0, Math.floor((Date.now() - new Date(inv.due_date)) / (1000 * 60 * 60 * 24))) : 0;
      const row = [
        inv.invoice_number || '',
        `€${(inv.subtotal || 0).toFixed(2)}`,
        `€${(inv.vat_amount || 0).toFixed(2)}`,
        `€${(inv.amount || 0).toFixed(2)}`,
        daysOverdue > 0 ? `${daysOverdue} ditë` : moment(inv.due_date).format('DD MMM YY'),
        moment(inv.created_date).format('DD MMM YY')
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
    const totalDebt = allInvoices.reduce((s, i) => {
      const paid = i.payment_records?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      return s + (i.amount - paid);
    }, 0);
    doc.text(`Totali i Borxhit: €${totalDebt.toFixed(2)}`, W - margin, 201, { align: 'right' });
    doc.save(`borxhet_${decodedName}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const totalOwed = allInvoices.reduce((s, i) => {
    const paid = i.payment_records?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    return s + (i.amount - paid);
  }, 0);
  const totalAmount = allInvoices.reduce((s, i) => s + (i.amount || 0), 0);
  const daysOverdueMax = Math.max(...allInvoices.map(i => i.due_date ? Math.max(0, Math.floor((Date.now() - new Date(i.due_date)) / (1000 * 60 * 60 * 24))) : 0), 0);

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/debtors')} className="p-2 hover:bg-muted rounded-lg transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">{decodedName}</h1>
          <p className="text-muted-foreground mt-1">Detajet e borxhit dhe faturat në pritje</p>
        </div>
      </div>

      {/* Debtor Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej Borxh</p>
          <p className="text-2xl font-bold mt-1 text-destructive">€{totalOwed.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">në pritje</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Shuma Totale</p>
          <p className="text-2xl font-bold mt-1">€{totalAmount.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{allInvoices.length} fatura</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vonesa Maksimale</p>
          <p className="text-2xl font-bold mt-1 text-warning">{daysOverdueMax} ditë</p>
          <p className="text-xs text-muted-foreground mt-0.5">më e vjetër</p>
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">{allInvoices.length} Faturat në Pritje</h2>
          {allInvoices.length > 0 && (
            <Button onClick={exportInvoicesPDF} variant="outline" className="gap-2">
              <Download className="w-4 h-4" /> Eksporto
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Nr. Faturës</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Shuma</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Paguar</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Borxh</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Afati</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Vonesa</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Data</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nuk ka fatura në pritje</p>
                  </td>
                </tr>
              ) : (
                allInvoices.map(inv => {
                  const paid = inv.payment_records?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
                  const debt = (inv.amount || 0) - paid;
                  const daysOverdue = inv.due_date ? Math.max(0, Math.floor((Date.now() - new Date(inv.due_date)) / (1000 * 60 * 60 * 24))) : 0;
                  return (
                    <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-primary cursor-pointer hover:underline" onClick={() => navigate(`/invoices/${inv.id}`)}>
                          {inv.invoice_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">€{(inv.amount || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-success">€{paid.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-destructive">€{debt.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm">{inv.due_date ? moment(inv.due_date).format('DD MMM YY') : '—'}</td>
                      <td className="px-6 py-4">
                        {daysOverdue > 0 ? (
                          <span className="text-xs font-semibold bg-destructive/10 text-destructive px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3" /> {daysOverdue} ditë
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{moment(inv.created_date).format('DD MMM YY')}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1.5 justify-end">
                          <InvoicePDFButton invoice={inv} />
                          <button
                            onClick={() => navigate(`/invoices/${inv.id}`)}
                            className="p-1.5 hover:bg-muted rounded-lg transition"
                            title="Shiko Faturën"
                          >
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => setSendDialog(inv)}
                            className="p-1.5 hover:bg-muted rounded-lg transition"
                            title="Dërgo Faturën"
                          >
                            <Send className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => setPaymentDialog(inv)}
                            className="p-1.5 hover:bg-muted rounded-lg transition"
                            title="Shto Pagesë"
                          >
                            <Banknote className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialogs */}
      <SendInvoiceDialog invoice={sendDialog} open={!!sendDialog} onClose={() => setSendDialog(null)} />
      <PaymentDialog invoice={paymentDialog} isOpen={!!paymentDialog} onOpenChange={(o) => { if (!o) setPaymentDialog(null); }} onPaymentAdded={loadData} />
    </div>
  );
}