import { useState, useEffect } from "react";
import { Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import RevenueExpenseChart from "@/components/reports/RevenueExpenseChart";
import moment from "moment";

export default function Reports() {

  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [cashTransactions, setCashTransactions] = useState([]);
  const [loadingReport, setLoadingReport] = useState(null);
  const [selectedReports, setSelectedReports] = useState(['invoices']);
  const [dateFrom, setDateFrom] = useState(() => moment().subtract(12, 'months').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(() => moment().format('YYYY-MM-DD'));

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    const [invs, exps, sups, cashTxns] = await Promise.all([
      base44.entities.Invoice.list("-created_date", 500),
      base44.entities.Expense.list("-created_date", 500),
      base44.entities.Supplier.list("-created_date", 500),
      base44.entities.CashTransaction.list("-created_date", 500),
    ]);
    setInvoices(invs);
    setExpenses(exps);
    setSuppliers(sups);
    setCashTransactions(cashTxns);

    // Calculate debtors from invoices
    const debtorMap = {};
    invs.forEach((inv) => {
      if (inv.is_open) {
        if (!debtorMap[inv.client_name]) {
          debtorMap[inv.client_name] = { name: inv.client_name, total: 0 };
        }
        debtorMap[inv.client_name].total += inv.amount;
      }
    });
    setDebtors(Object.values(debtorMap));
  };

  const handleDownload = () => {
    let delay = 0;
    if (selectedReports.includes('invoices')) { setTimeout(() => downloadReport('invoices', 'Faturat', invoices), delay); delay += 500; }
    if (selectedReports.includes('debtors')) { setTimeout(() => downloadReport('debtors', 'Borxhet', debtors), delay); delay += 500; }
    if (selectedReports.includes('suppliers')) { setTimeout(() => downloadReport('suppliers', 'Furnitorët', suppliers), delay); delay += 500; }
    if (selectedReports.includes('cashbox')) { setTimeout(() => downloadReport('cashbox', 'Arka', cashTransactions), delay); }
  };

  const toggleReport = (report) => {
    setSelectedReports(prev => 
      prev.includes(report) ? prev.filter(r => r !== report) : [...prev, report]
    );
  };

  const downloadReport = async (type, title, data) => {
    setLoadingReport(type);
    try {
      const { jsPDF } = await import('jspdf');
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
      doc.text(title.toUpperCase(), margin, 15);

      // Date
      doc.setFontSize(8);
      doc.text(`Data e Raportit: ${moment().format('DD MMM YYYY')}`, W - margin, 15, { align: 'right' });

      y = 35;

      // Table header
      doc.setFillColor(107, 114, 126);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');

      if (type === 'invoices') {
        doc.rect(margin, y - 4, cw, 7, 'F');
        doc.text('Nr. Faturës', margin + 2, y);
        doc.text('Klienti', margin + 40, y);
        doc.text('Shuma', W - margin - 2, y, { align: 'right' });
        y += 8;
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'normal');
        invoices.slice(0, 100).forEach((inv, i) => {
          if (y > 270) { doc.addPage(); y = 20; }
          if (i % 2 === 0) { doc.setFillColor(240, 240, 240); doc.rect(margin, y - 3, cw, 5, 'F'); }
          doc.text(inv.invoice_number || '', margin + 2, y);
          doc.text((inv.client_name || '').slice(0, 25), margin + 40, y);
          doc.text(`€${inv.amount.toFixed(2)}`, W - margin - 2, y, { align: 'right' });
          y += 5;
        });
      } else if (type === 'debtors') {
        doc.rect(margin, y - 4, cw, 7, 'F');
        doc.text('Debitori', margin + 2, y);
        doc.text('Borxhi', W - margin - 2, y, { align: 'right' });
        y += 8;
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'normal');
        debtors.slice(0, 100).forEach((d, i) => {
          if (y > 270) { doc.addPage(); y = 20; }
          if (i % 2 === 0) { doc.setFillColor(240, 240, 240); doc.rect(margin, y - 3, cw, 5, 'F'); }
          doc.text(d.name || '', margin + 2, y);
          doc.text(`€${d.total.toFixed(2)}`, W - margin - 2, y, { align: 'right' });
          y += 5;
        });
      } else if (type === 'suppliers') {
        doc.rect(margin, y - 4, cw, 7, 'F');
        doc.text('Furnitori', margin + 2, y);
        doc.text('Email', margin + 60, y);
        y += 8;
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'normal');
        suppliers.slice(0, 100).forEach((s, i) => {
          if (y > 270) { doc.addPage(); y = 20; }
          if (i % 2 === 0) { doc.setFillColor(240, 240, 240); doc.rect(margin, y - 3, cw, 5, 'F'); }
          doc.text(s.name || '', margin + 2, y);
          doc.text((s.email || '').slice(0, 30), margin + 60, y);
          y += 5;
        });
      } else if (type === 'cashbox') {
        doc.rect(margin, y - 4, cw, 7, 'F');
        doc.text('Data', margin + 2, y);
        doc.text('Tipi', margin + 40, y);
        doc.text('Shuma', W - margin - 2, y, { align: 'right' });
        y += 8;
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'normal');
        cashTransactions.slice(0, 100).forEach((t, i) => {
          if (y > 270) { doc.addPage(); y = 20; }
          if (i % 2 === 0) { doc.setFillColor(240, 240, 240); doc.rect(margin, y - 3, cw, 5, 'F'); }
          doc.text(moment(t.created_date).format('DD MMM'), margin + 2, y);
          doc.text(t.type === 'cash_in' ? 'Hyrje' : 'Dalje', margin + 40, y);
          doc.text(`€${t.amount.toFixed(2)}`, W - margin - 2, y, { align: 'right' });
          y += 5;
        });
      }

      doc.save(`${type}-raporti.pdf`);
    } catch (error) {
      console.error('Error generating report:', error);
    }
    setLoadingReport(null);
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Analiza</p>
          <h1 className="text-3xl font-bold tracking-tight">Raportet Financiare</h1>
        </div>
        <p className="text-sm text-muted-foreground">Shiko trendet e të ardhurave dhe shpenzimeve përmes grafikëve të avancuar</p>
      </div>

      {/* Date Filters */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Zgjedh Periudhën</h3>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <Label className="text-xs font-semibold mb-2 block">Nga data</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <Label className="text-xs font-semibold mb-2 block">Deri në datë</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <RevenueExpenseChart dateFrom={dateFrom} dateTo={dateTo} />

      {/* Quick Download Reports */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
        <h3 className="text-base font-semibold mb-4">Shkarkoni Raportet</h3>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleReport('invoices')}>
              <Checkbox checked={selectedReports.includes('invoices')} onChange={() => toggleReport('invoices')} />
              <Label className="cursor-pointer">Faturat</Label>
            </div>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleReport('debtors')}>
              <Checkbox checked={selectedReports.includes('debtors')} onChange={() => toggleReport('debtors')} />
              <Label className="cursor-pointer">Borxhet</Label>
            </div>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleReport('suppliers')}>
              <Checkbox checked={selectedReports.includes('suppliers')} onChange={() => toggleReport('suppliers')} />
              <Label className="cursor-pointer">Furnitorët</Label>
            </div>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleReport('cashbox')}>
              <Checkbox checked={selectedReports.includes('cashbox')} onChange={() => toggleReport('cashbox')} />
              <Label className="cursor-pointer">Arka</Label>
            </div>
          </div>
          <Button onClick={handleDownload} disabled={loadingReport !== null || selectedReports.length === 0} className="gap-2" variant="default">
            <Download className="w-4 h-4" /> {loadingReport ? 'Duke shkarkuar...' : 'Shkarko Të Zgjedhurat'}
          </Button>
        </div>
      </div>
    </div>
  );
}