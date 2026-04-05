import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  FileText, TrendingDown, CreditCard, Wallet, Users,
  BanknoteIcon, ChevronRight, Package, Calendar,
  Truck, ArrowRight, Car,
  Users2, Clock, Tag, ScrollText, ShieldCheck,
} from "lucide-react";

import StatCard from "../components/dashboard/StatCard";
import RevenueChart from "../components/dashboard/RevenueChart";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/useLanguage.jsx";


/* ─── Quick link button ──────────────────────────────────────── */
function QuickLink({ icon: Icon, label, sub, onClick, iconBg = "bg-slate-50", iconColor = "text-slate-500", iconAnim, accentBar = "bg-indigo-500" }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col w-full rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-1 transition-all duration-200 text-left shadow-sm overflow-hidden"
    >
      <div className={`h-[3px] w-full ${accentBar}`} />
      <div className="flex items-center gap-3 px-4 py-3">
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
      </div>
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

/* ─── Albanian month & day names ─────────────────────────────── */
const SQ_MONTHS = ["Janar","Shkurt","Mars","Prill","Maj","Qershor","Korrik","Gusht","Shtator","Tetor","Nëntor","Dhjetor"];
const SQ_DAYS   = ["E Diel","E Hënë","E Martë","E Mërkurë","E Enjte","E Premte","E Shtunë"];

/* ─── Kosovo date format: 5.Prill.2026 ───────────────────────── */
function kosovareDate(d) {
  return `${d.getDate()}.${SQ_MONTHS[d.getMonth()]}.${d.getFullYear()}`;
}

/* ─── weather code → label ───────────────────────────────────── */
function weatherLabel(code) {
  if (code === 0)  return "☀️ Kthjellët";
  if (code <= 3)   return "⛅ Vranët";
  if (code <= 48)  return "🌫️ Mjegull";
  if (code <= 67)  return "🌧️ Shi";
  if (code <= 77)  return "❄️ Borë";
  if (code <= 82)  return "🌦️ Shi i lehtë";
  if (code <= 99)  return "⛈️ Stuhi";
  return "🌤️ E panjohur";
}

/* ─── European AQI → Albanian label ──────────────────────────── */
function aqiLabel(aqi) {
  if (aqi == null) return null;
  if (aqi <= 20)  return "🟢 Ajri shumë i pastër";
  if (aqi <= 40)  return "🟡 Ajri i mirë";
  if (aqi <= 60)  return "🟠 Ajri mesatar";
  if (aqi <= 80)  return "🔴 Ajri i ndotur";
  if (aqi <= 100) return "🟣 Ajri shumë i ndotur";
  return "⚫ Ajri kritik";
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

  /* ── dynamic greeting ── */
  const [phraseIdx, setPhraseIdx]     = useState(0);
  const [contextCard, setContextCard] = useState(null);
  const [fadeIn, setFadeIn]           = useState(true);
  const [kosoDate, setKosoDate]       = useState("");   // "5.Prill.2026"
  const [dayName, setDayName]         = useState("");   // "E Diel"
  const [weatherTemp, setWeatherTemp] = useState(null); // "5°C"
  const [airQuality, setAirQuality]   = useState(null); // "🟢 Ajri i mirë"

  /* live date/day — update every minute */
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setKosoDate(kosovareDate(now));
      setDayName(SQ_DAYS[now.getDay()]);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  /* fetch weather + air quality via geolocation + open-meteo (no key needed) */
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const { latitude: lat, longitude: lon } = coords;

      /* weather */
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
        .then(r => r.json())
        .then(d => {
          const { temperature, weathercode } = d.current_weather;
          setWeatherTemp(`${weatherLabel(weathercode)}  ${Math.round(temperature)}°C`);
        })
        .catch(() => {});

      /* air quality (European AQI) */
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi`)
        .then(r => r.json())
        .then(d => {
          const aqi = d?.current?.european_aqi;
          const label = aqiLabel(aqi);
          if (label) setAirQuality(label);
        })
        .catch(() => {});
    }, () => {});
  }, []);

  /* ── 5-phase sequence ─────────────────────────────────────────
     1. Mirë se vjen [emri]
     2. Data sot:  5.Prill.2026
     3. Dita:      E Diel
     4. Moti sot:  ☀️ Kthjellët  22°C
     5. Ajri sot:  🟢 Ajri i mirë
  ──────────────────────────────────────────────────────────────── */
  const firstName = (user?.full_name || user?.name || user?.email?.split("@")[0] || "").split(" ")[0];

  const PHRASES = [
    { sub: "Pasqyra Financiare",   main: `Mirë se vjen ${firstName}`,  duration: 7000 },
    ...(kosoDate   ? [{ sub: "Data sot",        main: kosoDate,    duration: 7000 }] : []),
    ...(dayName    ? [{ sub: "Dita e javës",     main: dayName,     duration: 7000 }] : []),
    ...(weatherTemp? [{ sub: "Moti sot",         main: weatherTemp, duration: 7000 }] : []),
    ...(airQuality ? [{ sub: "Cilësia e ajrit",  main: airQuality,  duration: 7000 }] : []),
  ];

  const triggerTransition = (nextFn) => {
    setFadeIn(false);
    setTimeout(() => { nextFn(); setFadeIn(true); }, 250);
  };

  const navWithFlash = (phrase, route) => {
    triggerTransition(() => setContextCard(phrase));
    if (route) setTimeout(() => navigate(route), 380);
  };

  const onCardEnter = (phrase) => triggerTransition(() => setContextCard(phrase));
  const onCardLeave = () => triggerTransition(() => setContextCard(null));

  /* step through with per-phrase durations */
  useEffect(() => {
    if (contextCard || !PHRASES.length) return;
    const current = PHRASES[phraseIdx % PHRASES.length];
    const id = setTimeout(() => {
      triggerTransition(() => setPhraseIdx(i => (i + 1) % PHRASES.length));
    }, current?.duration ?? 7000);
    return () => clearTimeout(id);
  }, [phraseIdx, contextCard, PHRASES.length, kosoDate, dayName, weatherTemp, airQuality]);

  const activePhrase = contextCard ?? (PHRASES[phraseIdx % Math.max(PHRASES.length, 1)] || PHRASES[0]);

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
      <div className="min-h-screen p-6 lg:p-8 space-y-7" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f0f9ff 100%)" }}>
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
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
          50%      { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
        }
        @keyframes coffeeWobble {
          0%,100% { transform: rotate(0deg); }
          25%      { transform: rotate(-10deg); }
          75%      { transform: rotate(10deg); }
        }
        @keyframes slideIn {
          from { opacity:0; transform: translateY(-4px); }
          to   { opacity:1; transform: translateY(0); }
        }
      `}</style>
      <div className="p-6 lg:p-8 space-y-7 min-h-screen" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f0f9ff 100%)" }}>

        {/* ── Header — same grid as cards so filters align to col-4 ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* title: spans first 3 cols — dynamic greeting */}
          <div className="col-span-2 lg:col-span-3 min-w-0 overflow-hidden">
            <p
              className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1 transition-all duration-300 truncate"
              style={{ opacity: fadeIn ? 1 : 0, transform: fadeIn ? "translateY(0)" : "translateY(-6px)" }}
            >
              {activePhrase.sub}
            </p>
            <h1
              className="font-bold tracking-tight text-black transition-all duration-300 truncate"
              style={{
                opacity: fadeIn ? 1 : 0,
                transform: fadeIn ? "translateY(0)" : "translateY(8px)",
                fontSize: "clamp(1.2rem, 2.5vw, 2rem)",
              }}
            >
              {activePhrase.main}
            </h1>
          </div>

          {/* filters: exactly col-4 width, one row */}
          <div className="col-span-2 lg:col-span-1 flex items-center gap-2">
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-0.5 shadow-sm flex-1">
              {["today","month","year"].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={cn(
                    "flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150 text-center",
                    period === p ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  )}>
                  {periodLabels[p]}
                </button>
              ))}
            </div>
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-0.5 shadow-sm flex-1">
              {[["inc", t("withVat")], ["exc", t("withoutVat")]].map(([v, l]) => (
                <button key={v} onClick={() => setVatMode(v)}
                  className={cn(
                    "flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150 text-center",
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
          {cards.slice(0, 4).map((card, i) => {
            const phrase = { sub: "Duke hapur", main: card.title };
            return (
              <div
                key={card.title}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 55}ms`, animationFillMode: "both" }}
                onMouseEnter={() => onCardEnter(phrase)}
                onMouseLeave={onCardLeave}
              >
                <button
                  onClick={() => navWithFlash(phrase, card.route)}
                  className="w-full text-left"
                >
                  <StatCard {...card} />
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Row 2: 4 nav/count cards (compact — half height) ───────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.slice(4).map((card, i) => {
            const phrase = { sub: "Duke hapur", main: card.title };
            return (
              <div
                key={card.title}
                className="animate-fade-in"
                style={{ animationDelay: `${(i + 4) * 55}ms`, animationFillMode: "both" }}
                onMouseEnter={() => onCardEnter(phrase)}
                onMouseLeave={onCardLeave}
              >
                <button
                  onClick={() => navWithFlash(phrase, card.route)}
                  className="w-full text-left"
                >
                  <StatCard {...card} compact />
                </button>
              </div>
            );
          })}
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
                <div className="h-[3px] w-full bg-indigo-500" />
                <RevenueChart />
              </div>
            </div>
            <div className="flex flex-col justify-between h-full">
              {[
                { icon: Users2,     label: "Burimet Njerezore", sub: "HR & menaxhim punonjësish", route: '/employees',   iconBg: "bg-violet-100",  iconColor: "text-violet-600",  iconAnim: { animation: 'userPulse 3s ease-in-out infinite' },  accentBar: "bg-violet-500" },
                { icon: Clock,      label: "Prezenca",          sub: "Orari & prezenca ditore",   route: '/attendance',  iconBg: "bg-blue-100",    iconColor: "text-blue-600",    iconAnim: { animation: 'spin 8s linear infinite' },            accentBar: "bg-blue-500" },
                { icon: Car,        label: "Motorpool",         sub: "Flotë & automjete",         route: '/vehicles',    iconBg: "bg-amber-100",   iconColor: "text-amber-600",   iconAnim: { animation: 'carSlide 2s ease-in-out infinite' },   accentBar: "bg-amber-500" },
                { icon: Tag,        label: "Ofertat",           sub: "Oferta & kuotacione",       route: '/quotes',      iconBg: "bg-emerald-100", iconColor: "text-emerald-600", iconAnim: { animation: 'tagSwing 2.5s ease-in-out infinite' }, accentBar: "bg-emerald-500" },
                { icon: ScrollText, label: "Kontratat",         sub: "Kontratat e biznesit",      route: '/employees',   iconBg: "bg-rose-100",    iconColor: "text-rose-600",    iconAnim: { animation: 'scrollUp 2.5s ease-in-out infinite' }, accentBar: "bg-rose-500" },
                { icon: ShieldCheck,label: "Vërtetimet",        sub: "Certifikata & dokumente",   route: '/certificates',iconBg: "bg-teal-100",    iconColor: "text-teal-600",    iconAnim: { animation: 'shieldPulse 3s ease-in-out infinite' },accentBar: "bg-teal-500" },
              ].map(({ icon, label, sub, route, iconBg, iconColor, iconAnim, accentBar }) => (
                <div key={label} onMouseEnter={() => onCardEnter({ sub: "Duke hapur", main: label })} onMouseLeave={onCardLeave}>
                  <QuickLink icon={icon} label={label} sub={sub} onClick={() => navWithFlash({ sub: "Duke hapur", main: label }, route)} iconBg={iconBg} iconColor={iconColor} iconAnim={iconAnim} accentBar={accentBar} />
                </div>
              ))}
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
