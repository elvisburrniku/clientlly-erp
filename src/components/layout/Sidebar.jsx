import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, FileText, Users, Truck, Wallet, BarChart3, Settings, 
  ChevronLeft, ChevronRight, DollarSign, Package, Bell, ArrowRightLeft, AlertCircle, ShieldCheck, FileBarChart, Activity, Shield,
  UserCheck, Clock, CalendarDays, CalendarOff, Banknote, HandCoins, CalendarHeart,
  FolderKanban, Timer, Bug,
  FileMinus, FilePlus, Receipt, ClipboardCheck, TrendingUp
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { usePermissions } from "@/lib/usePermissions";
import { useLanguage } from "@/lib/useLanguage";

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { canView, fullAccess } = usePermissions();
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useLanguage();

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const menuItems = [
    { label: t('dashboard') || "Dashboard", icon: LayoutDashboard, path: "/", module: "dashboard" },
    { label: t('invoices') || "Faturat", icon: FileText, path: "/invoices", module: "invoices" },
    { label: "Ofertat", icon: FileText, path: "/quotes", module: "quotes" },
    { label: t('products') || "Produktet", icon: Package, path: "/products", module: "products" },
    { label: t('reminders') || "Kujtesat", icon: Bell, path: "/reminders", module: "reminders" },
    { label: t('clients') || "Klientët", icon: Users, path: "/clients", module: "clients" },
    { label: t('suppliers') || "Furnitorët", icon: Truck, path: "/suppliers", module: "suppliers" },
    { label: t('cashbox') || "Arka", icon: Wallet, path: "/cashbox", module: "cashbox" },
    { label: t('transfers') || "Transfertat", icon: ArrowRightLeft, path: "/transfers", module: "transfers" },
    { label: t('debtors') || "Borxhet", icon: AlertCircle, path: "/debtors", module: "debtors" },
    { label: t('expenses') || "Shpenzimet", icon: DollarSign, path: "/expenses", module: "expenses" },
    { label: "Faturat Blerëse", icon: Receipt, path: "/bills", module: "expenses" },
    { label: "Nota Kreditore", icon: FileMinus, path: "/credit-notes", module: "invoices" },
    { label: "Nota Debitore", icon: FilePlus, path: "/debit-notes", module: "invoices" },
    { label: "Kërkesat Shpenzim", icon: ClipboardCheck, path: "/expense-requests", module: "expenses" },
    { label: "Të Ardhurat", icon: TrendingUp, path: "/revenues", module: "invoices" },
    { label: t('cashHandover') || "Dorëzimi i Parave", icon: DollarSign, path: "/cash-handover", module: "cash_handover" },
    { label: "Projektet", icon: FolderKanban, path: "/projects", module: "projects" },
    { label: "Oraret", icon: Timer, path: "/timesheets", module: "timesheets" },
    { label: "Bug-et", icon: Bug, path: "/bugs", module: "bugs" },
  ];

  const hrItems = [
    { label: "Punonjësit", icon: UserCheck, path: "/employees", module: "hr" },
    { label: "Prezenca", icon: Clock, path: "/attendance", module: "hr" },
    { label: "Turnet", icon: CalendarDays, path: "/shifts", module: "hr" },
    { label: "Lejet", icon: CalendarOff, path: "/leave", module: "hr" },
    { label: "Pagat", icon: Banknote, path: "/payroll", module: "hr" },
    { label: "Paradhëniet", icon: HandCoins, path: "/advances", module: "hr" },
    { label: "Festat", icon: CalendarHeart, path: "/holidays", module: "hr" },
  ];

  const performanceItems = [
    { label: t('reports') || "Raportet", icon: BarChart3, path: "/reports", module: "reports" },
    { label: "Royalties", icon: DollarSign, path: "/royalties", module: "royalties" },
    { label: t('reportTemplates') || "Template-e Raporteve", icon: FileBarChart, path: "/report-templates", module: "report_templates" },
  ];

  const adminItems = [
    { label: t('activityLog') || "Activity Log", icon: Activity, path: "/activity-log", module: "activity_log" },
    { label: t('roleManagement') || "Role Management", icon: Shield, path: "/role-management", module: "users" },
  ];

  const visibleMenuItems = menuItems.filter(item => fullAccess || canView(item.module));
  const visiblePerfItems = performanceItems.filter(item => fullAccess || canView(item.module));
  const visibleHrItems = hrItems.filter(item => fullAccess || canView(item.module));

  const renderLink = (item) => {
    const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
    return (
      <Link
        key={item.path}
        to={item.path}
        data-testid={`nav-link-${item.path.replace('/', '') || 'dashboard'}`}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-white/15 text-white shadow-lg backdrop-blur-sm"
            : "text-white/55 hover:bg-white/8 hover:text-white/90"
        )}
      >
        <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "text-white/50")} />
        {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
        {isActive && !collapsed && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
        )}
      </Link>
    );
  };

  return (
    <aside
      onMouseLeave={() => setCollapsed(true)}
      onMouseEnter={() => setCollapsed(false)}
      className={cn(
        "h-screen sticky top-0 flex flex-col text-[hsl(230,40%,90%)] transition-all duration-300 ease-in-out z-30",
        "bg-gradient-to-b from-slate-900 to-slate-800",
        collapsed ? "w-[68px]" : "w-[250px]"
      )}
    >
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
          <span className="text-white font-bold text-sm">E</span>
        </div>
        {!collapsed && (
          <span className="text-base font-bold tracking-tight whitespace-nowrap text-white">
            ERP Finance
          </span>
        )}
      </div>

      <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
        {!collapsed && visibleMenuItems.length > 0 && (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-3 mb-3">{t('menu') || 'Menuja'}</p>
        )}
        {visibleMenuItems.map(renderLink)}

        {visibleHrItems.length > 0 && (
          <>
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-3 mb-3 mt-6">Burimet Njerëzore</p>
            )}
            {visibleHrItems.map(renderLink)}
          </>
        )}

        {visiblePerfItems.length > 0 && (
          <>
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-3 mb-3 mt-6">{t('companyPerformance') || 'Performanca e Kompanisë'}</p>
            )}
            {visiblePerfItems.map(renderLink)}
          </>
        )}

        {!collapsed && (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-3 mb-3 mt-6">{t('other') || 'Të Tjera'}</p>
        )}
        {(fullAccess || canView('settings')) && renderLink({ label: t('settings') || "Parametrat", icon: Settings, path: "/settings", module: "settings" })}

        {isAdmin && (
          <>
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-3 mb-3 mt-6">{t('administration') || 'Administration'}</p>
            )}
            {adminItems.map(renderLink)}
          </>
        )}

        {user?.role === "superadmin" && (
          <>
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/60 px-3 mb-3 mt-6">Super Admin</p>
            )}
            <Link
              to="/super-admin"
              data-testid="nav-link-super-admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                location.pathname === '/super-admin'
                  ? "bg-amber-500/20 text-amber-300 shadow-lg"
                  : "text-amber-400/60 hover:bg-amber-500/10 hover:text-amber-300"
              )}
            >
              <ShieldCheck className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">Tenantët</span>}
            </Link>
          </>
        )}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-white/10 text-white/30 hover:text-white transition-colors"
        data-testid="button-toggle-sidebar"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
