import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, Download, AlertCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import jsPDF from 'jspdf';

export default function Debtors() {
  const [invoices, setInvoices] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    const data = await base44.entities.Invoice.list();
    setInvoices(data);
    calculateDebtors(data);
  };

  const calculateDebtors = (data) => {
    const debtorMap = {};
    
    data.forEach(inv => {
      if (inv.is_open && inv.status !== 'cancelled') {
        if (!debtorMap[inv.client_name]) {
          debtorMap[inv.client_name] = {
            name: inv.client_name,
            email: inv.client_email,
            total_amount: 0,
            paid_amount: 0,
            invoices: [],
            days_overdue: 0
          };
        }
        const daysOverdue = inv.due_date ? Math.max(0, Math.floor((Date.now() - new Date(inv.due_date)) / (1000 * 60 * 60 * 24))) : 0;
        debtorMap[inv.client_name].total_amount += inv.amount || 0;
        debtorMap[inv.client_name].paid_amount += inv.payment_records?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        debtorMap[inv.client_name].invoices.push({
          number: inv.invoice_number,
          amount: inv.amount,
          due_date: inv.due_date,
          status: inv.status
        });
        debtorMap[inv.client_name].days_overdue = Math.max(debtorMap[inv.client_name].days_overdue, daysOverdue);
      }
    });

    const debtors = Object.values(debtorMap).map(d => ({
      ...d,
      balance: d.total_amount - d.paid_amount
    }));

    filterDebtors(debtors, searchTerm);
  };

  const filterDebtors = (data, search) => {
    if (!search.trim()) {
      setFilteredData(data);
      return;
    }
    setFilteredData(data.filter(d => d.name.toLowerCase().includes(search.toLowerCase())));
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    filterDebtors(filteredData, value);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Debitorët', 20, 20);
    doc.setFontSize(10);
    doc.text(`Raporti i debitorëve - ${new Date().toLocaleDateString('sq-AL')}`, 20, 30);

    let y = 45;
    const pageHeight = doc.internal.pageSize.height;
    
    filteredData.forEach((debtor, idx) => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(11);
      doc.text(`${idx + 1}. ${debtor.name}`, 20, y);
      y += 6;
      
      doc.setFontSize(9);
      doc.text(`Email: ${debtor.email}`, 25, y);
      y += 5;
      doc.text(`Shuma totale: €${debtor.total_amount.toFixed(2)}`, 25, y);
      y += 5;
      doc.text(`E paguar: €${debtor.paid_amount.toFixed(2)}`, 25, y);
      y += 5;
      doc.text(`Në pritje: €${debtor.balance.toFixed(2)}`, 25, y);
      y += 5;
      
      if (debtor.days_overdue > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text(`Vonesa: ${debtor.days_overdue} ditë`, 25, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
      }
      
      y += 5;
    });

    doc.save(`Debitoret_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const totalOwed = filteredData.reduce((sum, d) => sum + d.balance, 0);
  const overdueCount = filteredData.filter(d => d.days_overdue > 0).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Debitorët</h1>
        <Button onClick={exportPDF} variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Shuma totale në pritje</p>
          <p className="text-2xl font-bold text-destructive">€{totalOwed.toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Debitorë në vonese</p>
          <p className="text-2xl font-bold text-warning">{overdueCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total debitorë</p>
          <p className="text-2xl font-bold">{filteredData.length}</p>
        </Card>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Kërko debitorin..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredData.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Nuk ka debitorë
          </Card>
        ) : (
          filteredData.sort((a, b) => b.balance - a.balance).map((debtor) => (
            <Card key={debtor.name} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold">{debtor.name}</h3>
                  <p className="text-sm text-muted-foreground">{debtor.email}</p>
                  <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Shuma totale</p>
                      <p className="font-semibold">€{debtor.total_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">E paguar</p>
                      <p className="font-semibold">€{debtor.paid_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Në pritje</p>
                      <p className="font-semibold text-destructive">€{debtor.balance.toFixed(2)}</p>
                    </div>
                    {debtor.days_overdue > 0 && (
                      <div className="flex items-center gap-1 text-warning">
                        <AlertCircle className="w-4 h-4" />
                        <div>
                          <p className="text-muted-foreground">Vonesa</p>
                          <p className="font-semibold">{debtor.days_overdue} ditë</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}