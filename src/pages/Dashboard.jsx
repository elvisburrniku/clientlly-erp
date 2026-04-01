import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, TrendingDown, CreditCard, Users, BarChart3, Wallet, AlertTriangle } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import MonthlyRevenueBar from "../components/dashboard/MonthlyRevenueBar";
import RevenueChart from "../components/dashboard/RevenueChart";
import UndeliveredCashAlert from "../components/dashboard/UndeliveredCashAlert";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [period, setPeriod] = useState("today");
  const [vatMode, setVatMode] = useState("inc"); // inc = me TVSH, exc = pa TVSH
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

  useEffect(() => { loadDashboardData(); }, [period, vatMode]);

  const loadDashboardData = async () => {
    try {
      const [invoices, transactions, users] = await Promise.all([
        base44.entities.Invoice.list(),
        base44.entities.CashTransaction.list(),
        base44.entities.User.list(),
      ]);

      // Filter invoices by period
      const now = new Date();
      const filtered = invoices.filter((inv) => {
        const d = new Date(inv.created_date);
        if (period === "today") return d.toDateString() === now.toDateString();
        if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return d.getFullYear() === now.getFullYear();
      });

      const getAmount = (inv) => vatMode === "inc" ? (inv.amount || 0) : (inv.subtotal || inv.amount || 0);

      const totalInvoices = filtered.reduce((sum, inv) => sum + getAmount(inv), 0);
      const cashIn = transactions.filter(t => t.type === "cash_in").reduce((sum, t) => sum + (t.amount || 0), 0);
      const cashOut = transactions.filter(t => t.type === "cash_out").reduce((sum, t) => sum + (t.amount || 0), 0);
      const cashBalance = cashIn - cashOut;

      const usersWithCash = users.filter(u => (u.cash_on_hand || 0) > 0);
      const totalUndelivered = usersWithCash.reduce((sum, u) => sum + (u.cash_on_hand || 0), 0);
      const uniqueClients = new Set(filtered.map(i => i.client_name)).size;

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

  const periodLabels = { today: "Sot", month: "Muaji", year: "Viti" };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Mirë se vjen,</h1>
              <span className="font-marker text-4xl text-primary">Finance! ✦</span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">Ja çfarë po ndodh sot me biznesin tënd.</p>
          </div>
          <p className="text-sm text-muted-foreground pt-1">{new Date().toLocaleDateString('sq-AL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Period filter */}
          <div className="flex bg-muted rounded-xl p-1">
            {["today","month","year"].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn("px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
                  period === p ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>{periodLabels[p]}</button>
            ))}
          </div>
          {/* VAT toggle */}
          <div className="flex bg-muted rounded-xl p-1">
            <button onClick={() => setVatMode("inc")}
              className={cn("px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
                vatMode === "inc" ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>Me TVSH</button>
            <button onClick={() => setVatMode("exc")}
              className={cn("px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
                vatMode === "exc" ? "bg-slate-700 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>Pa TVSH</button>
          </div>
        </div>
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

      {/* Monthly Revenue Bar */}
      <MonthlyRevenueBar />

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