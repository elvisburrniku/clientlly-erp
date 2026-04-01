import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import moment from "moment";

export default function RevenueExpenseChart({ categoryFilter, onDataChange }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, [categoryFilter]);

  useEffect(() => {
    if (onDataChange) onDataChange(data);
  }, [data, onDataChange]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      const [invoices, expenses, products] = await Promise.all([
        base44.entities.Invoice.list("-created_date", 500),
        base44.entities.Expense.list("-created_date", 500),
        base44.entities.Product.list("-created_date", 100),
      ]);

      const months = {};
      
      // Process invoices
      invoices.forEach(inv => {
        if (!inv.created_date) return;
        const month = moment(inv.created_date).format("YYYY-MM");
        if (!months[month]) months[month] = { revenue: 0, expenses: 0, month };
        
        if (categoryFilter === "all") {
          months[month].revenue += inv.amount || 0;
        } else {
          const hasProduct = inv.items?.some(item => {
            const product = products.find(p => p.name === item.name);
            return product && product.type === categoryFilter;
          });
          if (hasProduct) {
            months[month].revenue += inv.amount || 0;
          }
        }
      });

      // Process expenses
      expenses.forEach(exp => {
        if (!exp.created_date) return;
        const month = moment(exp.expense_date).format("YYYY-MM");
        if (!months[month]) months[month] = { revenue: 0, expenses: 0, month };
        months[month].expenses += exp.amount || 0;
      });

      const sorted = Object.values(months)
        .sort((a, b) => new Date(a.month) - new Date(b.month))
        .slice(-12)
        .map(m => ({
          ...m,
          monthKey: m.month,
          month: moment(m.month).format("MMM YY"),
          profit: m.revenue - m.expenses,
        }));

      setData(sorted);
    } catch (err) {
      console.error("Chart error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="w-6 h-6 border-3 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Line Chart - Trend */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
        <h3 className="text-base font-semibold mb-4">Trend i Ardhurave & Shpenzimeve</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip 
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e0e0e0", borderRadius: "8px" }}
              formatter={(value) => `€${value.toFixed(2)}`}
            />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#4338CA" strokeWidth={2} name="Të Ardhura" />
            <Line type="monotone" dataKey="expenses" stroke="#DC2626" strokeWidth={2} name="Shpenzime" />
            <Line type="monotone" dataKey="profit" stroke="#16A34A" strokeWidth={2} name="Fitim" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart - Comparison */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
        <h3 className="text-base font-semibold mb-4">Krahasimi Mujor</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip 
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e0e0e0", borderRadius: "8px" }}
              formatter={(value) => `€${value.toFixed(2)}`}
            />
            <Legend />
            <Bar dataKey="revenue" fill="#4338CA" name="Të Ardhura" />
            <Bar dataKey="expenses" fill="#DC2626" name="Shpenzime" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total 12 Muaj</p>
          <p className="text-2xl font-bold mt-2 text-primary">€{data.reduce((s, m) => s + m.revenue, 0).toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
          <p className="text-xs text-muted-foreground mt-0.5">të ardhura</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total 12 Muaj</p>
          <p className="text-2xl font-bold mt-2 text-destructive">€{data.reduce((s, m) => s + m.expenses, 0).toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
          <p className="text-xs text-muted-foreground mt-0.5">shpenzime</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fitim Neto</p>
          <p className="text-2xl font-bold mt-2 text-emerald-600">€{data.reduce((s, m) => s + m.profit, 0).toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
          <p className="text-xs text-muted-foreground mt-0.5">12 muajt e fundit</p>
        </div>
      </div>
    </div>
  );
}