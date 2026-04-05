import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  FileText, TrendingDown, CreditCard, Users, Wallet,
  BanknoteIcon, ChevronRight, Package, Gift, Calendar,
  Users2, TrendingUp as TrendingUpIcon, ArrowUpRight
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

/* ── small nav shortcut card ── */
function NavCard({ icon: Icon, label, sub, color, onClick }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    pink:   "bg-pink-50   text-pink-600   border-pink-100",
    cyan:   "bg-cyan-50   text-cyan-600   border-cyan-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    teal:   "bg-teal-50   text-teal-600   border-teal-100",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 bg-white border border-border/50 rounded-2xl px-4 py-3.5",
        "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left w-full shadow-sm"
      )}
    >
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border", colors[color] || colors.indigo)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
      </div>
      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
    </button>
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

      const totalInvoices = filtered.reduce((s, i) => s + getAmount(i), 0);
      const cashIn  = transactions.filter(t => t.type === "cash_in").reduce((s, t) => s + parseFloat(t.amount || 0), 0);
      const cashOut = transactions.filter(t => t.type === "cash_out").reduce((s, t) => s + parseFloat(t.amount || 0), 0);
      const cashBalance   = cashIn - cashOut;
      const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
      const netProfit     = totalInvoices - totalExpenses;
      const usersWithCash = users.filter(u => parseFloat(u.cash_on_hand || 0) > 0);
      const totalUndelivered = usersWithCash.reduce((s, u) => s + parseFloat(u.cash_on_hand || 0), 0);
      const uniqueClients = new Set(filtered.map(i => i.client_name)).size;

      const totalDebt = filtered.reduce((s, inv) => {
        if (inv.status === 'cancelled') return s;
        const bal = getAmount(inv) - (inv.payment_records || []).reduce((ps, p) => ps + parseFloat(p.amount || 0), 0);
        return s + (bal > 0 ? bal : 0);
      }, 0);

      setStats({ totalInvoices, totalExpenses, totalDebt, clientCount: uniqueClients, cashBalance, undeliveredCash: totalUndelivered, netProfit });
      setUndeliveredUsers(usersWithCash);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const periodLabels = { today: t("today"), month: t("month"), year: t("year") };

  if (loading) {
    return (
      <div className="p-6 lg:p-10 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded-xl animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded-lg animate-pulse" />
          </div>
          <div className="h-9 w-64 bg-muted rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-36 bg-muted rounded-2xl animate-pulse" style={{ animationDelay: `${i*60}ms` }} />
          ))}
        </div>
        <div className="h-72 bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  /* ── badge helpers ── */
  const profitBadge = stats.netProfit >= 0
    ? { label: "▲ FITIM POZITIV", color: "green", dot: false }
    : { label: "▼ HUMBJE", color: "red", dot: false };

  const debtBadge = stats.totalDebt === 0
    ? { label: "PASTËR", color: "green", dot: true }
    : { label: "KUJDES", color: "amber", dot: true };

  const cashBadge = stats.cashBalance >= 0
    ? { label: "POZITIVE", color: "green", dot: true }
    : { label: "NEGATIVE", color: "red", dot: true };

  const invoiceBadge = { label: `PERIUDHA: ${periodLabels[period].toUpperCase()}`, color: "blue", dot: false };

  /* ── main stat cards ── */
  const mainCards = [
    {
      icon: FileText,
      title: "Totali Faturave",
      value: `€${stats.totalInvoices.toLocaleString()}`,
      description: "Fatura të krijuara",
      color: "blue",
      badge: invoiceBadge,
      route: "/invoices",
    },
    {
      icon: TrendingDown,
      title: "Shpenzimet",
      value: `€${stats.totalExpenses.toLocaleString()}`,
      description: "Shpenzime totale",
      color: "rose",
      badge: { label: "TOTAL", color: "muted", dot: false },
      route: "/expenses",
    },
    {
      icon: CreditCard,
      title: "Borxhi i Mbetur",
      value: `€${stats.totalDebt.toLocaleString()}`,
      description: "Bilanci i papaguar",
      color: "amber",
      badge: debtBadge,
      route: "/debtors",
    },
    {
      icon: Wallet,
      title: "Bilanci Arkës",
      value: `€${stats.cashBalance.toLocaleString()}`,
      description: "Arka aktuale",
      color: "green",
      badge: cashBadge,
      route: null,
    },
    {
      icon: TrendingUpIcon,
      title: "Fitimi Neto",
      value: `€${stats.netProfit.toLocaleString()}`,
      description: "Pas shpenzimeve",
      color: stats.netProfit >= 0 ? "teal" : "rose",
      badge: profitBadge,
      route: "/invoice-analytics",
    },
    {
      icon: Users,
      title: "Klientët",
      value: stats.clientCount.toString(),
      description: "Klientë unikë",
      color: "violet",
      badge: { label: "AKTIV", color: "violet", dot: true },
      route: "/clients",
    },
  ];

  /* ── nav shortcuts ── */
  const navCards = [
    { icon: Package, label: "Stoqet & Prokurimi", sub: "Menaxhimi i stoqeve", color: "indigo", route: "/inventory" },
    { icon: Gift,    label: "Ofertat",            sub: "Raporte & analizë",   color: "pink",   route: "/quotes"    },
    { icon: Calendar,label: "Kalendari",          sub: "Kujtesa & plane",     color: "cyan",   route: "/reminders" },
    { icon: Users2,  label: "Burimet Njerezore",  sub: "HR & punonjës",       color: "purple", route: "/super-admin"},
  ];

  return (
    <div className="p-6 lg:p-10 w-full space-y-7 animate-fade-in">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-5xl font-bold tracking-tight text-black">{t("welcome")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("whatHappening")}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Period */}
          <div className="inline-flex gap-1 bg-muted/40 p-1 rounded-xl border border-border/40">
            {["today","month","year"].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn(
                  "px-3.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200",
                  period === p ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                {periodLabels[p]}
              </button>
            ))}
          </div>
          {/* VAT */}
          <div className="inline-flex gap-1 bg-muted/40 p-1 rounded-xl border border-border/40">
            <button onClick={() => setVatMode("inc")}
              className={cn("px-3.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200",
                vatMode === "inc" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>{t("withVat")}</button>
            <button onClick={() => setVatMode("exc")}
              className={cn("px-3.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200",
                vatMode === "exc" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>{t("withoutVat")}</button>
          </div>
        </div>
      </div>

      {/* ── Handover banner ───────────────────────────────── */}
      {pendingHandovers.length > 0 && (
        <button
          onClick={() => navigate('/cash-handover')}
          className="w-full flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 hover:bg-amber-100/70 hover:border-amber-300 transition-all duration-200 group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
            <BanknoteIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              {pendingHandovers.length === 1
                ? "1 kërkesë dorëzimi kesh pret aprovimin"
                : `${pendingHandovers.length} kërkesa dorëzimi kesh presin aprovimin`}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {pendingHandovers.map(h => h.user_name || h.user_email?.split('@')[0]).filter(Boolean).join(', ')}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform duration-200" />
        </button>
      )}

      {/* ── Main stat cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {mainCards.map((card, i) => (
          <div
            key={card.title}
            className="animate-fade-in"
            style={{ animationDelay: `${i * 55}ms`, animationFillMode: "both" }}
          >
            <button
              onClick={() => card.route && navigate(card.route)}
              className="w-full text-left"
            >
              <StatCard
                icon={card.icon}
                title={card.title}
                value={card.value}
                description={card.description}
                color={card.color}
                badge={card.badge}
              />
            </button>
          </div>
        ))}
      </div>

      {/* ── Nav shortcut row ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {navCards.map(nc => (
          <NavCard
            key={nc.label}
            icon={nc.icon}
            label={nc.label}
            sub={nc.sub}
            color={nc.color}
            onClick={() => navigate(nc.route)}
          />
        ))}
      </div>

      {/* ── Revenue chart ─────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden shadow-sm border border-border/50 hover:shadow-lg transition-shadow duration-300 animate-fade-in"
        style={{ animationDelay: "0.38s", animationFillMode: "both" }}
      >
        <RevenueChart />
      </div>

      {/* ── Bottom: invoices (left) + sidebar alerts (right) ─ */}
      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in"
        style={{ animationDelay: "0.48s", animationFillMode: "both" }}
      >
        {/* invoices + quotes */}
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl overflow-hidden shadow-sm border border-border/50 hover:shadow-lg transition-shadow duration-300">
            <RecentInvoices />
          </div>
          <div className="rounded-2xl overflow-hidden shadow-sm border border-border/50 hover:shadow-lg transition-shadow duration-300">
            <QuotesSummary />
          </div>
        </div>

        {/* alerts column */}
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden shadow-sm border border-border/50 hover:shadow-lg transition-shadow duration-300">
            <LowStockAlert />
          </div>
          <div className="rounded-2xl overflow-hidden shadow-sm border border-border/50 hover:shadow-lg transition-shadow duration-300">
            <UpcomingReminders />
          </div>
          <div className="rounded-2xl overflow-hidden shadow-sm border border-border/50 hover:shadow-lg transition-shadow duration-300">
            <UndeliveredCashAlert users={undeliveredUsers} />
          </div>
        </div>
      </div>

    </div>
  );
}
