import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, FileText, Users, Truck, Wallet, BarChart3, Settings, 
  ChevronLeft, ChevronRight, DollarSign, Package, Bell
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Faturat", icon: FileText, path: "/invoices" },
  { label: "Produktet", icon: Package, path: "/products" },
  { label: "Kujtesat", icon: Bell, path: "/reminders" },
  { label: "Klientët", icon: Users, path: "/clients" },
  { label: "Furnitorët", icon: Truck, path: "/suppliers" },
  { label: "Arka", icon: Wallet, path: "/cashbox" },
  { label: "Shpenzimet", icon: DollarSign, path: "/expenses" },
  { label: "Dorëzimi i Parave", icon: DollarSign, path: "/cash-handover" },
  { label: "Raportet", icon: BarChart3, path: "/reports" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col text-[hsl(230,40%,90%)] transition-all duration-300 ease-in-out z-30",
        "bg-gradient-to-b from-slate-900 to-slate-800",
        collapsed ? "w-[68px]" : "w-[250px]"
      )}
    >
      {/* Logo */}
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

      {/* Navigation */}
      <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-3 mb-3">Menuja</p>
        )}
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
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
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-white/10 text-white/30 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}