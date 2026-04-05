import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  FileText, TrendingDown, CreditCard, Users, Wallet,
  BanknoteIcon, ChevronRight, Package, Gift, Calendar,
  Users2, TrendingUp as TrendingUpIcon, Sparkles
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

/* ─── Stagger-in hook ───────────────────────────────────────── */
function useStaggerVisible(count, baseDelay = 60) {
  const [visible, setVisible] = useState([]);
  useEffect(() => {
    setVisible([]);
    let timers = [];
    for (let i = 0; i < count; i++) {
      timers.push(setTimeout(() => setVisible(v => [...v, i]), baseDelay * i + 80));
    }
    return () => timers.forEach(clearTimeout);
  }, [count]);
  return visible;
}

/* ─── Section wrapper ────────────────────────────────────────── */
function Section({ label, children, className = "" }) {
  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70">{label}</span>
          <div className="flex-1 h-px bg-border/50" />
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Pill toggle ─────────────────────────────────────────────── */
function PillGroup({ options, value, onChange }) {
  return (
    <div className="inline-flex p-1 gap-0.5 bg-muted/60 rounded-xl border border-border/40">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200",
            value === o.value
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
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
  const [undeliveredUsers, setUndeliveredUsers]   = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [pendingHandovers, setPendingHandovers]   = useState([]);
  const navigate = useNavigate();

  useEffect(() => { loadDashboardData(); }, [period, vatMode]);

  useEffect(() => {
    base44.auth.me().then(u => {
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

      const totalInvoices = filtered.reduce((s, inv) => s + getAmount(inv), 0);
      const cashIn  = transactions.filter(t => t.type === "cash_in").reduce((s, t) => s + parseFloat(t.amount || 0), 0);
      const cashOut = transactions.filter(t => t.type === "cash_out").reduce((s, t) => s + parseFloat(t.amount || 0), 0);
      const cashBalance   = cashIn - cashOut;
      const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
      const netProfit     = totalInvoices - totalExpenses;

      const usersWithCash     = users.filter(u => parseFloat(u.cash_on_hand || 0) > 0);
      const totalUndelivered  = usersWithCash.reduce((s, u) => s + parseFloat(u.cash_on_hand || 0), 0);
      const uniqueClients     = new Set(filtered.map(i => i.client_name)).size;

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

  /* ─── cards config ─── */
  const cardRoutes = {
    "Faturat": "/invoices", "Shpenzimet": "/expenses", "Borxhi": "/debtors",
    "Klientet": "/clients", "Stoqet & Prokurimi": "/inventory",
    "Ofertat": "/quotes", "Kalendari": "/reminders",
    "Burimet Njerezore": "/super-admin", "Performanca": "/invoice-analytics",
  };

  const cards = [
    { icon: FileText,       title: "Faturat",            value: `€${stats.totalInvoices.toLocaleString()}`,  description: "Totali i faturave",       color: "blue"   },
    { icon: TrendingDown,   title: "Shpenzimet",         value: `€${stats.totalExpenses.toLocaleString()}`,  description: "Totali i shpenzimeve",    color: "rose"   },
    { icon: CreditCard,     title: "Borxhi",             value: `€${stats.totalDebt.toLocaleString()}`,      description: "Borxhi i mbetur",         color: "amber"  },
    { icon: Wallet,         title: "Arka",               value: `€${stats.cashBalance.toLocaleString()}`,    description: "Bilanci i arkës",         color: "green"  },
    { icon: Users,          title: "Klientet",           value: stats.clientCount.toString(),                description: "Klientë unikë",           color: "violet" },
    { icon: TrendingUpIcon, title: "Performanca",        value: `€${stats.netProfit.toLocaleString()}`,      description: "Fitimi neto",             color: stats.netProfit >= 0 ? "teal" : "rose" },
    { icon: Package,        title: "Stoqet & Prokurimi", value: "→",                                         description: "Menaxhimi i stoqeve",     color: "indigo" },
    { icon: Gift,           title: "Ofertat",            value: "→",                                         description: "Raporte & analizë",      color: "pink"   },
    { icon: Calendar,       title: "Kalendari",          value: "→",                                         description: "Kujtesa & plane",        color: "cyan"   },
    { icon: Users2,         title: "Burimet Njerezore",  value: "→",                                         description: "HR & punonjës",           color: "purple" },
  ];

  const visibleCards = useStaggerVisible(cards.length, 55);

  const periodOpts = [
    { value: "today", label: t("today") },
    { value: "month", label: t("month") },
    { value: "year",  label: t("year")  },
  ];
  const vatOpts = [
    { value: "inc", label: t("withVat")    },
    { value: "exc", label: t("withoutVat") },
  ];

  /* ─── greeting ─── */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Mirëmëngjes" : hour < 17 ? "Mirëdita" : "Mirëmbrëma";
  const firstName = user?.full_name?.split(" ")[0] || "";

  /* ─── loading skeleton ─── */
  if (loading) {
    return (
      <div className="p-6 lg:p-10 space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-muted rounded-lg animate-pulse" />
            <div className="h-8 w-56 bg-muted rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-9 w-44 bg-muted rounded-xl animate-pulse" />
            <div className="h-9 w-32 bg-muted rounded-xl animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
        <div className="h-72 bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-9 animate-fade-in">

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
        {/* Greeting */}
        <div>
          <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {greeting}{firstName ? `, ${firstName}` : ""}
          </p>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground mt-0.5">
            {t("welcome")}
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <PillGroup options={periodOpts} value={period} onChange={setPeriod} />
          <PillGroup options={vatOpts}   value={vatMode} onChange={setVatMode} />
        </div>
      </div>

      {/* ── Pending handover banner ──────────────────────────── */}
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
              {pendingHandovers.length === 1 ? "1 kërkesë dorëzimi kesh pret aprovimin" : `${pendingHandovers.length} kërkesa dorëzimi kesh presin aprovimin`}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {pendingHandovers.map(h => h.user_name || h.user_email?.split('@')[0]).filter(Boolean).join(', ')}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform duration-200" />
        </button>
      )}

      {/* ── Stat cards ───────────────────────────────────────── */}
      <Section label="Pasqyra Financiare">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {cards.map((card, i) => (
            <div
              key={card.title}
              className={cn(
                "transition-all duration-500",
                visibleCards.includes(i)
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              )}
            >
              <button
                onClick={() => cardRoutes[card.title] && navigate(cardRoutes[card.title])}
                className="w-full text-left"
              >
                <StatCard {...card} />
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Revenue chart ─────────────────────────────────────── */}
      <Section label="Grafiku i të Ardhurave">
        <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
          <RevenueChart />
        </div>
      </Section>

      {/* ── Bottom grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left col — alerts */}
        <div className="space-y-5">
          <Section label="Sinjalizimet">
            <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
              <LowStockAlert />
            </div>
          </Section>
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
            <UpcomingReminders />
          </div>
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
            <UndeliveredCashAlert users={undeliveredUsers} />
          </div>
        </div>

        {/* Right col — invoices + quotes */}
        <div className="lg:col-span-2 space-y-5">
          <Section label="Faturat e Fundit">
            <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
              <RecentInvoices />
            </div>
          </Section>
          <Section label="Ofertat">
            <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
              <QuotesSummary />
            </div>
          </Section>
        </div>
      </div>

    </div>
  );
}
