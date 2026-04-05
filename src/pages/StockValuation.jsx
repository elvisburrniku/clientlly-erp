import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DollarSign, Package, Warehouse, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StockValuation() {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [inv, prod, wh] = await Promise.all([
      base44.entities.Inventory.list("-created_date", 1000),
      base44.entities.Product.list("name", 500),
      base44.entities.Warehouse.list("name", 100),
    ]);
    setInventory(inv);
    setProducts(prod);
    setWarehouses(wh);
    setLoading(false);
  };

  const getProductCost = (item) => {
    const product = products.find(p => p.id === item.product_id);
    return item.unit_cost || product?.cost_price || product?.price || 0;
  };

  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity || 0) * getProductCost(item), 0);
  const totalItems = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const valueByWarehouse = warehouses.map(wh => {
    const whInventory = inventory.filter(i => i.warehouse_id === wh.id);
    const value = whInventory.reduce((sum, item) => sum + (item.quantity || 0) * getProductCost(item), 0);
    const qty = whInventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
    return { ...wh, value, qty, items: whInventory.length };
  }).filter(wh => wh.items > 0 || wh.value > 0);

  const noWarehouseItems = inventory.filter(i => !i.warehouse_id);
  if (noWarehouseItems.length > 0) {
    const value = noWarehouseItems.reduce((sum, item) => sum + (item.quantity || 0) * getProductCost(item), 0);
    const qty = noWarehouseItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    valueByWarehouse.push({ id: "none", name: "Pa Magazinë", value, qty, items: noWarehouseItems.length });
  }

  const categoryMap = {};
  inventory.forEach(item => {
    const product = products.find(p => p.id === item.product_id);
    const category = product?.category || "Pa Kategori";
    if (!categoryMap[category]) categoryMap[category] = { value: 0, qty: 0, count: 0 };
    categoryMap[category].value += (item.quantity || 0) * getProductCost(item);
    categoryMap[category].qty += item.quantity || 0;
    categoryMap[category].count++;
  });
  const valueByCategory = Object.entries(categoryMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.value - a.value);

  const topProducts = inventory
    .map(item => ({
      name: item.product_name,
      quantity: item.quantity || 0,
      cost: getProductCost(item),
      value: (item.quantity || 0) * getProductCost(item),
      warehouse_name: item.warehouse_name || "—",
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Analitika</p>
        <h1 className="text-3xl font-bold tracking-tight">Vlerësimi i Stokut</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-primary to-primary/80 text-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 opacity-80" />
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Vlera Totale</p>
          </div>
          <p className="text-3xl font-bold mt-2" data-testid="text-total-value">€{totalValue.toFixed(2)}</p>
          <p className="text-xs opacity-60 mt-1">Metoda: Kosto Mesatare</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-teal-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-teal-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Njësi në Stok</p></div>
            <p className="text-2xl font-bold" data-testid="text-total-units">{totalItems.toFixed(0)}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-violet-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><BarChart3 className="w-4 h-4 text-violet-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Artikuj Unik</p></div>
            <p className="text-2xl font-bold" data-testid="text-unique-items">{inventory.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <p className="font-semibold text-sm flex items-center gap-2">
              <Warehouse className="w-4 h-4" /> Vlera sipas Magazinës
            </p>
          </div>
          <div className="divide-y divide-border">
            {valueByWarehouse.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">Nuk ka të dhëna</div>
            ) : (
              valueByWarehouse.map(wh => {
                const pct = totalValue > 0 ? (wh.value / totalValue * 100) : 0;
                return (
                  <div key={wh.id} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold">{wh.name}</p>
                      <p className="text-sm font-bold">€{wh.value.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">{pct.toFixed(1)}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{wh.qty} njësi · {wh.items} artikuj</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <p className="font-semibold text-sm">Vlera sipas Kategorisë</p>
          </div>
          <div className="divide-y divide-border">
            {valueByCategory.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">Nuk ka të dhëna</div>
            ) : (
              valueByCategory.map(cat => {
                const pct = totalValue > 0 ? (cat.value / totalValue * 100) : 0;
                return (
                  <div key={cat.name} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold">{cat.name}</p>
                      <p className="text-sm font-bold">€{cat.value.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">{pct.toFixed(1)}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{cat.count} artikuj · {cat.qty} njësi</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-semibold text-sm">Top 20 Produktet sipas Vlerës</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Nr.</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Produkti</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Magazina</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Sasia</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Kosto/Njësi</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Vlera Totale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topProducts.map((p, idx) => (
                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                  <td className="px-6 py-3 text-sm font-semibold">{p.name}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{p.warehouse_name}</td>
                  <td className="px-6 py-3 text-sm text-right">{p.quantity}</td>
                  <td className="px-6 py-3 text-sm text-right">€{p.cost.toFixed(2)}</td>
                  <td className="px-6 py-3 text-sm font-bold text-right">€{p.value.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
