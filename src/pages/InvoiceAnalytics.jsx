import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, BarChart3 } from 'lucide-react';
import jsPDF from 'jspdf';
import moment from 'moment';

export default function InvoiceAnalytics() {
  const [invoices, setInvoices] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await base44.entities.Invoice.list('-created_date', 500);
    setInvoices(data);

    // Mujore
    const monthMap = {};
    data.forEach(inv => {
      const month = moment(inv.created_date).format('MMM YYYY');
      if (!monthMap[month]) {
        monthMap[month] = { name: month, revenue: 0, invoices: 0, paid: 0, unpaid: 0 };
      }
      monthMap[month].revenue += inv.amount || 0;
      monthMap[month].invoices += 1;
      if (inv.status === 'paid') monthMap[month].paid += inv.amount || 0;
      else monthMap[month].unpaid += inv.amount || 0;
    });

    const sorted = Object.values(monthMap).sort((a, b) => new Date(a.name) - new Date(b.name));
    setMonthlyData(sorted);

    // Statusi
    const statuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
    const statusMap = statuses.map(s => ({
      name: s.charAt(0).toUpperCase() + s.slice(1),
      value: data.filter(inv => inv.status === s).length
    }));
    setStatusData(statusMap);

    setLoading(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Analiza e Faturave', 20, 20);
    
    doc.setFontSize(10);
    const totalRevenue = invoices.reduce((s, i) => s + (i.amount || 0), 0);
    const paidRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);
    
    doc.text(`Totali i Faturave: €${totalRevenue.toFixed(2)}`, 20, 35);
    doc.text(`Te Arkëtuara: €${paidRevenue.toFixed(2)}`, 20, 45);
    doc.text(`Në Pritje: €${(totalRevenue - paidRevenue).toFixed(2)}`, 20, 55);
    doc.text(`Numri i Faturave: ${invoices.length}`, 20, 65);
    
    let y = 80;
    doc.text('Analiza Mujore:', 20, y);
    y += 10;
    
    monthlyData.slice(-6).forEach(m => {
      doc.text(`${m.name} - Revenue: €${m.revenue.toFixed(2)} | Paid: €${m.paid.toFixed(2)} | Unpaid: €${m.unpaid.toFixed(2)}`, 20, y);
      y += 7;
    });
    
    doc.save(`invoice-analytics-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>;
  }

  const totalRevenue = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const paidRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analiza e Faturave</h1>
          <p className="text-muted-foreground mt-1">Shiko trendet dhe statistikat e faturave</p>
        </div>
        <Button onClick={exportPDF} variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Eksporto PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Totali i Faturave</p>
          <p className="text-2xl font-bold">€{totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-2">{invoices.length} fatura</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Te Arkëtuara</p>
          <p className="text-2xl font-bold text-success">€{paidRevenue.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-2">{((paidRevenue/totalRevenue)*100).toFixed(1)}% e totalit</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Në Pritje</p>
          <p className="text-2xl font-bold text-warning">€{(totalRevenue - paidRevenue).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-2">{invoices.filter(i => i.is_open).length} fatura</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Mesatarja/Faturë</p>
          <p className="text-2xl font-bold">€{(totalRevenue/invoices.length).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-2">për {invoices.length} fatura</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Te Ardhura Mujore</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(v) => `€${v.toFixed(2)}`} />
            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Paguar vs. Në Pritje (Mujore)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(v) => `€${v.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="paid" fill="#10b981" name="Te Arkëtuara" />
              <Bar dataKey="unpaid" fill="#ef4444" name="Në Pritje" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Shpërndarja sipas Statusit</h3>
          <div className="space-y-3">
            {statusData.map(s => (
              <div key={s.name} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="font-medium">{s.name}</span>
                <span className="text-sm font-semibold bg-primary text-white px-3 py-1 rounded-full">{s.value} fatura</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}