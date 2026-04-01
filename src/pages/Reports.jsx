import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowDownCircle, ArrowUpCircle, Wallet, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(221, 83%, 53%)", "hsl(0, 84%, 60%)", "hsl(160, 60%, 45%)", "hsl(38, 92%, 50%)"];

export default function Reports() {
  const [stats, setStats] = useState({ inflow: 0, expenses: 0, balance: 0, profit: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    const [transactions, invoices] = await Promise.all([
      base44.entities.CashTransaction.list(),
      base44.entities.Invoice.list(),
    ]);

    const inflow = transactions.filter((t) => t.type === "cash_in").reduce((s, t) => s + (t.amount || 0), 0);
    const expenses = transactions.filter((t) => t.type === "cash_out").reduce((s, t) => s + (t.amount || 0), 0);
    const totalInvoiced = invoices.reduce((s, i) => s + (i.amount || 0), 0);

    setStats({
      inflow,
      expenses,
      balance: inflow - expenses,
      profit: totalInvoiced - expenses,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const summaryCards = [
    { icon: ArrowDownCircle, label: "Hyrjet totale", value: stats.inflow, color: "text-success", bg: "bg-success/10" },
    { icon: ArrowUpCircle, label: "Shpenzimet totale", value: stats.expenses, color: "text-destructive", bg: "bg-destructive/10" },
    { icon: Wallet, label: "Bilanci i arkës", value: stats.balance, color: "text-primary", bg: "bg-primary/10" },
    { icon: TrendingUp, label: "Fitimi", value: stats.profit, color: "text-success", bg: "bg-success/10" },
  ];

  const pieData = [
    { name: "Hyrjet", value: stats.inflow },
    { name: "Shpenzimet", value: stats.expenses },
  ].filter((d) => d.value > 0);

  const barData = [
    { name: "Hyrjet", value: stats.inflow },
    { name: "Shpenzimet", value: stats.expenses },
    { name: "Fitimi", value: stats.profit },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Raportet Financiare</h1>
        <p className="text-sm text-muted-foreground mt-1">Përmbledhje e gjendjes financiare</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-card rounded-xl border border-border p-5 hover:-translate-y-0.5 transition-all duration-300 hover:shadow-lg hover:shadow-black/5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className={`text-xl font-bold ${card.color}`}>€{card.value.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-base font-semibold mb-4">Pasqyra e Financave</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(v) => `€${v.toLocaleString()}`} />
                <Tooltip formatter={(v) => [`€${v.toLocaleString()}`, undefined]} />
                <Bar dataKey="value" fill="hsl(221, 83%, 53%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-base font-semibold mb-4">Hyrjet vs Shpenzimet</h3>
          <div className="h-[280px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`€${v.toLocaleString()}`, undefined]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Nuk ka të dhëna
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}