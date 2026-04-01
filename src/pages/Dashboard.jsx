import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, TrendingDown, CreditCard, Users, BarChart3, Wallet, AlertTriangle } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import RevenueChart from "../components/dashboard/RevenueChart";
import UndeliveredCashAlert from "../components/dashboard/UndeliveredCashAlert";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalExpenses: 0,
    totalDebt: 0,
    clientCount: 0,
    cashBalance: 0,
    undeliveredCash: 0,
  });
  const [undeliveredUsers, setUndeliveredUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [invoices, transactions, users] = await Promise.all([
        base44.entities.Invoice.list(),
        base44.entities.CashTransaction.list(),
        base44.entities.User.list(),
      ]);

      const totalInvoices = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
      const cashIn = transactions.filter(t => t.type === "cash_in").reduce((sum, t) => sum + (t.amount || 0), 0);
      const cashOut = transactions.filter(t => t.type === "cash_out").reduce((sum, t) => sum + (t.amount || 0), 0);
      const cashBalance = cashIn - cashOut;
      
      const usersWithCash = users.filter(u => (u.cash_on_hand || 0) > 0);
      const totalUndelivered = usersWithCash.reduce((sum, u) => sum + (u.cash_on_hand || 0), 0);

      const uniqueClients = new Set(invoices.map(i => i.client_name)).size;

      setStats({
        totalInvoices,
        totalExpenses: cashOut,
        totalDebt: totalInvoices - cashIn,
        clientCount: uniqueClients,
        cashBalance,
        undeliveredCash: totalUndelivered,
      });
      setUndeliveredUsers(usersWithCash);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    { icon: FileText,   title: "Total Faturat",  value: `€${stats.totalInvoices.toLocaleString()}`,              description: "Totali i faturave të krijuara", color: "blue" },
    { icon: TrendingDown, title: "Shpenzimet",  value: `€${stats.totalExpenses.toLocaleString()}`,              description: "Totali i shpenzimeve",          color: "rose" },
    { icon: CreditCard, title: "Borxhi",        value: `€${stats.totalDebt.toLocaleString()}`,                  description: "Borxhi i mbetur",               color: "amber" },
    { icon: Users,      title: "Klientët",       value: stats.clientCount.toString(),                            description: "Numri i klientëve",             color: "violet" },
    { icon: BarChart3,  title: "Performanca",   value: `€${(stats.totalInvoices - stats.totalExpenses).toLocaleString()}`, description: "Fitimi bruto", color: "teal" },
    { icon: Wallet,     title: "Arka",           value: `€${stats.cashBalance.toLocaleString()}`,               description: "Bilanci i arkës",               color: "green" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Pasqyra</p>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('sq-AL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
        {stats.undeliveredCash > 0 && (
          <StatCard
            icon={AlertTriangle}
            title="Kesh i pa dorëzuar"
            value={`€${stats.undeliveredCash.toLocaleString()}`}
            description="Para që duhet dorëzuar në arkë"
            variant="warning"
          />
        )}
      </div>

      {/* Chart + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <div className="space-y-4">
          <UndeliveredCashAlert users={undeliveredUsers} />
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Aktiviteti i fundit</p>
            <p className="text-sm text-muted-foreground">Nuk ka aktivitet të ri.</p>
          </div>
        </div>
      </div>
    </div>
  );
}