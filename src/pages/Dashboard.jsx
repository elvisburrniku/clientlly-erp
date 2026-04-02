import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { FileText, TrendingDown, CreditCard, Users, BarChart3, Wallet, AlertTriangle, TrendingUp, BanknoteIcon, ChevronRight } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import MonthlyRevenueBar from "../components/dashboard/MonthlyRevenueBar";
import RevenueChart from "../components/dashboard/RevenueChart";
import RecentInvoices from "../components/dashboard/RecentInvoices";
import UndeliveredCashAlert from "../components/dashboard/UndeliveredCashAlert";
import UpcomingReminders from "../components/dashboard/UpcomingReminders";
import LowStockAlert from "../components/dashboard/LowStockAlert";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [period, setPeriod] = useState("today");
  const [vatMode, setVatMode] = useState("inc"); // inc = me TVSH, exc = pa TVSH
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalExpenses: 0,
    totalDebt: 0,
    clientCount: 0,
    cashBalance: 0,
    undeliveredCash: 0,
    netProfit: 0,
  });
  const [undeliveredUsers, setUndeliveredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingHandovers, setPendingHandovers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadDashboardData(); }, [period, vatMode]);

  useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUser(u);
      if (u?.role === 'admin') {
        base44.entities.CashHandover.filter({ status: 'pending' }).then(setPendingHandovers).catch(() => []);
      }
    });
  }, []);

  const loadDashboardData = async () => {
    try {
      if (!tenantId) return;
      const [invoices, transactions, users, expenses] = await Promise.all([
        base44.entities.Invoice.filter({ tenant_id: tenantId }),
        base44.entities.CashTransaction.filter({ tenant_id: tenantId }),
        base44.entities.User.list().catch(() => []),
        base44.entities.Expense.filter({ tenant_id: tenantId }),
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
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const netProfit = totalInvoices - totalExpenses;

      const usersWithCash = users.filter(u => (u.cash_on_hand || 0) > 0);
      const totalUndelivered = usersWithCash.reduce((sum, u) => sum + (u.cash_on_hand || 0), 0);
      const uniqueClients = new Set(filtered.map(i => i.client_name)).size;

      setStats({
        totalInvoices,
        totalExpenses,
        totalDebt: totalInvoices - cashIn,
        clientCount: uniqueClients,
        cashBalance,
        undeliveredCash: totalUndelivered,
        netProfit,
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
    { icon: TrendingUp,  title: "Fitim Neto",   value: `€${stats.netProfit.toLocaleString()}`,                 description: "Fitim pas shpenzimeve",         color: stats.netProfit >= 0 ? "teal" : "rose" },
    { icon: Wallet,     title: "Arka",           value: `€${stats.cashBalance.toLocaleString()}`,               description: "Bilanci i arkës",               color: "green" },
  ];

  const periodLabels = { today: "Sot", month: "Muaji", year: "Viti" };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Pending Handover Notification */}
      {pendingHandovers.length > 0 && (
        <button
          onClick={() => navigate('/cash-handover')}
          className="w-full flex items-center gap-4 bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-4 hover:bg-amber-100 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
            <BanknoteIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-amber-900">
              {pendingHandovers.length === 1
                ? `1 kërkesë dorëzimi kesh pret aprovimin`
                : `${pendingHandovers.length} kërkesa dorëzimi kesh presin aprovimin`
              }
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {pendingHandovers.map(h => h.user_name || h.user_email?.split('@')[0]).filter(Boolean).join(', ')}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition-transform" />
        </button>
      )}

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Mirë se vjen</h1>
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
        <StatCard
          icon={AlertTriangle}
          title="Kesh i pa dorëzuar"
          value={`€${stats.undeliveredCash.toLocaleString()}`}
          description="Para që duhet dorëzuar në arkë"
          variant={stats.undeliveredCash > 0 ? "warning" : "default"}
        />
      </div>



      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart />
        <MonthlyRevenueBar />
      </div>

      {/* Recent Invoices + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentInvoices />
        </div>
        <div className="space-y-4">
          <LowStockAlert />
          <UpcomingReminders />
          <UndeliveredCashAlert users={undeliveredUsers} />
        </div>
      </div>
    </div>
  );
}