import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  FileText, TrendingDown, CreditCard, Wallet, Users,
  BanknoteIcon, ChevronRight, Package, Calendar,
  Truck, ArrowRight, BarChart3, Car,
  Users2, Clock, Tag, ScrollText, ShieldCheck
} from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import RevenueChart from "../components/dashboard/RevenueChart";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/useLanguage.jsx";

/* ─── Quick link button ──────────────────────────────────────── */
function QuickLink({ icon: Icon, label, sub, onClick, iconBg = "bg-slate-50", iconColor = "text-slate-500", iconAnim }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-1 transition-all duration-200 text-left shadow-sm"
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}
        style={{ isolation: "isolate", willChange: iconAnim ? "transform" : "auto" }}
      >
        <Icon
          className={`w-3.5 h-3.5 ${iconColor}`}
          style={{ ...iconAnim, backfaceVisibility: "hidden" }}
        />
      </div>
      <div className="flex-1 min-w-0" style={{ transform: "translateZ(0)" }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-800 truncate">{label}</p>
        {sub && <p className="text-[11px] font-semibold text-slate-500 truncate leading-tight">{sub}</p>}
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}

/* ─── Section divider ────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 py-0.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 whitespace-nowrap">{children}</span>
      <div className="flex-1 h-px bg-slate-200" />
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
    clientCount: 0, cashBalance: 0, supplierCount: 0, netProfit: 0,
  });
  const [undeliveredUsers, setUndeliveredUsers] = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [pendingHandovers, setPendingHandovers] = useState([]);
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
      const [invoices, transactions, users, expenses, suppliers] = await Promise.all([
        base44.entities.Invoice.filter({ tenant_id: tenantId }),
        base44.entities.CashTransaction.filter({ tenant_id: tenantId }),
        base44.entities.User.list().catch(() => []),
        base44.entities.Expense.filter({ tenant_id: tenantId }),
        base44.entities.Supplier.filter({ tenant_id: tenantId }).catch(() => []),
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
      const uniqueClients  = new Set(filtered.map(i => i.client_name)).size;
      const supplierCount  = suppliers.length;

      const totalDebt = filtered.reduce((s, inv) => {
        if (inv.status === 'cancelled') return s;
        const bal = getAmount(inv) - (inv.payment_records || []).reduce((ps, p) => ps + parseFloat(p.amount || 0), 0);
        return s + (bal > 0 ? bal : 0);
      }, 0);

      setStats({ totalInvoices, totalExpenses, totalDebt, clientCount: uniqueClients, cashBalance, supplierCount, netProfit });
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
      <div className="min-h-screen p-6 lg:p-8 space-y-7" style={{ background: "linear-gradient(135deg, #f1f5f9 0%, #ede9fe 40%, #ddd6fe 100%)" }}>
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <div className="h-4 w-36 bg-slate-200 rounded animate-pulse" />
            <div className="h-9 w-52 bg-slate-200 rounded-xl animate-pulse" />
          </div>
          <div className="h-9 w-72 bg-slate-200 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-36 bg-white rounded-2xl border border-slate-200 animate-pulse shadow-sm" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 h-80 bg-white rounded-2xl border border-slate-200 animate-pulse shadow-sm" />
          <div className="space-y-3">
            {[0,1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-2xl border border-slate-200 animate-pulse shadow-sm" />)}
          </div>
        </div>
      </div>
    );
  }

  /* ── 8 stat cards (in requested order) ── */
  const cards = [
    {
      icon: FileText,
      title: "Faturat",
      value: `€${stats.totalInvoices.toLocaleString()}`,
      description: "Totali i faturave",
      color: "blue",
      badge: { label: periodLabels[period].toUpperCase(), color: "blue", dot: false },
      route: "/invoices",
    },
    {
      icon: TrendingDown,
      title: "Shpenzimet",
      value: `€${stats.totalExpenses.toLocaleString()}`,
      description: "Totali i shpenzimeve",
      color: "rose",
      badge: { label: "TOTAL", color: "muted", dot: false },
      route: "/expenses",
    },
    {
      icon: CreditCard,
      title: "Borxhet",
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
    {
      icon: Users,
      title: "Klientët",
      value: stats.clientCount.toString(),
      description: "Klientë unikë",
      color: "violet",
      badge: { label: "AKTIV", color: "violet", dot: true },
      route: "/clients",
    },
    {
      icon: Truck,
      title: "Furnitorët",
      value: stats.supplierCount.toString(),
      description: "Furnitorë aktivë",
      color: "indigo",
      badge: { label: "TOTAL", color: "muted", dot: false },
      route: "/suppliers",
    },
    {
      icon: Package,
      title: "Stoqet & Prokurimi",
      value: "→",
      description: "Menaxhimi i stoqeve",
      color: "teal",
      badge: { label: "SHIKO", color: "muted", dot: false },
      route: "/inventory",
    },
    {
      icon: Calendar,
      title: "Kalendari",
      value: "→",
      description: "Kujtesa & plane",
      color: "cyan",
      badge: { label: "SHIKO", color: "muted", dot: false },
      route: "/reminders",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 antialiased">
      <style>{`
        @keyframes carSlide {
          0%,100% { transform: translateX(0px); }
          30%      { transform: translateX(3px); }
          60%      { transform: translateX(-1px); }
        }
        @keyframes userPulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.18); }
        }
        @keyframes tagSwing {
          0%,100% { transform: rotate(0deg); }
          25%      { transform: rotate(12deg); }
          75%      { transform: rotate(-8deg); }
        }
        @keyframes scrollUp {
          0%,100% { transform: translateY(0px); }
          40%      { transform: translateY(-3px); }
          70%      { transform: translateY(1px); }
        }
        @keyframes shieldPulse {
          0%,100% { transform: scale(1);    opacity: 1; }
          50%      { transform: scale(1.2); opacity: 0.75; }
        }
      `}</style>
      <div className="p-6 lg:p-8 space-y-7">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
              Pasqyra Financiare
            </p>
            <h1 className="text-5xl font-bold tracking-tight text-black">{t("welcome")}</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-0.5 shadow-sm">
              {["today","month","year"].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={cn(
                    "px-3.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150",
                    period === p ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  )}>
                  {periodLabels[p]}
                </button>
              ))}
            </div>
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-0.5 shadow-sm">
              {[["inc", t("withVat")], ["exc", t("withoutVat")]].map(([v, l]) => (
                <button key={v} onClick={() => setVatMode(v)}
                  className={cn(
                    "px-3.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150",
                    vatMode === v ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  )}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Pending handover banner ─────────────────────────────── */}
        {pendingHandovers.length > 0 && (
          <button
            onClick={() => navigate('/cash-handover')}
            className="w-full flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 hover:bg-amber-100/60 transition-all duration-200 group text-left shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
              <BanknoteIcon className="w-4 h-4 text-white" />
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
            <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-200 text-amber-800 px-2.5 py-1 rounded-full">Vepro</span>
            <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* ── Row 1: 4 main financial cards (full size) ─────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.slice(0, 4).map((card, i) => (
            <div
              key={card.title}
              className="animate-fade-in"
              style={{ animationDelay: `${i * 55}ms`, animationFillMode: "both" }}
            >
              <button onClick={() => card.route && navigate(card.route)} className="w-full text-left">
                <StatCard {...card} />
              </button>
            </div>
          ))}
        </div>

        {/* ── Row 2: 4 nav/count cards (compact — half height) ───────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.slice(4).map((card, i) => (
            <div
              key={card.title}
              className="animate-fade-in"
              style={{ animationDelay: `${(i + 4) * 55}ms`, animationFillMode: "both" }}
            >
              <button onClick={() => card.route && navigate(card.route)} className="w-full text-left">
                <StatCard {...card} compact />
              </button>
            </div>
          ))}
        </div>

        {/* ── Middle: Chart + Sidebar ─────────────────────────────── */}
        <div
          className="animate-fade-in"
          style={{ animationDelay: "0.5s", animationFillMode: "both" }}
        >
          {/* shared header row: left title + right title */}
          <div className="grid grid-cols-4 gap-5 mb-5">
            <div className="col-span-3">
              <SectionLabel>Grafiku i të Ardhurave</SectionLabel>
            </div>
            <div>
              <SectionLabel>Sinjalizimet & Navigim</SectionLabel>
            </div>
          </div>

          {/* content row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                <RevenueChart />
              </div>
            </div>
            <div className="flex flex-col justify-between h-full">
              <QuickLink icon={Users2}     label="Burimet Njerezore" sub="HR & menaxhim punonjësish" onClick={() => navigate('/employees')}   iconBg="bg-violet-100"  iconColor="text-violet-600"  iconAnim={{ animation: 'userPulse 3s ease-in-out infinite' }} />
              <QuickLink icon={Clock}      label="Prezenca"          sub="Orari & prezenca ditore"    onClick={() => navigate('/attendance')}  iconBg="bg-blue-100"    iconColor="text-blue-600"    iconAnim={{ animation: 'spin 8s linear infinite' }} />
              <QuickLink icon={Car}        label="Motorpool"         sub="Flotë & automjete"          onClick={() => navigate('/vehicles')}    iconBg="bg-amber-100"   iconColor="text-amber-600"   iconAnim={{ animation: 'carSlide 2s ease-in-out infinite' }} />
              <QuickLink icon={Tag}        label="Ofertat"           sub="Oferta & kuotacione"        onClick={() => navigate('/quotes')}      iconBg="bg-emerald-100" iconColor="text-emerald-600" iconAnim={{ animation: 'tagSwing 2.5s ease-in-out infinite' }} />
              <QuickLink icon={ScrollText} label="Kontratat"         sub="Kontratat e biznesit"       onClick={() => navigate('/employees')}   iconBg="bg-rose-100"    iconColor="text-rose-600"    iconAnim={{ animation: 'scrollUp 2.5s ease-in-out infinite' }} />
              <QuickLink icon={ShieldCheck}label="Vërtetimet"        sub="Certifikata & dokumente"    onClick={() => navigate('/certificates')}iconBg="bg-teal-100"    iconColor="text-teal-600"    iconAnim={{ animation: 'shieldPulse 3s ease-in-out infinite' }} />
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
