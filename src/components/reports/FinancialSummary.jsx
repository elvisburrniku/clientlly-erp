import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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