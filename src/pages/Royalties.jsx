import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import moment from "moment";
import { jsPDF } from "jspdf";

export default function Royalties() {
  const [invoices, setInvoices] = useState([]);
  const [dateFrom, setDateFrom] = useState(() => moment().subtract(12, 'months').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(() => moment().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(false);
  const [royaltyPercentage, setRoyaltyPercentage] = useState(6);
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadData();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const sets = await base44.entities.InvoiceSettings.list("-created_date", 1);
    if (sets.length > 0) {
      setSettings(sets[0]);
      setRoyaltyPercentage(sets[0].royalty_percentage || 6);
    }
  };

  const loadData = async () => {
    const data = await base44.entities.Invoice.list("-created_date", 500);
    setInvoices(data);
  };

  const filterDataByDate = (data) => {
    return data.filter(item => {
      const itemDate = moment(item.created_date);
      return itemDate.isBetween(moment(dateFrom), moment(dateTo), null, '[]');
    });
  };

  const saveRoyaltyPercentage = async () => {
    setSavingSettings(true);
    try {
      const shouldSave = window.confirm(`Deshironi ta zgjdhni ${royaltyPercentage}% si perqindjen e radhes ne te ardhmen?`);
      if (shouldSave) {
        if (settings) {
          await base44.entities.InvoiceSettings.update(settings.id, { royalty_percentage: royaltyPercentage });
        } else {
          await base44.entities.InvoiceSettings.create({ royalty_percentage: royaltyPercentage });
          await loadSettings();
        }
        alert('Perqindja e royalties u ruajt!');
      }
    } catch (error) {
      console.error('Error saving royalty percentage:', error);
      alert('Gabim gjate ruajtjes');
    }
    setSavingSettings(false);
  };

  const downloadRoyaltiesPDF = async () => {
    setLoading(true);
    try {
      const filteredData = filterDataByDate(invoices);
      const doc = new jsPDF();
      const W = 210;
      const margin = 14;
      const cw = W - margin * 2;
      let y = 20;

      // Header
      doc.setFillColor(107, 114, 126);
      doc.rect(0, 0, W, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`ROYALTIES (${royaltyPercentage}% PA TVSH)`, margin, 15);

      // Date
      doc.setFontSize(8);
      doc.text(`Data e Raportit: ${moment().format('DD MMM YYYY')}`, W - margin, 15, { align: 'right' });

      y = 35;

      // Table header
      doc.setFillColor(107, 114, 126);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.rect(margin, y - 4, cw, 7, 'F');
      doc.text('Nr. Faturës', margin + 2, y);
      doc.text('Klienti', margin + 40, y);
      doc.text('Pa TVSH (€)', margin + 110, y);
      doc.text('Royalties (€)', W - margin - 2, y, { align: 'right' });
      y += 8;

      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'normal');
      
      filteredData.forEach((inv, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        if (i % 2 === 0) { doc.setFillColor(240, 240, 240); doc.rect(margin, y - 3, cw, 5, 'F'); }
        
        const subtotal = inv.subtotal || (inv.amount / 1.2);
        const royalty = subtotal * (royaltyPercentage / 100);
        
        doc.text(inv.invoice_number || '', margin + 2, y);
        doc.text((inv.client_name || '').slice(0, 25), margin + 40, y);
        doc.text(`€${subtotal.toFixed(2)}`, margin + 110, y);
        doc.text(`€${royalty.toFixed(2)}`, W - margin - 2, y, { align: 'right' });
        y += 5;
      });

      // Footer with totals
      const totalSubtotal = filteredData.reduce((sum, inv) => sum + (inv.subtotal || inv.amount / 1.2), 0);
      const totalRoyalties = totalSubtotal * (royaltyPercentage / 100);
      
      doc.setFillColor(107, 114, 126);
      doc.rect(margin, y + 2, cw, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTALI', margin + 40, y + 6);
      doc.text(`€${totalSubtotal.toFixed(2)}`, margin + 110, y + 6);
      doc.text(`€${totalRoyalties.toFixed(2)}`, W - margin - 2, y + 6, { align: 'right' });

      doc.save(`royalties-${dateFrom}-to-${dateTo}.pdf`);
    } catch (error) {
      console.error('Error generating royalties PDF:', error);
    }
    setLoading(false);
  };

  const filteredInvoices = filterDataByDate(invoices);
  const totalSubtotal = filteredInvoices.reduce((sum, inv) => sum + (inv.subtotal || inv.amount / 1.2), 0);
  const totalRoyalties = totalSubtotal * (royaltyPercentage / 100);

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Analiza</p>
          <h1 className="text-3xl font-bold tracking-tight">Royalties</h1>
        </div>
        <p className="text-sm text-muted-foreground">{royaltyPercentage}% nga vlera pa TVSH e secilit fature</p>
      </div>

      {/* Royalty Percentage */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
        <h3 className="text-base font-semibold mb-4">Perqindja e Royalties</h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 max-w-xs">
            <Label className="text-xs font-semibold mb-2 block">Perqindja (%)</Label>
            <Input type="number" min="0" max="100" step="0.1" value={royaltyPercentage} onChange={(e) => setRoyaltyPercentage(parseFloat(e.target.value) || 0)} />
          </div>
          <Button onClick={saveRoyaltyPercentage} disabled={savingSettings} variant="outline" className="gap-2">
            {savingSettings ? 'Duke ruajtur...' : 'Ruaj si Default'}
          </Button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
        <h3 className="text-base font-semibold mb-4">Periudha</h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <Label className="text-xs font-semibold mb-2 block">Nga data</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <Label className="text-xs font-semibold mb-2 block">Deri në datë</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <Button onClick={downloadRoyaltiesPDF} disabled={loading} className="gap-2">
            <Download className="w-4 h-4" /> {loading ? 'Duke shkarkuar...' : 'Shkarko PDF'}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Faturat</p>
          <p className="text-2xl font-bold mt-1">{filteredInvoices.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total Pa TVSH</p>
          <p className="text-2xl font-bold mt-1 text-primary">€{totalSubtotal.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total Royalties ({royaltyPercentage}%)</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">€{totalRoyalties.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground w-10">Nr</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Fatura</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Klient</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Pa TVSH (€)</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Royalties ({royaltyPercentage}%) (€)</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-muted-foreground">Nuk ka fatura për këtë periudhë</td>
                </tr>
              ) : (
                filteredInvoices.map((inv, i) => {
                  const subtotal = inv.subtotal || (inv.amount / 1.2);
                  const royalty = subtotal * (royaltyPercentage / 100);
                  return (
                    <tr key={inv.id} className={i % 2 === 0 ? "bg-muted/30 hover:bg-muted/50" : "hover:bg-muted/30"}>
                      <td className="py-3 px-4 text-muted-foreground text-sm">{i + 1}</td>
                      <td className="py-3 px-4">{inv.invoice_number}</td>
                      <td className="py-3 px-4">{inv.client_name}</td>
                      <td className="text-right py-3 px-4">€{subtotal.toFixed(2)}</td>
                      <td className="text-right py-3 px-4 font-semibold">€{royalty.toFixed(2)}</td>
                    </tr>
                  );
                })
              )}
              {filteredInvoices.length > 0 && (
                <tr className="border-t-2 border-t-foreground font-semibold bg-primary/5">
                  <td colSpan="3" className="py-3 px-4">Totali</td>
                  <td className="text-right py-3 px-4">€{totalSubtotal.toFixed(2)}</td>
                  <td className="text-right py-3 px-4">€{totalRoyalties.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}