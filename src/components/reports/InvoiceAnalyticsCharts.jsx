import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function InvoiceAnalyticsCharts({ invoices, expenses }) {
  const currentYear = new Date().getFullYear();
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Monthly Revenue vs Expenses
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthInvoices = invoices.filter(inv => {
      const date = new Date(inv.created_date);
      return date.getMonth() === i && date.getFullYear() === currentYear && inv.status === 'paid';
    });
    const monthExpenses = expenses.filter(exp => {
      const date = new Date(exp.created_date);
      return date.getMonth() === i && date.getFullYear() === currentYear;
    });
    return {
      month: monthLabels[i],
      revenue: monthInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
      expenses: monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
    };
  });

  // Invoice Status Distribution
  const invoiceStatus = [
    { name: 'Paid', value: invoices.filter(inv => inv.status === 'paid').length, fill: '#16a34a' },
    { name: 'Unpaid', value: invoices.filter(inv => inv.status === 'unpaid').length, fill: '#ea580c' },
    { name: 'Overdue', value: invoices.filter(inv => inv.status === 'overdue').length, fill: '#dc2626' },
    { name: 'Partially Paid', value: invoices.filter(inv => inv.status === 'partially_paid').length, fill: '#eab308' },
  ];

  // Monthly Invoice Count
  const monthlyInvoiceCount = Array.from({ length: 12 }, (_, i) => {
    const count = invoices.filter(inv => {
      const date = new Date(inv.created_date);
      return date.getMonth() === i && date.getFullYear() === currentYear;
    }).length;
    return { month: monthLabels[i], invoices: count };
  });

  return (
    <div className="space-y-6">
      {/* Revenue vs Expenses */}
      <div className="bg-white rounded-lg border border-border/60 shadow-sm p-6">
        <h3 className="text-base font-semibold mb-4">Revenue vs Expenses (2026)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} name="Revenue" />
            <Line type="monotone" dataKey="expenses" stroke="#3b82f6" strokeWidth={2} name="Expenses" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Invoices */}
      <div className="bg-white rounded-lg border border-border/60 shadow-sm p-6">
        <h3 className="text-base font-semibold mb-4">Monthly Invoice Count</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyInvoiceCount}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="invoices" fill="#6366f1" name="Invoices" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Invoice Status */}
      <div className="bg-white rounded-lg border border-border/60 shadow-sm p-6">
        <h3 className="text-base font-semibold mb-4">Invoice Status Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={invoiceStatus} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} fill="#8884d8" dataKey="value">
              {invoiceStatus.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => value} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}