import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  FileText, TrendingDown, CreditCard, Wallet,
  BanknoteIcon, ChevronRight, Package, Gift, Calendar,
  Users2, TrendingUp as TrendingUpIcon, Users, BarChart3,
  ArrowRight, Bell
} from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import RevenueChart from "../components/dashboard/RevenueChart";
import RecentInvoices from "../components/dashboard/RecentInvoices";
import UndeliveredCashAlert from "../components/dashboard/UndeliveredCashAlert";
import UpcomingReminders from "../components/dashboard/UpcomingReminders";
import QuotesSummary from "../components/dashboard/QuotesSummary";
import LowStockAlert from "../components/dashboard/LowStockAlert";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/useLanguage.jsx";

/* ─── Quick link button ──────────────────────────────────────── */
function QuickLink({ icon: Icon, label, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center justify-between w-full px-4 py-3 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-sm transition-all duration-200"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wide">
            {badge}
          </span>
        )}
        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}

/* ─── Divider with label ─────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{children}</span>
      <div className="flex-1 h-px bg-slate-200/60" />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const tenantId = user?.tenant_id;

  const [period, setPeriod]   = useState("today");
  const [vatMode, setVatMode] = useState("inc");
  const [stats, setStats] = useState({
    totalInvoices: 0, totalExpenses: 0, totalDebt: 0,
    clientCount: 0, cashBalance: 0, undeliveredCash: 0, netProfit: 0,
  });
  const [undeliveredUsers, setUndeliveredUsers] = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [pendingHandovers, setPendingHandovers] = useState([]);
  const [currentUser, setCurrentUser]           = useState(null);
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
      const filtered = invoices.filter(inv => {
        const d = new Date(inv.created_date);
        if (period === "today") return d.toDateString() === now.toDateString();
        if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return d.getFullYear() === now.getFullYear();
      });

      const getAmount = inv => vatMode === "inc"
        ? parseFloat(inv.amount || 0)
        : parseFloat(inv.subtotal || inv.amount || 0);

      const totalInvoices  = filtered.reduce((s, i) => s + getAmount(i), 0);
      const cashIn         = transactions.filter(t => t.type === "cash_in").reduce((s, t) => s + parseFloat(t.amount || 0), 0);
      const cashOut        = transactions.filter(t => t.type === "cash_out").reduce((s, t) => s + parseFloat(t.amount || 0), 0);
      const cashBalance    = cashIn - cashOut;
      const totalExpenses  = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
      const netProfit      = totalInvoices - totalExpenses;
      const usersWithCash  = users.filter(u => parseFloat(u.cash_on_hand || 0) > 0);
      const totalUndeliv   = usersWithCash.reduce((s, u) => s + parseFloat(u.cash_on_hand || 0), 0);
      const uniqueClients  = new Set(filtered.map(i => i.client_name)).size;

      const totalDebt = filtered.reduce((s, inv) => {
        if (inv.status === 'cancelled') return s;
        const bal = getAmount(inv) - (inv.payment_records || []).reduce((ps, p) => ps + parseFloat(p.amount || 0), 0);
        return s + (bal > 0 ? bal : 0);
      }, 0);

      setStats({ totalInvoices, totalExpenses, totalDebt, clientCount: uniqueClients, cashBalance, undeliveredCash: totalUndeliv, netProfit });
      setUndeliveredUsers(usersWithCash);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const periodLabels = { today: t("today"), month: t("month"), year: t("year") };

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/40 p-6 lg:p-10 space-y-7">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
            <div className="h-9 w-56 bg-slate-200 rounded-xl animate-pulse" />
          </div>
          <div className="h-9 w-72 bg-slate-200 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[0,1,2,3].map(i => (
            <div key={i} className="h-40 bg-white rounded-2xl border border-slate-200 animate-pulse shadow-sm" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 h-80 bg-white rounded-2xl border border-slate-200 animate-pulse shadow-sm" />
          <div className="space-y-4">
            {[0,1,2].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse shadow-sm" />)}
          </div>
        </div>
      </div>
    );
  }

  /* ── badge helpers ── */
  const pLabel = periodLabels[period].toUpperCase();

  const topCards = [
    {
      icon: FileText,
      title: "Totali Faturave",
      value: `€${stats.totalInvoices.toLocaleString()}`,
      description: "Fatura të krijuara",
      color: "blue",
      badge: { label: pLabel, color: "blue", dot: false },
      route: "/invoices",
    },
    {
      icon: TrendingUpIcon,
      title: "Fitimi Neto",
      value: `€${stats.netProfit.toLocaleString()}`,
      description: "Pas shpenzimeve",
      color: "teal",
      badge: stats.netProfit >= 0
        ? { label: "▲ FITIM POZITIV", color: "green", dot: false }
        : { label: "▼ HUMBJE", color: "red", dot: false },
      route: "/invoice-analytics",
    },
    {
      icon: CreditCard,
      title: "Borxhi i Mbetur",
      value: `€${stats.totalDebt.toLocaleString()}`,
      description: "Bilanci i papaguar",
      color: "amber",
      badge: stats.totalDebt === 0
        ? { label: "ASNJË BORXH", color: "green", dot: true }
        : { label: "KËRKON VËMENDJE", color: "red", dot: true },
      route: "/debtors",
    },
    {
      icon: Wallet,
      title: "Bilanci i Arkës",
      value: `€${stats.cashBalance.toLocaleString()}`,
      description: "Arka aktuale",
      color: "green",
      badge: stats.cashBalance >= 0
        ? { label: "▲ POZITIVE", color: "green", dot: false }
        : { label: "▼ NEGATIVE", color: "red", dot: false },
      route: null,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/40">
      <div className="p-6 lg:p-10 space-y-7 max-w-[1600px] mx-auto">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
              Pasqyra Financiare
            </p>
            <h1 className="text-5xl font-bold tracking-tight text-black">{t("welcome")}</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* period selector */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-0.5 shadow-sm">
              {["today","month","year"].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={cn(
                    "px-3.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150",
                    period === p
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  )}>
                  {periodLabels[p]}
                </button>
              ))}
            </div>
            {/* vat toggle */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-0.5 shadow-sm">
              {[["inc", t("withVat")], ["exc", t("withoutVat")]].map(([v, l]) => (
                <button key={v} onClick={() => setVatMode(v)}
                  className={cn(
                    "px-3.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150",
                    vatMode === v
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  )}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Pending handover banner ──────────────────────────── */}
        {pendingHandovers.length > 0 && (
          <button
            onClick={() => navigate('/cash-handover')}
            className="w-full flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 hover:bg-amber-100/60 transition-all duration-200 group text-left shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
              <BanknoteIcon className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {pendingHandovers.length === 1
                  ? "1 kërkesë dorëzimi kesh pret aprovimin"
                  : `${pendingHandovers.length} kërkesa dorëzimi kesh presin aprovimin`}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {pendingHandovers.map(h => h.user_name || h.user_email?.split('@')[0]).filter(Boolean).join(', ')}
              </p>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-200 text-amber-800 px-2.5 py-1 rounded-full">
              Vepro
            </span>
            <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* ── 4 Main stat cards ────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {topCards.map((card, i) => (
            <div
              key={card.title}
              className="animate-fade-in"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
            >
              <button onClick={() => card.route && navigate(card.route)} className="w-full text-left">
                <StatCard {...card} />
              </button>
            </div>
          ))}
        </div>

        {/* ── Secondary stats row ───────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: TrendingDown, label: "Shpenzimet",    value: `€${stats.totalExpenses.toLocaleString()}`, route: "/expenses" },
            { icon: Users,        label: "Klientët",      value: `${stats.clientCount} klientë`,             route: "/clients"  },
            { icon: Package,      label: "Stoku",         value: "Menaxho →",                                route: "/inventory"},
            { icon: BarChart3,    label: "Analitika",     value: "Shiko →",                                  route: "/invoice-analytics" },
          ].map((item, i) => (
            <button
              key={item.label}
              onClick={() => navigate(item.route)}
              className="group bg-white border border-slate-200/80 rounded-2xl px-4 py-4 flex items-center gap-3 hover:border-slate-300 hover:shadow-md transition-all duration-200 text-left shadow-sm animate-fade-in"
              style={{ animationDelay: `${(i + 4) * 60}ms`, animationFillMode: "both" }}
            >
              <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-slate-100 transition-colors">
                <item.icon className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                <p className="text-sm font-bold text-slate-800 truncate mt-0.5">{item.value}</p>
              </div>
            </button>
          ))}
        </div>

        {/* ── Middle: Chart (left) + Sidebar (right) ───────────── */}
        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in"
          style={{ animationDelay: "0.35s", animationFillMode: "both" }}
        >
          {/* Chart area */}
          <div className="lg:col-span-2 space-y-5">
            <SectionLabel>Grafiku i të Ardhurave</SectionLabel>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
              <RevenueChart />
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <SectionLabel>Sinjalizimet</SectionLabel>

            {/* Quick links */}
            <div className="space-y-2">
              {[
                { icon: Gift,    label: "Ofertat",           badge: null,    route: "/quotes"     },
                { icon: Calendar,label: "Kujtesa & Reminders",badge: null,   route: "/reminders"  },
                { icon: Users2,  label: "Burimet Njerezore", badge: null,    route: "/super-admin"},
              ].map(ql => (
                <QuickLink key={ql.label} icon={ql.icon} label={ql.label} badge={ql.badge} onClick={() => navigate(ql.route)} />
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
              <LowStockAlert />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
              <UndeliveredCashAlert users={undeliveredUsers} />
            </div>
          </div>
        </div>

        {/* ── Bottom: Invoices + Reminders + Quotes ────────────── */}
        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in"
          style={{ animationDelay: "0.5s", animationFillMode: "both" }}
        >
          <div className="lg:col-span-2 space-y-5">
            <SectionLabel>Faturat e Fundit</SectionLabel>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
              <RecentInvoices />
            </div>
          </div>
          <div className="space-y-5">
            <SectionLabel>Ofertat</SectionLabel>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
              <QuotesSummary />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
              <UpcomingReminders />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
