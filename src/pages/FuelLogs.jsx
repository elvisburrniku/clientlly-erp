import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Fuel, Search, DollarSign, TrendingUp } from "lucide-react";
import moment from "moment";

const FUEL_TYPES = { diesel: "Diesel", gasoline: "Benzinë", electric: "Elektrik", hybrid: "Hibrid", lpg: "GPL" };

const emptyForm = () => ({
  vehicle_id: "", vehicle_plate: "", driver_id: "", driver_name: "", fuel_date: new Date().toISOString().split("T")[0],
  fuel_type: "diesel", liters: 0, price_per_liter: 0, total_cost: 0, odometer: 0, station: "", notes: "",
});

export default function FuelLogs() {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [l, v, d] = await Promise.all([
      base44.entities.FuelLog.list("-fuel_date", 500),
      base44.entities.Vehicle.list("-created_date", 500),
      base44.entities.Driver.list("-created_date", 500),
    ]);
    setLogs(l); setVehicles(v); setDrivers(d); setLoading(false);
  };

  const updateTotalCost = (f) => {
    const total = (parseFloat(f.liters) || 0) * (parseFloat(f.price_per_liter) || 0);
    return { ...f, total_cost: Math.round(total * 100) / 100 };
  };

  const handleSave = async () => {
    if (!form.vehicle_id) { toast.error("Automjeti është i detyrueshëm"); return; }
    setSubmitting(true);
    try {
      const v = vehicles.find(x => x.id === form.vehicle_id);
      const d = drivers.find(x => x.id === form.driver_id);
      const data = { ...form, vehicle_plate: v?.plate_number || "", driver_name: d?.full_name || "" };
      if (editingId) { await base44.entities.FuelLog.update(editingId, data); toast.success("U përditësua"); }
      else { await base44.entities.FuelLog.create(data); toast.success("U shtua"); }
      if (form.odometer && form.vehicle_id) { await base44.entities.Vehicle.update(form.vehicle_id, { odometer: form.odometer }); }
      setDialogOpen(false); setForm(emptyForm()); setEditingId(null); loadData();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => { if (!window.confirm("Fshi?")) return; await base44.entities.FuelLog.delete(id); toast.success("U fshi"); loadData(); };

  const filtered = useMemo(() => {
    let r = logs;
    if (vehicleFilter && vehicleFilter !== "all") r = r.filter(l => l.vehicle_id === vehicleFilter);
    if (search) { const s = search.toLowerCase(); r = r.filter(l => (l.station || "").toLowerCase().includes(s) || (l.vehicle_plate || "").toLowerCase().includes(s)); }
    return r;
  }, [logs, vehicleFilter, search]);

  const totalLiters = useMemo(() => filtered.reduce((sum, l) => sum + Number(l.liters || 0), 0), [filtered]);
  const totalCost = useMemo(() => filtered.reduce((sum, l) => sum + Number(l.total_cost || 0), 0), [filtered]);
  const avgPerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;

  const consumptionByVehicle = useMemo(() => {
    const map = {};
    logs.forEach(l => {
      const key = l.vehicle_plate || l.vehicle_id;
      if (!map[key]) map[key] = { plate: l.vehicle_plate, liters: 0, cost: 0, count: 0 };
      map[key].liters += Number(l.liters || 0);
      map[key].cost += Number(l.total_cost || 0);
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.cost - a.cost);
  }, [logs]);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Regjistri i Karburantit</h1>
          <p className="text-sm text-muted-foreground mt-1">Ndjek konsumin e karburantit</p>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setEditingId(null); setDialogOpen(true); }} data-testid="button-add"><Plus className="w-4 h-4 mr-1" /> Shto Furnizim</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Fuel className="w-4 h-4" /> Total Litra</div>
          <div className="text-2xl font-bold mt-1" data-testid="text-total-liters">{totalLiters.toFixed(1)} L</div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><DollarSign className="w-4 h-4" /> Kosto Totale</div>
          <div className="text-2xl font-bold mt-1" data-testid="text-total-cost">€{totalCost.toFixed(2)}</div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="w-4 h-4" /> Çmimi Mesatar/L</div>
          <div className="text-2xl font-bold mt-1" data-testid="text-avg-price">€{avgPerLiter.toFixed(2)}</div>
        </div>
      </div>

      {consumptionByVehicle.length > 0 && (
        <div className="bg-card rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-3">Konsumi sipas Automjetit</h3>
          <div className="space-y-2">
            {consumptionByVehicle.slice(0, 5).map((v, i) => (
              <div key={i} className="flex items-center justify-between text-sm" data-testid={`stat-vehicle-${i}`}>
                <span className="font-medium">{v.plate}</span>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>{v.liters.toFixed(1)} L</span>
                  <span>€{v.cost.toFixed(2)}</span>
                  <span>{v.count} furnizime</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input data-testid="input-search" className="pl-9" placeholder="Kërko..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-vehicle-filter"><SelectValue placeholder="Të gjithë automjetet" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjithë</SelectItem>
            {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Data</th>
              <th className="text-left p-3 font-medium">Automjeti</th>
              <th className="text-left p-3 font-medium">Shoferi</th>
              <th className="text-left p-3 font-medium">Karburanti</th>
              <th className="text-right p-3 font-medium">Litra</th>
              <th className="text-right p-3 font-medium">€/L</th>
              <th className="text-right p-3 font-medium">Totali</th>
              <th className="text-right p-3 font-medium">Km</th>
              <th className="text-center p-3 font-medium">Veprime</th>
            </tr></thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} className="border-b hover:bg-muted/30" data-testid={`row-fuel-${l.id}`}>
                  <td className="p-3 text-muted-foreground">{l.fuel_date ? moment(l.fuel_date).format("DD/MM/YYYY") : "—"}</td>
                  <td className="p-3">{l.vehicle_plate || "—"}</td>
                  <td className="p-3">{l.driver_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{FUEL_TYPES[l.fuel_type] || l.fuel_type}</td>
                  <td className="p-3 text-right">{Number(l.liters || 0).toFixed(1)}</td>
                  <td className="p-3 text-right">€{Number(l.price_per_liter || 0).toFixed(2)}</td>
                  <td className="p-3 text-right font-medium">€{Number(l.total_cost || 0).toFixed(2)}</td>
                  <td className="p-3 text-right">{Number(l.odometer || 0).toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setForm(l); setEditingId(l.id); setDialogOpen(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(l.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9} className="text-center text-muted-foreground p-8">Nuk ka regjistrime</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Ndrysho" : "Furnizim i Ri"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Automjeti *</Label>
              <Select value={form.vehicle_id || ""} onValueChange={v => { const veh = vehicles.find(x => x.id === v); setForm({...form, vehicle_id: v, fuel_type: veh?.fuel_type || form.fuel_type}); }}>
                <SelectTrigger className="mt-1.5" data-testid="select-vehicle"><SelectValue placeholder="Zgjidh automjetin" /></SelectTrigger>
                <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.make} {v.model} ({v.plate_number})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shoferi</Label>
              <Select value={form.driver_id || ""} onValueChange={v => setForm({...form, driver_id: v})}>
                <SelectTrigger className="mt-1.5" data-testid="select-driver"><SelectValue placeholder="Zgjidh shoferin" /></SelectTrigger>
                <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Data</Label><Input data-testid="input-date" type="date" value={form.fuel_date || ""} onChange={e => setForm({...form, fuel_date: e.target.value})} className="mt-1.5" /></div>
              <div>
                <Label>Karburanti</Label>
                <Select value={form.fuel_type} onValueChange={v => setForm({...form, fuel_type: v})}>
                  <SelectTrigger className="mt-1.5" data-testid="select-fuel-type"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(FUEL_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Litra</Label><Input data-testid="input-liters" type="number" step="0.1" value={form.liters} onChange={e => { const f = {...form, liters: parseFloat(e.target.value) || 0}; setForm(updateTotalCost(f)); }} className="mt-1.5" /></div>
              <div><Label>€ / Litër</Label><Input data-testid="input-price" type="number" step="0.01" value={form.price_per_liter} onChange={e => { const f = {...form, price_per_liter: parseFloat(e.target.value) || 0}; setForm(updateTotalCost(f)); }} className="mt-1.5" /></div>
              <div><Label>Totali (€)</Label><Input data-testid="input-total" type="number" value={form.total_cost} readOnly className="mt-1.5 bg-muted/50" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Kilometrazhi</Label><Input data-testid="input-odometer" type="number" value={form.odometer} onChange={e => setForm({...form, odometer: parseFloat(e.target.value) || 0})} className="mt-1.5" /></div>
              <div><Label>Stacioni</Label><Input data-testid="input-station" value={form.station || ""} onChange={e => setForm({...form, station: e.target.value})} className="mt-1.5" /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave} disabled={submitting} data-testid="button-save">{submitting ? "Duke ruajtur..." : editingId ? "Përditëso" : "Ruaj"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
