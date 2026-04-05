import { Link, useLocation } from "react-router-dom";
import {
  /* navigation */
  LayoutDashboard, ChevronLeft, ChevronRight, ChevronDown,
  /* Sales */
  Tag, TrendingUp,
  /* Billing */
  FileText, FileMinus, FilePlus, ShoppingBag, CreditCard,
  /* Contacts */
  Users, Factory,
  /* Finance */
  Vault, ArrowRightLeft, Landmark, TrendingDown, ClipboardCheck, Coins,
  /* Products */
  Package,
  /* Projects & CRM */
  FolderKanban, Timer, Bug, Target, Send, Handshake,
  Bell, StickyNote, Megaphone, FolderOpen, Award,
  /* HR */
  UserCheck, Fingerprint, CalendarClock, CalendarOff,
  Banknote, PiggyBank, CalendarHeart,
  /* Service & Fleet */
  CalendarRange, Boxes, Car, UserCog, Wrench, Fuel, LineChart, Settings2,
  /* Warehouse */
  Warehouse, ArrowDownUp, ShoppingCart, ArrowLeftRight as TransferIcon,
  AlertOctagon, BarChart2, PieChart, QrCode,
  /* Accounting */
  BookOpen, BookMarked, BookText, Scale, BarChart, LayoutGrid,
  FileOutput, FileInput, Percent, IdCard,
  /* POS */
  Store, History, ListOrdered, BarChart3, Sliders,
  /* Performance */
  FileBarChart, Medal,
  /* Admin */
  Settings, Activity, Shield,
  /* Other */
  ShieldCheck, DollarSign,
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
  const [collapsed, setCollapsed] = useState(true);
  const { t } = useLanguage();

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [sectionOpen, setSectionOpen] = useState({
    sales: true,
    billing: true,
    contacts: true,
    finance: true,
    products: true,
    projectsCrm: true,
    hr: true,
    serviceFleet: true,
    warehouse: true,
    accounting: true,
    pos: true,
    performance: true,
    administration: true,
    superAdmin: true,
  });

  const toggleSection = (key) => {
    setSectionOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const dashboardItem = { label: t('dashboard') || "Dashboard", icon: LayoutDashboard, path: "/", module: "dashboard" };

  const salesItems = [
    { label: "Ofertat",       icon: Tag,         path: "/quotes",    module: "quotes" },
    { label: "Të Ardhurat",   icon: TrendingUp,  path: "/revenues",  module: "invoices" },
  ];

  const billingItems = [
    { label: t('invoices') || "Faturat",  icon: FileText,    path: "/invoices",    module: "invoices" },
    { label: "Nota Kreditore",            icon: FileMinus,   path: "/credit-notes",module: "invoices" },
    { label: "Nota Debitore",             icon: FilePlus,    path: "/debit-notes", module: "invoices" },
    { label: "Faturat Blerëse",           icon: ShoppingBag, path: "/bills",       module: "expenses" },
    { label: "Pagesat",                   icon: CreditCard,  path: "/payments",    module: "invoices" },
  ];

  const contactsItems = [
    { label: t('clients') || "Klientët",     icon: Users,   path: "/clients",   module: "clients" },
    { label: t('suppliers') || "Furnitorët", icon: Factory, path: "/suppliers", module: "suppliers" },
  ];

  const financeItems = [
    { label: t('cashbox') || "Arka",                    icon: Vault,         path: "/cashbox",          module: "cashbox" },
    { label: t('transfers') || "Transfertat",           icon: ArrowRightLeft,path: "/transfers",         module: "transfers" },
    { label: t('debtors') || "Borxhet",                 icon: Landmark,      path: "/debtors",           module: "debtors" },
    { label: t('expenses') || "Shpenzimet",             icon: TrendingDown,  path: "/expenses",          module: "expenses" },
    { label: "Kërkesat Shpenzim",                       icon: ClipboardCheck,path: "/expense-requests",  module: "expenses" },
    { label: t('cashHandover') || "Dorëzimi i Parave",  icon: Coins,         path: "/cash-handover",     module: "cash_handover" },
  ];

  const productsItems = [
    { label: t('products') || "Produktet", icon: Package, path: "/products", module: "products" },
  ];

  const projectsCrmItems = [
    { label: "Projektet",   icon: FolderKanban, path: "/projects",         module: "projects" },
    { label: "Oraret",      icon: Timer,        path: "/timesheets",        module: "timesheets" },
    { label: "Bug-et",      icon: Bug,          path: "/bugs",              module: "bugs" },
    { label: "Leads",       icon: Target,       path: "/leads",             module: "leads" },
    { label: "Propozimet",  icon: Send,         path: "/proposals",         module: "proposals" },
    { label: "Marrëveshjet",icon: Handshake,    path: "/agreements",        module: "agreements" },
    { label: t('reminders') || "Kujtesat", icon: Bell,       path: "/reminders",  module: "reminders" },
    { label: "Shënimet",    icon: StickyNote,   path: "/notes",             module: "notes" },
    { label: "Njoftimet",   icon: Megaphone,    path: "/announcements",     module: "announcements" },
    { label: "Dokumentet",  icon: FolderOpen,   path: "/company-documents", module: "company_documents" },
    { label: "Certifikatat",icon: Award,        path: "/certificates",      module: "certificates" },
  ];

  const hrItems = [
    { label: "Punonjësit",  icon: UserCheck,   path: "/employees",  module: "hr" },
    { label: "Prezenca",    icon: Fingerprint,  path: "/attendance", module: "hr" },
    { label: "Turnet",      icon: CalendarClock,path: "/shifts",     module: "hr" },
    { label: "Lejet",       icon: CalendarOff,  path: "/leave",      module: "hr" },
    { label: "Pagat",       icon: Banknote,     path: "/payroll",    module: "hr" },
    { label: "Paradhëniet", icon: PiggyBank,    path: "/advances",   module: "hr" },
    { label: "Festat",      icon: CalendarHeart,path: "/holidays",   module: "hr" },
  ];

  const serviceFleetItems = [
    { label: "Kalendari i Shërbimeve", icon: CalendarRange, path: "/service-calendar",    module: "service_calendar" },
    { label: "Asetet",                 icon: Boxes,         path: "/assets",               module: "assets" },
    { label: "Automjetet",             icon: Car,           path: "/vehicles",             module: "vehicles" },
    { label: "Shoferët & Rezervimet",  icon: UserCog,       path: "/drivers",              module: "drivers" },
    { label: "Mirëmbajtja",            icon: Wrench,        path: "/vehicle-maintenance",  module: "vehicle_maintenance" },
    { label: "Karburanti",             icon: Fuel,          path: "/fuel-logs",            module: "fuel_logs" },
    { label: "Raportet e Flotës",      icon: LineChart,     path: "/fleet-reports",        module: "fleet_reports" },
    { label: "Fushat e Personalizuara",icon: Settings2,     path: "/custom-fields",        module: "custom_fields" },
  ];

  const warehouseItems = [
    { label: "Magazinat",            icon: Warehouse,    path: "/warehouses",             module: "inventory" },
    { label: "Lëvizjet e Stokut",    icon: ArrowDownUp,  path: "/stock-movements",        module: "inventory" },
    { label: "Porositë e Blerjes",   icon: ShoppingCart, path: "/purchase-orders",        module: "inventory" },
    { label: "Transfertat Stokut",   icon: TransferIcon, path: "/stock-transfers",        module: "inventory" },
    { label: "Alarmet e Stokut",     icon: AlertOctagon, path: "/stock-alerts",           module: "inventory" },
    { label: "Vlerësimi Stokut",     icon: BarChart2,    path: "/stock-valuation",        module: "inventory" },
    { label: "Analitika Prokurimit", icon: PieChart,     path: "/procurement-analytics",  module: "inventory" },
    { label: "Barkode & Etiketa",    icon: QrCode,       path: "/barcode-labels",         module: "inventory" },
  ];

  const accountingItems = [
    { label: "Plani Kontabël",       icon: BookOpen,    path: "/chart-of-accounts", module: "accounting" },
    { label: "Librat Kontabël",      icon: BookMarked,  path: "/journals",          module: "accounting" },
    { label: "Regjistrime",          icon: BookText,    path: "/journal-entries",   module: "accounting" },
    { label: "Bilanci Provës",       icon: Scale,       path: "/trial-balance",     module: "accounting" },
    { label: "Pasqyra e Të Ardhurave", icon: BarChart,  path: "/income-statement",  module: "accounting" },
    { label: "Bilanci",              icon: LayoutGrid,  path: "/balance-sheet",     module: "accounting" },
    { label: "Libri Shitjeve ATK",   icon: FileOutput,  path: "/atk-sales-book",    module: "accounting" },
    { label: "Libri Blerjeve ATK",   icon: FileInput,   path: "/atk-purchase-book", module: "accounting" },
    { label: "Normat e TVSH-së",      icon: Percent,     path: "/tax-rates",         module: "accounting" },
    { label: "Përmbledhje TVSH",     icon: Percent,     path: "/tax-summary",       module: "accounting" },
    { label: "Kartela Financiare",   icon: IdCard,      path: "/financial-cards",   module: "accounting" },
  ];

  const posItems = [
    { label: "Pika e Shitjes",    icon: Store,        path: "/pos",          module: "pos" },
    { label: "Sesionet POS",      icon: History,      path: "/pos-sessions", module: "pos" },
    { label: "Porositë e Shitjes",icon: ListOrdered,  path: "/sales-orders", module: "pos" },
    { label: "Raportet POS",      icon: BarChart3,    path: "/pos-reports",  module: "pos" },
    { label: "Konfigurimet POS",  icon: Sliders,      path: "/pos-config",   module: "pos" },
  ];

  const performanceItems = [
    { label: t('reports') || "Raportet",                   icon: FileBarChart, path: "/reports",          module: "reports" },
    { label: "Royalties",                                  icon: Medal,        path: "/royalties",         module: "royalties" },
    { label: t('reportTemplates') || "Template-e Raporteve", icon: BarChart3, path: "/report-templates",  module: "report_templates" },
  ];

  const adminItems = [
    { label: t('settings') || "Parametrat",         icon: Settings, path: "/settings",       module: "settings" },
    { label: t('activityLog') || "Activity Log",    icon: Activity, path: "/activity-log",   module: "activity_log" },
    { label: t('roleManagement') || "Role Management", icon: Shield,path: "/role-management", module: "users" },
  ];

  const visibleSales          = salesItems.filter(item => fullAccess || canView(item.module));
  const visibleBilling        = billingItems.filter(item => fullAccess || canView(item.module));
  const visibleContacts       = contactsItems.filter(item => fullAccess || canView(item.module));
  const visibleFinance        = financeItems.filter(item => fullAccess || canView(item.module));
  const visibleProducts       = productsItems.filter(item => fullAccess || canView(item.module));
  const visibleProjectsCrm    = projectsCrmItems.filter(item => fullAccess || canView(item.module));
  const visibleHrItems        = hrItems.filter(item => fullAccess || canView(item.module));
  const visibleFleetItems     = serviceFleetItems.filter(item => fullAccess || canView(item.module));
  const visibleWarehouseItems = warehouseItems.filter(item => fullAccess || canView(item.module));
  const visibleAccountingItems= accountingItems.filter(item => fullAccess || canView(item.module));
  const visiblePosItems       = posItems.filter(item => fullAccess || canView(item.module));
  const visiblePerfItems      = performanceItems.filter(item => fullAccess || canView(item.module));
  const visibleAdminItems     = adminItems.filter(item => {
    if (item.module === "settings")    return fullAccess || canView("settings");
    if (item.module === "activity_log")return isAdmin;
    if (item.module === "users")       return isAdmin;
    return false;
  });

  const renderLink = (item) => {
    const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
    return (
      <Link
        key={item.path}
        to={item.path}
        title={collapsed ? item.label : undefined}
        data-testid={`nav-link-${item.path.replace('/', '') || 'dashboard'}`}
        className={cn(
          "flex items-center transition-all duration-200 font-medium text-sm",
          collapsed
            ? "justify-center w-10 h-10 mx-auto rounded-xl"
            : "gap-3 px-3 py-2.5 rounded-xl",
          isActive
            ? "bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-md shadow-indigo-300"
            : "text-slate-800 hover:bg-indigo-50 hover:text-indigo-900"
        )}
      >
        <item.icon className={cn(
          "shrink-0 transition-all duration-200",
          collapsed ? "w-[18px] h-[18px]" : "w-5 h-5",
          isActive ? "text-white" : "text-slate-700"
        )} />
        {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
        {isActive && !collapsed && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />
        )}
      </Link>
    );
  };

  const renderSection = (key, label, items, opts = {}) => {
    if (items.length === 0) return null;
    const isOpen = sectionOpen[key];
    const labelColor = opts.amber ? "text-amber-500" : "text-indigo-400";
    return (
      <div className="mt-4">
        {!collapsed && (
          <button
            onClick={() => toggleSection(key)}
            data-testid={`section-toggle-${key}`}
            className={cn(
              "flex items-center w-full gap-1.5 px-3 mb-1 group",
              "text-[10px] font-semibold uppercase tracking-widest",
              labelColor
            )}
          >
            <span className="flex-1 text-left">{label}</span>
            <ChevronDown
              className={cn(
                "w-3 h-3 shrink-0 transition-transform duration-200",
                isOpen ? "rotate-0" : "-rotate-90"
              )}
            />
          </button>
        )}
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="space-y-0.5">
            {items.map(renderLink)}
          </div>
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
        collapsed ? "w-[80px]" : "w-[260px]"
      )}
    >
      <div className={cn(
        "flex items-center h-16 border-b border-slate-100 transition-all duration-300",
        collapsed ? "justify-center px-2" : "gap-3 px-5"
      )}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-200">
          <span className="text-white font-bold text-sm">E</span>
        </div>
        {!collapsed && (
          <span className="text-base font-bold tracking-tight whitespace-nowrap text-slate-900">
            ERP Finance
          </span>
        )}
      </div>

      <nav className={cn(
        "flex-1 py-4 overflow-y-auto space-y-0.5 transition-all duration-300",
        collapsed ? "px-1.5" : "px-3"
      )}>
        {(fullAccess || canView("dashboard")) && renderLink(dashboardItem)}

        {renderSection("sales",        "Shitjet",                 visibleSales)}
        {renderSection("billing",      "Faturimi",                visibleBilling)}
        {renderSection("contacts",     "Kontaktet",               visibleContacts)}
        {renderSection("finance",      "Financat",                visibleFinance)}
        {renderSection("products",     "Produktet",               visibleProducts)}
        {renderSection("projectsCrm",  "Projekte & CRM",          visibleProjectsCrm)}
        {renderSection("hr",           "Burimet Njerëzore",       visibleHrItems)}
        {renderSection("serviceFleet", "Shërbime & Flotë",        visibleFleetItems)}
        {renderSection("warehouse",    "Magazina & Prokurimi",    visibleWarehouseItems)}
        {renderSection("accounting",   "Kontabilitet",            visibleAccountingItems)}
        {renderSection("pos",          "POS & Shitjet",           visiblePosItems)}
        {renderSection("performance",  t('companyPerformance') || "Performanca", visiblePerfItems)}

        {visibleAdminItems.length > 0 && renderSection("administration", t('administration') || "Administrimi", visibleAdminItems)}

        {user?.role === "superadmin" && (
          <div className="mt-4">
            {!collapsed && (
              <button
                onClick={() => toggleSection("superAdmin")}
                data-testid="section-toggle-superAdmin"
                className="flex items-center w-full gap-1.5 px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-500"
              >
                <span className="flex-1 text-left">Super Admin</span>
                <ChevronDown
                  className={cn(
                    "w-3 h-3 shrink-0 transition-transform duration-200",
                    sectionOpen.superAdmin ? "rotate-0" : "-rotate-90"
                  )}
                />
              </button>
            )}
            <div
              className={cn(
                "overflow-hidden transition-all duration-200",
                sectionOpen.superAdmin ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <Link
                to="/super-admin"
                title={collapsed ? "Tenantët" : undefined}
                data-testid="nav-link-super-admin"
                className={cn(
                  "flex items-center transition-all duration-200 text-sm font-medium",
                  collapsed
                    ? "justify-center w-10 h-10 mx-auto rounded-xl"
                    : "gap-3 px-3 py-2.5 rounded-xl",
                  location.pathname === '/super-admin'
                    ? "bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-md shadow-indigo-300"
                    : "text-slate-800 hover:bg-indigo-50 hover:text-indigo-900"
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
