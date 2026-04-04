import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Package, Bell, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StockAlerts() {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [inv, prod] = await Promise.all([
      base44.entities.Inventory.list("-created_date", 500),
      base44.entities.Product.list("name", 500),
    ]);
    setInventory(inv);
    setProducts(prod);
    setLoading(false);
  };

  const getAlerts = () => {
    const alerts = [];
    inventory.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      const reorderPoint = product?.reorder_point || item.min_quantity || 0;
      const reorderQty = product?.reorder_qty || 0;

      if (reorderPoint > 0 && item.quantity <= reorderPoint) {
        alerts.push({
          ...item,
          product,
          reorder_point: reorderPoint,
          reorder_qty: reorderQty,
          severity: item.quantity === 0 ? "critical" : item.quantity <= reorderPoint * 0.5 ? "high" : "medium",
          deficit: reorderPoint - item.quantity,
        });
      }
    });

    products.forEach(prod => {
      if (prod.reorder_point && prod.reorder_point > 0) {
        const invItem = inventory.find(i => i.product_id === prod.id);
        if (!invItem) {
          alerts.push({
            product_name: prod.name,
            quantity: 0,
            product: prod,
            reorder_point: prod.reorder_point,
            reorder_qty: prod.reorder_qty || 0,
            severity: "critical",
            deficit: prod.reorder_point,
            unit: prod.unit || "cope",
          });
        }
      }
    });

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2 };
      return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const alerts = getAlerts();
  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const highCount = alerts.filter(a => a.severity === "high").length;
  const mediumCount = alerts.filter(a => a.severity === "medium").length;

  const severityColors = {
    critical: "border-red-200 bg-red-50",
    high: "border-amber-200 bg-amber-50",
    medium: "border-yellow-200 bg-yellow-50",
  };
  const severityLabels = { critical: "Kritike", high: "E Lartë", medium: "Mesatare" };
  const severityBadge = {
    critical: "bg-red-100 text-red-700",
    high: "bg-amber-100 text-amber-700",
    medium: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Magazina</p>
        <h1 className="text-3xl font-bold tracking-tight">Alarmet e Stokut</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej Alarme</p>
          </div>
          <p className={cn("text-2xl font-bold mt-2", alerts.length > 0 ? "text-destructive" : "text-emerald-600")} data-testid="text-total-alerts">{alerts.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-600">Kritike</p>
          <p className="text-2xl font-bold mt-2 text-red-700" data-testid="text-critical-alerts">{criticalCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">E Lartë</p>
          <p className="text-2xl font-bold mt-2 text-amber-700" data-testid="text-high-alerts">{highCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-yellow-200 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Mesatare</p>
          <p className="text-2xl font-bold mt-2 text-yellow-700" data-testid="text-medium-alerts">{mediumCount}</p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-10 text-center">
          <Package className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="font-semibold text-emerald-800">Nuk ka alarme stoku</p>
          <p className="text-sm text-emerald-600 mt-1">Të gjitha produktet janë mbi pikën e riporositjes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, idx) => (
            <div key={idx} className={cn("rounded-2xl border p-5 flex items-center gap-4", severityColors[alert.severity])} data-testid={`alert-item-${idx}`}>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", alert.severity === "critical" ? "bg-red-200" : alert.severity === "high" ? "bg-amber-200" : "bg-yellow-200")}>
                {alert.severity === "critical" ? <AlertTriangle className="w-5 h-5 text-red-700" /> : <TrendingDown className="w-5 h-5 text-amber-700" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{alert.product_name}</p>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", severityBadge[alert.severity])}>
                    {severityLabels[alert.severity]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sasia aktuale: <span className="font-bold text-foreground">{alert.quantity} {alert.unit || "cope"}</span>
                  {" · "}Pika e riporositjes: <span className="font-bold">{alert.reorder_point}</span>
                  {alert.reorder_qty > 0 && <>{" · "}Sasia e riporositjes: <span className="font-bold">{alert.reorder_qty}</span></>}
                  {" · "}Deficit: <span className="font-bold text-destructive">{alert.deficit}</span>
                </p>
              </div>
              {alert.warehouse_name && (
                <span className="text-xs bg-white/80 px-2.5 py-1 rounded-full font-medium">{alert.warehouse_name}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
