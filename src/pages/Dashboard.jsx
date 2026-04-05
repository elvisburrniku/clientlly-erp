import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { FileText, TrendingDown, CreditCard, Users, BarChart3, Wallet, AlertTriangle, TrendingUp, BanknoteIcon, ChevronRight, Package, Gift, Calendar, Users2, TrendingUp as TrendingUpIcon } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import RevenueChart from "../components/dashboard/RevenueChart";
import RecentInvoices from "../components/dashboard/RecentInvoices";
import UndeliveredCashAlert from "../components/dashboard/UndeliveredCashAlert";
import UpcomingReminders from "../components/dashboard/UpcomingReminders";
import QuotesSummary from "../components/dashboard/QuotesSummary";
import LowStockAlert from "../components/dashboard/LowStockAlert";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/useLanguage.jsx";

/* ── tiny reusable fade-up wrapper ── */
function FadeUp({ delay = 0, children, className = "" }) {
  return (
    <div
      className={cn("animate-fade-in", className)}
      style={{ animationDelay: `${delay}s`, animationFillMode: "both" }}
    >
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
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

      const now = new Date();
      const filtered = invoices.filter((inv) => {
        const d = new Date(inv.created_date);
        if (period === "today") return d.toDateString() === now.toDateString();
        if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return d.getFullYear() === now.getFullYear();
      });

      const getAmount = (inv) => vatMode === "inc" ? parseFloat(inv.amount || 0) : parseFloat(inv.subtotal || inv.amount || 0);

      const totalInvoices = filtered.reduce((sum, inv) => sum + getAmount(inv), 0);
      const cashIn = transactions.filter(t => t.type === "cash_in").reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      const cashOut = transactions.filter(t => t.type === "cash_out").reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      const cashBalance = cashIn - cashOut;
      const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const netProfit = totalInvoices - totalExpenses;

      const usersWithCash = users.filter(u => parseFloat(u.cash_on_hand || 0) > 0);
      const totalUndelivered = usersWithCash.reduce((sum, u) => sum + parseFloat(u.cash_on_hand || 0), 0);
      const uniqueClients = new Set(filtered.map(i => i.client_name)).size;

      const totalDebt = filtered.reduce((sum, inv) => {
        if (inv.status === 'cancelled') return sum;
        const invAmount = getAmount(inv);
        const paid = (inv.payment_records || []).reduce((ps, p) => ps + parseFloat(p.amount || 0), 0);
        const balance = invAmount - paid;
        return sum + (balance > 0 ? balance : 0);
      }, 0);

      setStats({
        totalInvoices,
        totalExpenses,
        totalDebt,
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
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Duke ngarkuar...</p>
        </div>
      </div>
    );
  }

  const cardRoutes = {
    "Faturat": "/invoices",
    "Shpenzimet": "/expenses",
    "Borxhi": "/debtors",
    "Klientet": "/clients",
    "Stoqet & Prokurimi": "/inventory",
    "Ofertat": "/quotes",
    "Kalendari": "/reminders",
    "Burimet Njerezore": "/super-admin",
    "Performanca Biznesi": "/invoice-analytics",
  };

  const cards = [
    { icon: FileText,       title: "Faturat",             value: `€${stats.totalInvoices.toLocaleString()}`,  description: "Totali i faturave të krijuara", color: "blue" },
    { icon: TrendingDown,   title: "Shpenzimet",          value: `€${stats.totalExpenses.toLocaleString()}`,  description: "Totali i shpenzimeve",          color: "rose" },
    { icon: CreditCard,     title: "Borxhi",              value: `€${stats.totalDebt.toLocaleString()}`,      description: "Borxhi i mbetur",               color: "amber" },
    { icon: Wallet,         title: "Arka",                value: `€${stats.cashBalance.toLocaleString()}`,    description: "Bilanci i arkës",               color: "green" },
    { icon: Users,          title: "Klientet",            value: stats.clientCount.toString(),                description: "Numri i klientëve",             color: "violet" },
    { icon: Package,        title: "Stoqet & Prokurimi",  value: "→",                                         description: "Menaxhimi i stoqeve",           color: "indigo" },
    { icon: Gift,           title: "Ofertat",             value: "→",                                         description: "Raporte dhe analize",           color: "pink" },
    { icon: Calendar,       title: "Kalendari",           value: "→",                                         description: "Kujtesa dhe plane",             color: "cyan" },
    { icon: Users2,         title: "Burimet Njerezore",   value: "→",                                         description: "Menaxhimi i përdoruesve",       color: "purple" },
    { icon: TrendingUpIcon, title: "Performanca Biznesi", value: `€${stats.netProfit.toLocaleString()}`,      description: "Fitim pas shpenzimeve",         color: stats.netProfit >= 0 ? "teal" : "rose" },
  ];

  const periodLabels = { today: t("today"), month: t("month"), year: t("year") };

  /* ── greeting helper ── */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Mirëmëngjes" : hour < 17 ? "Mirëdita" : "Mirëmbrëma";
  const firstName = user?.full_name?.split(" ")[0] || "";

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero header strip ── */}
      <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        {/* subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
        {/* glow orbs */}
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-24 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 px-6 lg:px-10 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Greeting */}
          <FadeUp delay={0}>
            <p className="text-white/50 text-sm font-medium tracking-wide">{greeting}{firstName ? `, ${firstName}` : ""}!</p>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white mt-0.5">{t("welcome")}</h1>
            <p className="text-white/40 text-sm mt-1">{t("whatHappening")}</p>
          </FadeUp>

          {/* Filters */}
          <FadeUp delay={0.1} className="flex flex-wrap gap-3 items-center">
            {/* Period */}
            <div className="inline-flex gap-1 bg-white/10 backdrop-blur-sm p-1 rounded-xl border border-white/10">
              {["today", "month", "year"].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200",
                    period === p
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-white/60 hover:text-white hover:bg-white/10"
                  )}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
            {/* VAT */}
            <div className="inline-flex gap-1 bg-white/10 backdrop-blur-sm p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setVatMode("inc")}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200",
                  vatMode === "inc" ? "bg-white text-slate-900 shadow-sm" : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >{t("withVat")}</button>
              <button
                onClick={() => setVatMode("exc")}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200",
                  vatMode === "exc" ? "bg-white text-slate-900 shadow-sm" : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >{t("withoutVat")}</button>
            </div>
          </FadeUp>
        </div>
      </div>

      <div className="px-6 lg:px-10 py-8 space-y-8">
        {/* ── Pending Handover Banner ── */}
        {pendingHandovers.length > 0 && (
          <FadeUp delay={0}>
            <button
              onClick={() => navigate('/cash-handover')}
              className="w-full flex items-center gap-4 bg-gradient-to-r from-amber-50 to-amber-100/50 border-2 border-amber-300/60 rounded-2xl px-6 py-4 hover:border-amber-400 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300">
                <BanknoteIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-amber-900">
                  {pendingHandovers.length === 1
                    ? `1 kërkesë dorëzimi kesh pret aprovimin`
                    : `${pendingHandovers.length} kërkesa dorëzimi kesh presin aprovimin`}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {pendingHandovers.map(h => h.user_name || h.user_email?.split('@')[0]).filter(Boolean).join(', ')}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-amber-600 group-hover:translate-x-2 transition-transform duration-300" />
            </button>
          </FadeUp>
        )}

        {/* ── Stat Cards ── */}
        <div>
          <FadeUp delay={0.05}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Pasqyra Financiare</p>
          </FadeUp>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {cards.map((card, i) => (
              <FadeUp key={card.title} delay={0.06 + i * 0.04}>
                <button
                  onClick={() => cardRoutes[card.title] && navigate(cardRoutes[card.title])}
                  className="w-full hover:opacity-90 transition-opacity text-left"
                >
                  <StatCard {...card} />
                </button>
              </FadeUp>
            ))}
          </div>
        </div>

        {/* ── Revenue Chart ── */}
        <FadeUp delay={0.3}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Grafiku i të Ardhurave</p>
            <div className="rounded-2xl overflow-hidden shadow-sm border border-border/60 hover:shadow-md transition-shadow duration-300 bg-white">
              <RevenueChart />
            </div>
          </div>
        </FadeUp>

        {/* ── Recent Invoices ── */}
        <FadeUp delay={0.38}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Faturat e Fundit</p>
            <div className="rounded-2xl overflow-hidden shadow-sm border border-border/60 hover:shadow-md transition-shadow duration-300 bg-white">
              <RecentInvoices />
            </div>
          </div>
        </FadeUp>

        {/* ── Alerts & Summary Row ── */}
        <FadeUp delay={0.44}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            <div className="space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Sinjalizimet</p>
              <div className="rounded-2xl overflow-hidden shadow-sm border border-border/60 hover:shadow-md transition-shadow duration-300 bg-white">
                <LowStockAlert />
              </div>
              <div className="rounded-2xl overflow-hidden shadow-sm border border-border/60 hover:shadow-md transition-shadow duration-300 bg-white">
                <UpcomingReminders />
              </div>
              <div className="rounded-2xl overflow-hidden shadow-sm border border-border/60 hover:shadow-md transition-shadow duration-300 bg-white">
                <UndeliveredCashAlert users={undeliveredUsers} />
              </div>
            </div>
            <div className="lg:col-span-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Ofertat</p>
              <div className="rounded-2xl overflow-hidden shadow-sm border border-border/60 hover:shadow-md transition-shadow duration-300 bg-white h-full">
                <QuotesSummary />
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </div>
  );
}
