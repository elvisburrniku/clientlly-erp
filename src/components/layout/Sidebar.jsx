import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, FileText, Users, Truck, Wallet, BarChart3, Settings, 
  ChevronLeft, ChevronRight, DollarSign
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Faturat", icon: FileText, path: "/invoices" },
  { label: "Klientët", icon: Users, path: "/clients" },
  { label: "Furnitorët", icon: Truck, path: "/suppliers" },
  { label: "Arka", icon: Wallet, path: "/cashbox" },
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
        "h-screen sticky top-0 flex flex-col bg-[hsl(222,47%,11%)] text-[hsl(213,31%,91%)] transition-all duration-300 ease-in-out z-30",
        collapsed ? "w-[68px]" : "w-[250px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">E</span>
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold tracking-tight whitespace-nowrap">
            ERP Finance
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-white shadow-lg shadow-primary/25"
                  : "text-[hsl(213,31%,75%)] hover:bg-white/8 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-white/10 text-[hsl(213,31%,55%)] hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}