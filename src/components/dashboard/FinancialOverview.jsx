import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import moment from "moment";

export default function FinancialOverview() {
  const [period, setPeriod] = useState("month");
  const [chartData, setChartData] = useState([]);
  const [metrics, setMetrics] = useState({ revenue: 0, expenses: 0, profit: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    const [invoices, expenses] = await Promise.all([
      base44.entities.Invoice.list("-created_date", 500),
      base44.entities.Expense.list("-created_date", 500),
    ]);

    const now = moment();
    let data = [];
    let dateRange = { start: null, end: now };

    if (period === "today") {
      dateRange.start = now.clone().startOf('day');
      dateRange.end = now.clone().endOf('day');
    } else if (period === "month") {
      dateRange.start = now.clone().startOf('month');
      dateRange.end = now.clone().endOf('month');
    } else if (period === "year") {
      dateRange.start = now.clone().startOf('year');
      dateRange.end = now.clone().endOf('year');
    }

    // Filter data by period
    const filteredInvoices = invoices.filter(inv => {
      const invDate = moment(inv.created_date);
      return invDate.isBetween(dateRange.start, dateRange.end, null, '[]') && inv.status === 'paid';
    });

    const filteredExpenses = expenses.filter(exp => {
      const expDate = moment(exp.expense_date);
      return expDate.isBetween(dateRange.start, dateRange.end, null, '[]');
    });

    // Build chart data based on period
    if (period === "today") {
      data = [{ label: "Today", revenue: filteredInvoices.reduce((sum, i) => sum + (i.amount || 0), 0), expenses: filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0) }];
    } else if (period === "month") {
      const dayData = {};
      for (let i = 0; i < now.daysInMonth(); i++) {
        const day = now.clone().startOf('month').add(i, 'days').format('DD');
        dayData[day] = { label: day, revenue: 0, expenses: 0 };
      }
      filteredInvoices.forEach(inv => {
        const day = moment(inv.created_date).format('DD');
        if (dayData[day]) dayData[day].revenue += inv.amount || 0;
      });
      filteredExpenses.forEach(exp => {
        const day = moment(exp.expense_date).format('DD');
        if (dayData[day]) dayData[day].expenses += exp.amount || 0;
      });
      data = Object.values(dayData);
    } else if (period === "year") {
      const monthData = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach((m, i) => {
        monthData[m] = { label: m, revenue: 0, expenses: 0 };
      });
      filteredInvoices.forEach(inv => {
        const month = moment(inv.created_date).format('MMM');
        if (monthData[month]) monthData[month].revenue += inv.amount || 0;
      });
      filteredExpenses.forEach(exp => {
        const month = moment(exp.expense_date).format('MMM');
        if (monthData[month]) monthData[month].expenses += exp.amount || 0;
      });
      data = Object.values(monthData);
    }

    const totalRevenue = filteredInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    setChartData(data);
    setMetrics({
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: totalRevenue - totalExpenses,
    });
    setLoading(false);
  };

  const periodLabels = { today: 'Sot', month: 'Muaji', year: 'Viti' };

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Analiza</p>
          <h2 className="text-2xl font-bold">Pasqyra Financiare</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant={period === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('today')}
          >
            Sot
          </Button>
          <Button
            variant={period === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('month')}
          >
            Muaji
          </Button>
          <Button
            variant={period === 'year' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('year')}
          >
            Viti
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
          <p className="text-xs font-semibold uppercase text-emerald-700 mb-2">Të Ardhurat</p>
          <p className="text-3xl font-bold text-emerald-900">€{metrics.revenue.toLocaleString('sq-AL', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-4 border border-rose-200">
          <p className="text-xs font-semibold uppercase text-rose-700 mb-2">Shpenzimet</p>
          <p className="text-3xl font-bold text-rose-900">€{metrics.expenses.toLocaleString('sq-AL', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <p className="text-xs font-semibold uppercase text-blue-700 mb-2">Fitimi</p>
          <p className="text-3xl font-bold text-blue-900">€{metrics.profit.toLocaleString('sq-AL', { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {/* Chart */}
      {!loading && chartData.length > 0 && (
        <div className="h-80 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(value) => `€${value.toLocaleString('sq-AL')}`} />
              <Bar dataKey="revenue" fill="#10b981" name="Të Ardhurat" />
              <Bar dataKey="expenses" fill="#f43f5e" name="Shpenzimet" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}