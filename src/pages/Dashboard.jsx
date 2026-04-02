import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { FileText, TrendingDown, CreditCard, Users, BarChart3, Wallet, AlertTriangle, TrendingUp, BanknoteIcon, ChevronRight } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
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
  const [vatMode, setVatMode] = useState("inc");
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

  const cardRoutes = {
    "Total Faturat": "/invoices",
    "Shpenzimet": "/expenses",
    "Borxhi": "/debtors",
    "Klientët": "/clients",
    "Fitim Neto": "/invoice-analytics",
    "Arka": "/cashbox",
  };

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
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Pending Handover Notification */}
      {pendingHandovers.length > 0 && (
        <button
          onClick={() => navigate('/cash-handover')}
          className="w-full flex items-center gap-4 bg-gradient-to-r from-amber-50 to-amber-100/50 border-2 border-amber-300/60 rounded-2xl px-6 py-4 hover:border-amber-400 hover:shadow-lg transition-all duration-300 group"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300">
            <BanknoteIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-amber-900 group-hover:text-amber-950 transition-colors">
              {pendingHandovers.length === 1
                ? `1 kërkesë dorëzimi kesh pret aprovimin`
                : `${pendingHandovers.length} kërkesa dorëzimi kesh presin aprovimin`
              }
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {pendingHandovers.map(h => h.user_name || h.user_email?.split('@')[0]).filter(Boolean).join(', ')}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-600 group-hover:translate-x-2 transition-transform duration-300" />
        </button>
      )}

      {/* Header */}
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-5xl font-bold tracking-tight text-foreground">Mirë se vjen</h1>
            <p className="text-muted-foreground text-base">Ja çfarë po ndodh sot me biznesin tënd</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-primary">{new Date().toLocaleDateString('sq-AL', { weekday: 'long' })}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{new Date().toLocaleDateString('sq-AL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Period filter */}
          <div className="flex gap-1.5 bg-gradient-to-br from-white to-slate-50 border border-border/40 rounded-full p-1 shadow-sm hover:shadow-md transition-shadow">
            {["today","month","year"].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn("px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 whitespace-nowrap",
                  period === p ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-slate-200/50"
                )}>{periodLabels[p]}</button>
            ))}
          </div>
          {/* VAT toggle */}
          <div className="flex gap-1.5 bg-gradient-to-br from-white to-slate-50 border border-border/40 rounded-full p-1 shadow-sm hover:shadow-md transition-shadow">
            <button onClick={() => setVatMode("inc")}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 whitespace-nowrap",
                vatMode === "inc" ? "bg-success text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-slate-200/50"
              )}>Me TVSH</button>
            <button onClick={() => setVatMode("exc")}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 whitespace-nowrap",
                vatMode === "exc" ? "bg-slate-800 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-slate-200/50"
              )}>Pa TVSH</button>
          </div>
        </div>
      </div>

      {/* Recent Invoices + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <div className="lg:col-span-2 rounded-2xl overflow-hidden shadow-sm border border-border/60 hover:shadow-lg transition-shadow duration-300">
          <RecentInvoices />
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden shadow-sm border border-border/60 hover:shadow-lg transition-shadow duration-300">
            <LowStockAlert />
          </div>
          <div className="rounded-2xl overflow-hidden shadow-sm border border-border/60 hover:shadow-lg transition-shadow duration-300">
            <UpcomingReminders />
          </div>
          <div className="rounded-2xl overflow-hidden shadow-sm border border-border/60 hover:shadow-lg transition-shadow duration-300">
            <UndeliveredCashAlert users={undeliveredUsers} />
          </div>
        </div>
      </div>
    </div>
  );
}