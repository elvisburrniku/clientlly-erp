import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import moment from "moment";

export default function FinancialSummary() {
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState({ revenue: 0, expenses: 0, debt: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [invoices, expenses] = await Promise.all([
      base44.entities.Invoice.list("-created_date", 500),
      base44.entities.Expense.list("-created_date", 500),
    ]);

    // Calculate monthly data for last 12 months
    const monthlyData = {};
    const now = moment();

    for (let i = 11; i >= 0; i--) {
      const month = now.clone().subtract(i, 'months');
      const monthKey = month.format('MMM');
      monthlyData[monthKey] = { month: monthKey, revenue: 0, expenses: 0 };
    }

    invoices.forEach((inv) => {
      const month = moment(inv.created_date).format('MMM');
      if (monthlyData[month] && inv.status === 'paid') {
        monthlyData[month].revenue += inv.amount || 0;
      }
    });

    expenses.forEach((exp) => {
      const month = moment(exp.expense_date).format('MMM');
      if (monthlyData[month]) {
        monthlyData[month].expenses += exp.amount || 0;
      }
    });

    const data = Object.values(monthlyData);
    setChartData(data);

    // Calculate summary
    const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalDebt = invoices.filter(i => i.is_open).reduce((sum, inv) => sum + (inv.amount || 0), 0);

    setStats({
      revenue: totalRevenue,
      expenses: totalExpenses,
      debt: totalDebt,
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
          <p className="text-xs font-semibold uppercase text-emerald-700 mb-1">Të Ardhurat</p>
          <p className="text-2xl font-bold text-emerald-900">€{stats.revenue.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-4 border border-rose-200">
          <p className="text-xs font-semibold uppercase text-rose-700 mb-1">Shpenzimet</p>
          <p className="text-2xl font-bold text-rose-900">€{stats.expenses.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
          <p className="text-xs font-semibold uppercase text-amber-700 mb-1">Borxhi</p>
          <p className="text-2xl font-bold text-amber-900">€{stats.debt.toLocaleString()}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
        <h3 className="text-base font-semibold mb-4">Trendet e Financave</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `€${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name="Të Ardhurat" />
              <Bar dataKey="expenses" fill="#f43f5e" name="Shpenzimet" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}