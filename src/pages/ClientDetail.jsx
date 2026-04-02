import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, FileText, ArrowLeft, Mail, Phone, MapPin, Send, Eye, Banknote } from 'lucide-react';
import { jsPDF } from 'jspdf';
import moment from 'moment';
import InvoicePDFButton from '../components/invoices/InvoicePDFButton';
import SendInvoiceDialog from '../components/invoices/SendInvoiceDialog';
import PaymentDialog from '../components/invoices/PaymentDialog';

export default function ClientDetail() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendDialog, setSendDialog] = useState(null);
  const [paymentDialog, setPaymentDialog] = useState(null);

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

  const exportInvoicesPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = 297;
    const margin = 14;
    doc.setFillColor(67, 56, 202);
    doc.rect(0, 0, W, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Faturat e ${client?.name || 'Klientit'}`, margin, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gjeneruar: ${new Date().toLocaleDateString('sq-AL')}`, W - margin, 14, { align: 'right' });
    
    const headers = ['Nr. Faturës', 'Total', 'TVSH', 'Me TVSH', 'Statusi', 'Data'];
    const colW = [40, 35, 35, 35, 30, 30];
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
    invoices.forEach((inv, ri) => {
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
        inv.invoice_number || '',
        `€${(inv.subtotal || 0).toFixed(2)}`,
        `€${(inv.vat_amount || 0).toFixed(2)}`,
        `€${(inv.amount || 0).toFixed(2)}`,
        inv.status || '',
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
    doc.text(`Totali: €${invoices.reduce((s, i) => s + (i.amount || 0), 0).toFixed(2)}`, W - margin, 201, { align: 'right' });
    doc.save(`faturat_${client?.name || 'klient'}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

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

  const totalSpent = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);
  const openInvoices = invoices.filter(i => i.is_open).length;

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/clients')} className="p-2 hover:bg-muted rounded-lg transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <p className="text-muted-foreground mt-1">Detajet e klientit dhe faturat e tij</p>
        </div>
      </div>

      {/* Client Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6 lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Informacioni i Klientit</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Email</p>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium">{client.email}</p>
              </div>
            </div>
            {client.phone && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Telefon</p>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">{client.phone}</p>
                </div>
              </div>
            )}
            {client.nipt && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">NIPT</p>
                <p className="text-sm font-medium">{client.nipt}</p>
              </div>
            )}
            {client.address && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Adresë</p>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">{client.address}</p>
                </div>
              </div>
            )}
          </div>
          {client.notes && (
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground mb-2">Shënime</p>
              <p className="text-sm">{client.notes}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
            <p className="text-xs text-muted-foreground mb-2">Shuma Totale</p>
            <p className="text-2xl font-bold text-primary">€{totalSpent.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-2">{invoices.length} fatura</p>
          </div>
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
            <p className="text-xs text-muted-foreground mb-2">Te Arketuara</p>
            <p className="text-2xl font-bold text-success">€{totalPaid.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-2">Paguar</p>
          </div>
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
            <p className="text-xs text-muted-foreground mb-2">Në Pritje</p>
            <p className="text-2xl font-bold text-destructive">€{(totalSpent - totalPaid).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-2">{openInvoices} fatura hapur</p>
          </div>
        </div>
      </div>

      {/* Invoices Section */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">{invoices.length} Faturat e Klientit</h2>
          {invoices.length > 0 && (
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
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Subtotal</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">TVSH</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Total</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Statusi</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Data</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nuk ka fatura për këtë klient</p>
                  </td>
                </tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-primary cursor-pointer hover:underline" onClick={() => navigate(`/invoices/${inv.id}`)}>
                        {inv.invoice_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">€{(inv.subtotal || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">€{(inv.vat_amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm font-semibold">€{(inv.amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium bg-muted px-2.5 py-1 rounded-full capitalize">
                        {inv.status || 'draft'}
                      </span>
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
                        {inv.is_open && (
                          <button
                            onClick={() => setPaymentDialog(inv)}
                            className="p-1.5 hover:bg-muted rounded-lg transition"
                            title="Shto Pagesë"
                          >
                            <Banknote className="w-4 h-4 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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