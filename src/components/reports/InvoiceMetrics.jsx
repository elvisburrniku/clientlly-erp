export default function InvoiceMetrics({ invoices, expenses }) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const currentMonthInvoices = invoices.filter(inv => {
    const date = new Date(inv.created_date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const lastMonthInvoices = invoices.filter(inv => {
    const date = new Date(inv.created_date);
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return date.getMonth() === lastMonth && date.getFullYear() === lastYear;
  });

  const currentMonthExpenses = expenses.filter(exp => {
    const date = new Date(exp.created_date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const totalRevenue = currentMonthInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const lastMonthRevenue = lastMonthInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const revenueGrowth = lastMonthRevenue ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;
  
  const totalExpenses = currentMonthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const grossProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue ? (grossProfit / totalRevenue * 100) : 0;

  const paidInvoices = currentMonthInvoices.filter(inv => inv.status === 'paid').length;
  const unpaidInvoices = currentMonthInvoices.filter(inv => ['unpaid', 'overdue', 'partially_paid'].includes(inv.status)).length;
  const overdueInvoices = currentMonthInvoices.filter(inv => inv.status === 'overdue').length;

  const metrics = [
    { label: 'Total Revenue', value: `€${totalRevenue.toFixed(2)}`, change: `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%`, color: 'text-green-600' },
    { label: 'Total Expenses', value: `€${totalExpenses.toFixed(2)}`, change: 'This month', color: 'text-blue-600' },
    { label: 'Gross Profit', value: `€${grossProfit.toFixed(2)}`, change: `${profitMargin.toFixed(1)}% margin`, color: 'text-indigo-600' },
    { label: 'Invoices', value: currentMonthInvoices.length, change: `${paidInvoices} paid, ${unpaidInvoices} unpaid`, color: 'text-orange-600' },
    { label: 'Overdue', value: overdueInvoices, change: `Need attention`, color: 'text-red-600' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {metrics.map((metric, idx) => (
        <div key={idx} className="bg-white rounded-lg border border-border/60 shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">{metric.label}</p>
          <p className={`text-2xl font-bold ${metric.color} mb-2`}>{metric.value}</p>
          <p className="text-xs text-muted-foreground">{metric.change}</p>
        </div>
      ))}
    </div>
  );
}