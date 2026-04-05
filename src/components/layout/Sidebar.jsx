import { Link, useLocation } from "react-router-dom";
import {
  Home,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Tag,
  TrendingUp,
  FileMinus,
  FilePlus,
  ShoppingBag,
  CreditCard,
  UsersRound,
  Vault,
  ArrowRightLeft,
  Landmark,
  ClipboardCheck,
  Coins,
  ReceiptText,
  Package,
  PackageSearch,
  BriefcaseBusiness,
  ClipboardList,
  Timer,
  Bug,
  Target,
  Send,
  Handshake,
  Bell,
  StickyNote,
  Megaphone,
  FolderOpen,
  Award,
  Fingerprint,
  CalendarOff,
  Banknote,
  PiggyBank,
  CalendarHeart,
  CalendarRange,
  Boxes,
  Car,
  UserCog,
  Wrench,
  Fuel,
  LineChart,
  Settings2,
  Warehouse,
  ArrowDownUp,
  ShoppingCart,
  ArrowLeftRight as TransferIcon,
  AlertOctagon,
  BarChart2,
  PieChart,
  QrCode,
  BookOpen,
  BookMarked,
  BookText,
  Scale,
  BarChart,
  LayoutGrid,
  FileOutput,
  FileInput,
  Percent,
  IdCard,
  Store,
  History,
  ListOrdered,
  BarChart3,
  Sliders,
  FileBarChart,
  Calculator,
  Medal,
  Settings,
  Activity,
  ShieldCheck,
  FileQuestion,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { usePermissions } from "@/lib/usePermissions";

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { canView, fullAccess } = usePermissions();
  const [collapsed, setCollapsed] = useState(true);

  const isAdmin = user?.role === "admin" || user?.role === "owner" || user?.role === "superadmin";

  const [sectionOpen, setSectionOpen] = useState({
    management: false,
    finance: false,
    financialReports: false,
    hr: false,
    attendance: false,
    warehouse: false,
    accounting: false,
    posSales: false,
    performance: false,
    administration: false,
    configuration: false,
    superAdmin: false,
  });

  const toggleSection = (key) => {
    setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const canSee = (module) => fullAccess || canView(module);

  const dashboardItem = { label: "Ballina", icon: Home, path: "/", module: "dashboard" };

  const managementItems = [
    { label: "Projektet", icon: BriefcaseBusiness, path: "/projects", module: "projects" },
    { label: "Oraret", icon: Timer, path: "/timesheets", module: "timesheets" },
    { label: "Bug-et", icon: Bug, path: "/bugs", module: "bugs" },
    { label: "Leads", icon: Target, path: "/leads", module: "leads" },
    { label: "Propozimet", icon: Send, path: "/proposals", module: "proposals" },
    { label: "Marrëveshjet", icon: Handshake, path: "/agreements", module: "agreements" },
    { label: "Kujtesat", icon: Bell, path: "/reminders", module: "reminders" },
    { label: "Shënimet", icon: StickyNote, path: "/notes", module: "notes" },
    { label: "Njoftimet", icon: Megaphone, path: "/announcements", module: "announcements" },
    { label: "Dokumentet", icon: FolderOpen, path: "/company-documents", module: "company_documents" },
    { label: "Certifikatat", icon: Award, path: "/certificates", module: "certificates" },
  ];

  const serviceFleetItems = [
    { label: "Kalendari i Shërbimeve", icon: CalendarRange, path: "/service-calendar", module: "service_calendar" },
    { label: "Asetet", icon: Boxes, path: "/assets", module: "assets" },
    { label: "Automjetet", icon: Car, path: "/vehicles", module: "vehicles" },
    { label: "Shoferët & Rezervimet", icon: UserCog, path: "/drivers", module: "drivers" },
    { label: "Mirëmbajtja", icon: Wrench, path: "/vehicle-maintenance", module: "vehicle_maintenance" },
    { label: "Karburanti", icon: Fuel, path: "/fuel-logs", module: "fuel_logs" },
    { label: "Raportet e Flotës", icon: LineChart, path: "/fleet-reports", module: "fleet_reports" },
    { label: "Fushat e Personalizuara", icon: Settings2, path: "/custom-fields", module: "custom_fields" },
  ];

  const financeItems = [
    { label: "Arka", icon: Vault, path: "/cashbox", module: "cashbox" },
    { label: "Transfertat", icon: ArrowRightLeft, path: "/transfers", module: "transfers" },
    { label: "Borxhet", icon: Landmark, path: "/debtors", module: "debtors" },
    { label: "Shpenzimet", icon: ReceiptText, path: "/expenses", module: "expenses" },
    { label: "Kërkesat për Shpenzim", icon: ClipboardCheck, path: "/expense-requests", module: "expenses" },
    { label: "Dorëzimi i Parave", icon: Coins, path: "/cash-handover", module: "cash_handover" },
    { label: "Kërkesa për Dorëzim", icon: FileQuestion, path: "/cash-handover-request", module: "cash_handover" },
  ];

  const financialReportItems = [
    { label: "Analitika e Faturave", icon: FileBarChart, path: "/invoice-analytics", module: "invoices" },
    { label: "Raportet", icon: BarChart3, path: "/reports", module: "reports" },
    { label: "Shabllonet e Raporteve", icon: ClipboardList, path: "/report-templates", module: "report_templates" },
  ];

  const hrItems = [
    { label: "Punonjësit", icon: UsersRound, path: "/employees", module: "hr" },
    { label: "Lejet", icon: CalendarOff, path: "/leave", module: "hr" },
    { label: "Pagat", icon: Banknote, path: "/payroll", module: "hr" },
    { label: "Paradhëniet", icon: PiggyBank, path: "/advances", module: "hr" },
    { label: "Festat", icon: CalendarHeart, path: "/holidays", module: "hr" },
  ];

  const attendanceItems = [
    { label: "Prezenca", icon: Fingerprint, path: "/attendance", module: "hr" },
  ];

  const warehouseItems = [
    { label: "Produktet", icon: Package, path: "/products", module: "products" },
    { label: "Katalogu i Produkteve", icon: PackageSearch, path: "/catalog", module: "products" },
    { label: "Magazinat", icon: Warehouse, path: "/warehouses", module: "inventory" },
    { label: "Lëvizjet e Stokut", icon: ArrowDownUp, path: "/stock-movements", module: "inventory" },
    { label: "Porositë e Blerjes", icon: ShoppingCart, path: "/purchase-orders", module: "inventory" },
    { label: "Transfertat e Stokut", icon: TransferIcon, path: "/stock-transfers", module: "inventory" },
    { label: "Alarmet e Stokut", icon: AlertOctagon, path: "/stock-alerts", module: "inventory" },
    { label: "Vlerësimi i Stokut", icon: BarChart2, path: "/stock-valuation", module: "inventory" },
    { label: "Analitika e Prokurimit", icon: PieChart, path: "/procurement-analytics", module: "inventory" },
    { label: "Barkode & Etiketa", icon: QrCode, path: "/barcode-labels", module: "inventory" },
  ];

  const accountingItems = [
    { label: "Plani Kontabël", icon: BookOpen, path: "/chart-of-accounts", module: "accounting" },
    { label: "Librat Kontabël", icon: BookMarked, path: "/journals", module: "accounting" },
    { label: "Regjistrimet", icon: BookText, path: "/journal-entries", module: "accounting" },
    { label: "Bilanci Provës", icon: Scale, path: "/trial-balance", module: "accounting" },
    { label: "Pasqyra e të Ardhurave", icon: BarChart, path: "/income-statement", module: "accounting" },
    { label: "Bilanci", icon: LayoutGrid, path: "/balance-sheet", module: "accounting" },
    { label: "Libri i Shitjeve ATK", icon: FileOutput, path: "/atk-sales-book", module: "accounting" },
    { label: "Libri i Blerjeve ATK", icon: FileInput, path: "/atk-purchase-book", module: "accounting" },
    { label: "Normat e TVSH-së", icon: Percent, path: "/tax-rates", module: "accounting" },
    { label: "Përmbledhje TVSH", icon: Calculator, path: "/tax-summary", module: "accounting" },
    { label: "Kartela Financiare", icon: IdCard, path: "/financial-cards", module: "accounting" },
  ];

  const posSalesItems = [
    { label: "Ofertat", icon: Tag, path: "/quotes", module: "quotes" },
    { label: "Faturat", icon: ReceiptText, path: "/invoices", module: "invoices" },
    { label: "Notat Kreditore", icon: FileMinus, path: "/credit-notes", module: "invoices" },
    { label: "Notat Debitore", icon: FilePlus, path: "/debit-notes", module: "invoices" },
    { label: "Faturat Blerëse", icon: ShoppingBag, path: "/bills", module: "expenses" },
    { label: "Pagesat", icon: CreditCard, path: "/payments", module: "invoices" },
    { label: "Të Ardhurat", icon: TrendingUp, path: "/revenues", module: "invoices" },
    { label: "POS", icon: Store, path: "/pos", module: "pos" },
    { label: "Sesionet POS", icon: History, path: "/pos-sessions", module: "pos" },
    { label: "Porositë e Shitjes", icon: ListOrdered, path: "/sales-orders", module: "pos" },
    { label: "Raportet POS", icon: BarChart3, path: "/pos-reports", module: "pos" },
    { label: "Konfigurimet POS", icon: Sliders, path: "/pos-config", module: "pos" },
  ];

  const performanceItems = [
    { label: "Royalties", icon: Medal, path: "/royalties", module: "royalties" },
  ];

  const administrationItems = [
    { label: "Përdoruesit & Rolet", icon: ShieldCheck, path: "/role-management", module: "users" },
    { label: "Activity Log", icon: Activity, path: "/activity-log", module: "activity_log" },
  ];

  const configurationItems = [
    { label: "Konfigurimet", icon: Settings, path: "/settings", module: "settings" },
  ];

  const visibleManagementItems = [...managementItems, ...serviceFleetItems].filter((item) => canSee(item.module));
  const visibleFinanceItems = financeItems.filter((item) => canSee(item.module));
  const visibleFinancialReportItems = financialReportItems.filter((item) => canSee(item.module));
  const visibleHrItems = hrItems.filter((item) => canSee(item.module));
  const visibleAttendanceItems = attendanceItems.filter((item) => canSee(item.module));
  const visibleWarehouseItems = warehouseItems.filter((item) => canSee(item.module));
  const visibleAccountingItems = accountingItems.filter((item) => canSee(item.module));
  const visiblePosSalesItems = posSalesItems.filter((item) => canSee(item.module));
  const visiblePerformanceItems = performanceItems.filter((item) => canSee(item.module));
  const visibleAdministrationItems = administrationItems.filter((item) => {
    if (item.module === "activity_log") return isAdmin;
    if (item.module === "users") return isAdmin;
    return canSee(item.module);
  });
  const visibleConfigurationItems = configurationItems.filter((item) => canSee(item.module));

  const renderLink = (item) => {
    const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));

    return (
      <Link
        key={item.path}
        to={item.path}
        title={collapsed ? item.label : undefined}
        data-testid={`nav-link-${item.path.replace("/", "") || "dashboard"}`}
        className={cn(
          "flex items-center transition-all duration-200 font-medium text-sm",
          collapsed ? "justify-center w-10 h-10 mx-auto rounded-xl" : "gap-3 px-3 py-2.5 rounded-xl",
          isActive
            ? "bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-md shadow-indigo-300"
            : "text-slate-800 hover:bg-indigo-50 hover:text-indigo-900",
        )}
      >
        <item.icon
          className={cn(
            "shrink-0 transition-all duration-200",
            collapsed ? "w-[18px] h-[18px]" : "w-5 h-5",
            isActive ? "text-white" : "text-slate-700",
          )}
        />
        {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
        {isActive && !collapsed && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />}
      </Link>
    );
  };

  const renderSection = (key, label, items, opts = {}) => {
    if (items.length === 0) return null;

    const isOpen = sectionOpen[key];
    const labelColor = opts.amber ? "text-amber-500" : "text-indigo-400";
    const SectionIcon = opts.icon;

    return (
      <div className="mt-4">
        <button
          onClick={() => toggleSection(key)}
          title={collapsed ? label : undefined}
          data-testid={`section-toggle-${key}`}
          className={cn(
            "flex items-center transition-all duration-200 font-medium text-sm",
            collapsed ? "justify-center w-10 h-10 mx-auto rounded-xl" : "gap-1.5 w-full px-3 py-2.5 mb-1 rounded-xl",
            collapsed
              ? "text-slate-800 hover:bg-indigo-50 hover:text-indigo-900"
              : labelColor,
          )}
        >
          {SectionIcon && (
            <SectionIcon
              className={cn(
                "shrink-0 transition-all duration-200",
                "w-[18px] h-[18px]",
                collapsed ? "text-slate-700" : labelColor,
              )}
            />
          )}
          {!collapsed && <span className="flex-1 text-left text-[10px] font-semibold uppercase tracking-widest">{label}</span>}
          {!collapsed && (
            <ChevronDown
              className={cn("w-3 h-3 shrink-0 transition-transform duration-200", isOpen ? "rotate-0" : "-rotate-90")}
            />
          )}
        </button>
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="space-y-0.5">{items.map(renderLink)}</div>
        </div>
      </div>
    );
  };

  return (
    <aside
      onMouseLeave={() => setCollapsed(true)}
      onMouseEnter={() => setCollapsed(false)}
      className={cn(
        "h-screen sticky top-0 flex flex-col transition-all duration-300 ease-in-out z-30",
        "bg-white border-r border-slate-200 shadow-sm",
        collapsed ? "w-[80px]" : "w-[260px]",
      )}
    >
      <div
        className={cn(
          "flex items-center h-16 border-b border-slate-100 transition-all duration-300",
          collapsed ? "justify-center px-2" : "gap-3 px-5",
        )}
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-200">
          <span className="text-white font-bold text-sm">E</span>
        </div>
        {!collapsed && <span className="text-base font-bold tracking-tight whitespace-nowrap text-slate-900">ERP Finance</span>}
      </div>

      <nav
        className={cn(
          "flex-1 py-4 overflow-y-auto space-y-0.5 transition-all duration-300",
          collapsed ? "px-1.5" : "px-3",
        )}
      >
        {(fullAccess || canSee("dashboard")) && renderLink(dashboardItem)}

        {renderSection("management", "Menaxhmenti", visibleManagementItems, { icon: BriefcaseBusiness })}
        {renderSection("finance", "Financat", visibleFinanceItems, { icon: Vault })}
        {renderSection("financialReports", "Raportet Financiare", visibleFinancialReportItems, { icon: FileBarChart })}
        {renderSection("hr", "Burime Njerëzore", visibleHrItems, { icon: UsersRound })}
        {renderSection("attendance", "Prezenca", visibleAttendanceItems, { icon: Fingerprint })}
        {renderSection("warehouse", "Magazina & Prokurimi", visibleWarehouseItems, { icon: Warehouse })}
        {renderSection("accounting", "Kontabiliteti", visibleAccountingItems, { icon: Calculator })}
        {renderSection("posSales", "POS & Shitjet", visiblePosSalesItems, { icon: Store })}
        {renderSection("performance", "Performanca e Kompanisë", visiblePerformanceItems, { icon: Medal })}
        {renderSection("administration", "ADMINISTRIMI", visibleAdministrationItems, { icon: ShieldCheck, amber: true })}
        {renderSection("configuration", "Konfigurimet", visibleConfigurationItems, { icon: Settings })}

        {user?.role === "superadmin" && (
          <div className="mt-4">
            {!collapsed && (
              <button
                onClick={() => toggleSection("superAdmin")}
                data-testid="section-toggle-superAdmin"
                className="flex items-center w-full gap-1.5 px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-500"
              >
                <span className="flex items-center gap-1.5 flex-1 text-left">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>SUPER ADMIN</span>
                </span>
                <ChevronDown
                  className={cn(
                    "w-3 h-3 shrink-0 transition-transform duration-200",
                    sectionOpen.superAdmin ? "rotate-0" : "-rotate-90",
                  )}
                />
              </button>
            )}
            <div
              className={cn(
                "overflow-hidden transition-all duration-200",
                sectionOpen.superAdmin ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
              )}
            >
              <Link
                to="/super-admin"
                title={collapsed ? "SUPER ADMIN" : undefined}
                data-testid="nav-link-super-admin"
                className={cn(
                  "flex items-center transition-all duration-200 text-sm font-medium",
                  collapsed ? "justify-center w-10 h-10 mx-auto rounded-xl" : "gap-3 px-3 py-2.5 rounded-xl",
                  location.pathname === "/super-admin"
                    ? "bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-md shadow-indigo-300"
                    : "text-slate-800 hover:bg-indigo-50 hover:text-indigo-900",
                )}
              >
                <ShieldCheck className={cn("shrink-0", collapsed ? "w-[18px] h-[18px]" : "w-5 h-5")} />
                {!collapsed && <span className="whitespace-nowrap">Tenantët</span>}
              </Link>
            </div>
          </div>
        )}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-slate-100 text-slate-400 hover:text-violet-600 hover:bg-slate-50 transition-colors"
        data-testid="button-toggle-sidebar"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
