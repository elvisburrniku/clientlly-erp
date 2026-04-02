import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';

export default function ClientRevenueAnalysis() {
  const [invoices, setInvoices] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [paymentMethodData, setPaymentMethodData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await base44.entities.Invoice.list('-created_date', 500);
    setInvoices(data);
    
    // Klientët më të mirë
    const clientMap = {};
    data.forEach(inv => {
      if (!clientMap[inv.client_name]) {
        clientMap[inv.client_name] = { name: inv.client_name, revenue: 0, invoiceCount: 0 };
      }
      clientMap[inv.client_name].revenue += inv.amount || 0;
      clientMap[inv.client_name].invoiceCount += 1;
    });
    
    const sorted = Object.values(clientMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    setTopClients(sorted);
    
    // Pagesa sipas metodës
    const paymentMap = {};
    data.forEach(inv => {
      const method = inv.payment_method || 'other';
      if (!paymentMap[method]) paymentMap[method] = 0;
      paymentMap[method] += inv.amount || 0;
    });
    
    const paymentData = Object.entries(paymentMap).map(([name, value]) => ({ name, value }));
    setPaymentMethodData(paymentData);
  };

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Klientët më të Mirë (Top 10)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topClients}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(v) => `€${v.toFixed(2)}`} />
              <Bar dataKey="revenue" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Pagesa sipas Metodës</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={paymentMethodData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: €${value.toFixed(0)}`} outerRadius={80} fill="#8884d8" dataKey="value">
                {paymentMethodData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => `€${v.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Përmbledhje Klientësh</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4 font-semibold">Klienti</th>
                <th className="text-right py-2 px-4 font-semibold">Te Ardhura</th>
                <th className="text-right py-2 px-4 font-semibold">Nr. Faturave</th>
                <th className="text-right py-2 px-4 font-semibold">Mesatarja/Faturë</th>
              </tr>
            </thead>
            <tbody>
              {topClients.map(client => (
                <tr key={client.name} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4">{client.name}</td>
                  <td className="text-right py-3 px-4 font-semibold">€{client.revenue.toFixed(2)}</td>
                  <td className="text-right py-3 px-4">{client.invoiceCount}</td>
                  <td className="text-right py-3 px-4">€{(client.revenue / client.invoiceCount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}