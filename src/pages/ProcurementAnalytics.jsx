import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3, TrendingUp, Clock, Package, Star, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function ProcurementAnalytics() {
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("supplier");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [po, inv, prod, sup, mv] = await Promise.all([
      base44.entities.PurchaseOrder.list("-created_date", 500),
      base44.entities.Inventory.list("-created_date", 1000),
      base44.entities.Product.list("name", 500),
      base44.entities.Supplier.list("name", 200),
      base44.entities.StockMovement.list("-movement_date", 1000),
    ]);
    setOrders(po);
    setInventory(inv);
    setProducts(prod);
    setSuppliers(sup);
    setMovements(mv);
    setLoading(false);
  };

  const getSupplierPerformance = () => {
    const supplierMap = {};
    orders.forEach(po => {
      if (!po.supplier_id) return;
      if (!supplierMap[po.supplier_id]) {
        supplierMap[po.supplier_id] = {
          name: po.supplier_name,
          totalOrders: 0, receivedOrders: 0, totalValue: 0,
          deliveryDays: [], onTimeCount: 0, lateCount: 0,
        };
      }
      const s = supplierMap[po.supplier_id];
      s.totalOrders++;
      s.totalValue += po.total || 0;
      if (po.status === "received" || po.status === "closed") {
        s.receivedOrders++;
        if (po.expected_date && po.received_date) {
          const expected = moment(po.expected_date);
          const received = moment(po.received_date);
          const days = received.diff(expected, "days");
          s.deliveryDays.push(days);
          if (days <= 0) s.onTimeCount++;
          else s.lateCount++;
        }
      }
    });

    return Object.values(supplierMap).map(s => ({
      ...s,
      avgDeliveryDays: s.deliveryDays.length > 0 ? (s.deliveryDays.reduce((a, b) => a + b, 0) / s.deliveryDays.length).toFixed(1) : "—",
      onTimeRate: s.receivedOrders > 0 ? ((s.onTimeCount / s.receivedOrders) * 100).toFixed(0) : "—",
      fulfillmentRate: s.totalOrders > 0 ? ((s.receivedOrders / s.totalOrders) * 100).toFixed(0) : "0",
    })).sort((a, b) => b.totalValue - a.totalValue);
  };

  const getStockAging = () => {
    return inventory.map(item => {
      const lastMovement = movements
        .filter(m => m.product_id === item.product_id && m.type === "in")
        .sort((a, b) => new Date(b.movement_date || b.created_at) - new Date(a.movement_date || a.created_at))[0];
      
      const lastInDate = lastMovement ? moment(lastMovement.movement_date || lastMovement.created_at) : moment(item.created_at);
      const ageDays = moment().diff(lastInDate, "days");
      const product = products.find(p => p.id === item.product_id);
      const unitCost = item.unit_cost || product?.cost_price || product?.price || 0;

      return {
        product_name: item.product_name,
        quantity: item.quantity || 0,
        unit_cost: unitCost,
        value: (item.quantity || 0) * unitCost,
        age_days: ageDays,
        last_in_date: lastInDate.format("DD MMM YY"),
        category: ageDays <= 30 ? "0-30" : ageDays <= 60 ? "31-60" : ageDays <= 90 ? "61-90" : "90+",
        warehouse_name: item.warehouse_name || "—",
      };
    }).sort((a, b) => b.age_days - a.age_days);
  };

  const getABCAnalysis = () => {
    const items = inventory.map(item => {
      const product = products.find(p => p.id === item.product_id);
      const unitCost = item.unit_cost || product?.cost_price || product?.price || 0;
      return {
        product_name: item.product_name,
        quantity: item.quantity || 0,
        unit_cost: unitCost,
        value: (item.quantity || 0) * unitCost,
        category: product?.category || "Pa Kategori",
      };
    }).sort((a, b) => b.value - a.value);

    const totalValue = items.reduce((s, i) => s + i.value, 0);
    let cumValue = 0;
    return items.map(item => {
      cumValue += item.value;
      const cumPct = totalValue > 0 ? (cumValue / totalValue * 100) : 0;
      let abcClass;
      if (cumPct <= 80) abcClass = "A";
      else if (cumPct <= 95) abcClass = "B";
      else abcClass = "C";
      return { ...item, cumPct, abcClass };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const supplierPerf = getSupplierPerformance();
  const stockAging = getStockAging();
  const abcAnalysis = getABCAnalysis();

  const agingBuckets = {
    "0-30": stockAging.filter(i => i.category === "0-30"),
    "31-60": stockAging.filter(i => i.category === "31-60"),
    "61-90": stockAging.filter(i => i.category === "61-90"),
    "90+": stockAging.filter(i => i.category === "90+"),
  };

  const abcSummary = {
    A: abcAnalysis.filter(i => i.abcClass === "A"),
    B: abcAnalysis.filter(i => i.abcClass === "B"),
    C: abcAnalysis.filter(i => i.abcClass === "C"),
  };

  const tabs = [
    { id: "supplier", label: "Performanca Furnitorëve", icon: Star },
    { id: "aging", label: "Mosha e Stokut", icon: Clock },
    { id: "abc", label: "Analiza ABC", icon: BarChart3 },
  ];

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Analitika</p>
        <h1 className="text-3xl font-bold tracking-tight">Analitika e Prokurimit</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Porosi Totale</p>
          <p className="text-2xl font-bold mt-1" data-testid="text-total-orders">{orders.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vlera Totale PO</p>
          <p className="text-2xl font-bold mt-1">€{orders.reduce((s, o) => s + (o.total || 0), 0).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Furnitorë Aktivë</p>
          <p className="text-2xl font-bold mt-1">{suppliers.filter(s => s.is_active !== false).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Stok i Vjetër (90+)</p>
          <p className={cn("text-2xl font-bold mt-1", agingBuckets["90+"].length > 0 ? "text-destructive" : "text-emerald-600")}>{agingBuckets["90+"].length}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white rounded-2xl border border-border/60 shadow-sm p-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all whitespace-nowrap",
              activeTab === tab.id ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
            )}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "supplier" && (
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <p className="font-semibold text-sm">Performanca e Furnitorëve</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Furnitori</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Porosi</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Vlera</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Marrë</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Mesatarja Dorëzimit</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Në Kohë %</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Përmbushje %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {supplierPerf.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Nuk ka të dhëna</td></tr>
                ) : (
                  supplierPerf.map((s, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold">{s.name}</td>
                      <td className="px-6 py-4 text-sm text-right">{s.totalOrders}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium">€{s.totalValue.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-right">{s.receivedOrders}</td>
                      <td className="px-6 py-4 text-sm text-right">{s.avgDeliveryDays} ditë</td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
                          s.onTimeRate === "—" ? "bg-muted text-muted-foreground" :
                          parseInt(s.onTimeRate) >= 80 ? "bg-emerald-100 text-emerald-700" :
                          parseInt(s.onTimeRate) >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        )}>
                          {s.onTimeRate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right">{s.fulfillmentRate}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "aging" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(agingBuckets).map(([bucket, items]) => (
              <div key={bucket} className={cn("rounded-2xl border shadow-sm p-5",
                bucket === "90+" ? "border-red-200 bg-red-50" :
                bucket === "61-90" ? "border-amber-200 bg-amber-50" :
                bucket === "31-60" ? "border-yellow-200 bg-yellow-50" : "border-emerald-200 bg-emerald-50"
              )}>
                <p className="text-xs font-semibold uppercase tracking-widest">{bucket} ditë</p>
                <p className="text-2xl font-bold mt-1">{items.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">€{items.reduce((s, i) => s + i.value, 0).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <p className="font-semibold text-sm">Detajet e Moshës së Stokut</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Produkti</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Magazina</th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Sasia</th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Vlera</th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Ditë</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Hyrja e Fundit</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Kategoria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stockAging.slice(0, 50).map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium">{item.product_name}</td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">{item.warehouse_name}</td>
                      <td className="px-6 py-3 text-sm text-right">{item.quantity}</td>
                      <td className="px-6 py-3 text-sm text-right">€{item.value.toFixed(2)}</td>
                      <td className="px-6 py-3 text-sm text-right font-semibold">{item.age_days}</td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">{item.last_in_date}</td>
                      <td className="px-6 py-3">
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
                          item.category === "90+" ? "bg-red-100 text-red-700" :
                          item.category === "61-90" ? "bg-amber-100 text-amber-700" :
                          item.category === "31-60" ? "bg-yellow-100 text-yellow-700" : "bg-emerald-100 text-emerald-700"
                        )}>{item.category} ditë</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "abc" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(abcSummary).map(([cls, items]) => {
              const totalVal = items.reduce((s, i) => s + i.value, 0);
              const colors = { A: "border-emerald-200 bg-emerald-50", B: "border-blue-200 bg-blue-50", C: "border-slate-200 bg-slate-50" };
              const descs = { A: "Vlera e lartë - 80% e vlerës", B: "Vlera mesatare - 15% e vlerës", C: "Vlera e ulët - 5% e vlerës" };
              return (
                <div key={cls} className={cn("rounded-2xl border shadow-sm p-5", colors[cls])}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">Klasa {cls}</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{items.length} artikuj</p>
                  <p className="text-sm font-semibold mt-0.5">€{totalVal.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{descs[cls]}</p>
                </div>
              );
            })}
          </div>
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <p className="font-semibold text-sm">Klasifikimi ABC i Produkteve</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Nr.</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Produkti</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Kategoria</th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Sasia</th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Vlera</th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Kumulative %</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Klasa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {abcAnalysis.slice(0, 50).map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                      <td className="px-6 py-3 text-sm font-medium">{item.product_name}</td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">{item.category}</td>
                      <td className="px-6 py-3 text-sm text-right">{item.quantity}</td>
                      <td className="px-6 py-3 text-sm text-right font-medium">€{item.value.toFixed(2)}</td>
                      <td className="px-6 py-3 text-sm text-right">{item.cumPct.toFixed(1)}%</td>
                      <td className="px-6 py-3">
                        <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full",
                          item.abcClass === "A" ? "bg-emerald-100 text-emerald-700" :
                          item.abcClass === "B" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                        )}>{item.abcClass}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
