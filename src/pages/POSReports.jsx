import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3, Calendar, Package, CreditCard, TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function POSReports() {
  const [orders, setOrders] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(moment().startOf("month").format("YYYY-MM-DD"));
  const [dateTo, setDateTo] = useState(moment().format("YYYY-MM-DD"));
  const [activeTab, setActiveTab] = useState("daily");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [o, s] = await Promise.all([
        base44.entities.PosOrder.list("-created_date", 1000),
        base44.entities.PosSession.list("-created_date", 200),
      ]);
      setOrders(o);
      setSessions(s);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const d = moment(o.created_at);
      if (dateFrom && d.isBefore(dateFrom, "day")) return false;
      if (dateTo && d.isAfter(dateTo, "day")) return false;
      return o.status === "completed";
    });
  }, [orders, dateFrom, dateTo]);

  const dailySummary = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const day = moment(o.created_at).format("YYYY-MM-DD");
      if (!map[day]) map[day] = { date: day, orders: 0, total: 0, tax: 0 };
      map[day].orders++;
      map[day].total += parseFloat(o.total) || 0;
      map[day].tax += parseFloat(o.tax_amount) || 0;
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredOrders]);

  const productSummary = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      (o.items || []).forEach(it => {
        const key = it.name || "Pa emër";
        if (!map[key]) map[key] = { name: key, quantity: 0, total: 0 };
        map[key].quantity += it.quantity || 0;
        map[key].total += (it.line_total || (it.price * it.quantity)) || 0;
      });
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredOrders]);

  const paymentSummary = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      (o.payments || []).forEach(p => {
        const method = p.method || "cash";
        if (!map[method]) map[method] = { method, count: 0, total: 0 };
        map[method].count++;
        map[method].total += parseFloat(p.amount) || 0;
      });
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredOrders]);

  const totalRevenue = filteredOrders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
  const totalTax = filteredOrders.reduce((s, o) => s + (parseFloat(o.tax_amount) || 0), 0);
  const totalOrders = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const maxDailyTotal = dailySummary.length > 0 ? Math.max(...dailySummary.map(d => d.total)) : 1;
  const maxProductTotal = productSummary.length > 0 ? Math.max(...productSummary.map(p => p.total)) : 1;
  const maxPaymentTotal = paymentSummary.length > 0 ? Math.max(...paymentSummary.map(p => p.total)) : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">POS</p>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-pos-reports-title">Raportet POS</h1>
        </div>
        <div className="flex items-center gap-3">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" data-testid="input-date-from" />
          <span className="text-muted-foreground">—</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" data-testid="input-date-to" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Shitjet Totale</p>
          <p className="text-2xl font-bold mt-1 text-primary" data-testid="text-total-revenue">€{totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">TVSH Totale</p>
          <p className="text-2xl font-bold mt-1">€{totalTax.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Porosi</p>
          <p className="text-2xl font-bold mt-1" data-testid="text-total-orders">{totalOrders}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mesatarja</p>
          <p className="text-2xl font-bold mt-1">€{avgOrderValue.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex gap-2 bg-muted rounded-xl p-1 w-fit">
        {[
          { key: "daily", label: "Ditore", icon: Calendar },
          { key: "product", label: "Sipas Produktit", icon: Package },
          { key: "payment", label: "Sipas Pagesës", icon: CreditCard },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn("flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all",
              activeTab === tab.key ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            data-testid={`button-tab-${tab.key}`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "daily" && (
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <p className="font-semibold text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> Përmbledhje Ditore ({dailySummary.length} ditë)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Data</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Porosi</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Shitjet</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">TVSH</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5 w-48"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dailySummary.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">Nuk ka të dhëna</td></tr>
                ) : (
                  dailySummary.map(day => (
                    <tr key={day.date} className="hover:bg-muted/20 transition-colors" data-testid={`daily-row-${day.date}`}>
                      <td className="px-6 py-4 text-sm font-semibold">{moment(day.date).format("DD MMM YYYY")}</td>
                      <td className="px-6 py-4 text-sm">{day.orders}</td>
                      <td className="px-6 py-4 text-sm font-bold text-primary">€{day.total.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">€{day.tax.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(day.total / maxDailyTotal * 100).toFixed(0)}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "product" && (
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <p className="font-semibold text-sm flex items-center gap-2"><Package className="w-4 h-4" /> Shitjet sipas Produktit ({productSummary.length})</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Produkti</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Sasia</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Totali</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5 w-48"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productSummary.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-sm text-muted-foreground">Nuk ka të dhëna</td></tr>
                ) : (
                  productSummary.map((prod, idx) => (
                    <tr key={prod.name} className="hover:bg-muted/20 transition-colors" data-testid={`product-row-${idx}`}>
                      <td className="px-6 py-4 text-sm font-semibold">{prod.name}</td>
                      <td className="px-6 py-4 text-sm">{prod.quantity}</td>
                      <td className="px-6 py-4 text-sm font-bold text-primary">€{prod.total.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(prod.total / maxProductTotal * 100).toFixed(0)}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "payment" && (
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <p className="font-semibold text-sm flex items-center gap-2"><CreditCard className="w-4 h-4" /> Shitjet sipas Mënyrës së Pagesës ({paymentSummary.length})</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Mënyra</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Transaksione</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Totali</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5 w-48"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paymentSummary.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-sm text-muted-foreground">Nuk ka të dhëna</td></tr>
                ) : (
                  paymentSummary.map((pm, idx) => (
                    <tr key={pm.method} className="hover:bg-muted/20 transition-colors" data-testid={`payment-row-${idx}`}>
                      <td className="px-6 py-4 text-sm font-semibold capitalize">{pm.method.replace("_", " ")}</td>
                      <td className="px-6 py-4 text-sm">{pm.count}</td>
                      <td className="px-6 py-4 text-sm font-bold text-primary">€{pm.total.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(pm.total / maxPaymentTotal * 100).toFixed(0)}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
