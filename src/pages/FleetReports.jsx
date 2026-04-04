import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { Car, DollarSign, Fuel, Wrench, AlertTriangle, TrendingUp, Calendar } from "lucide-react";
import moment from "moment";

export default function FleetReports() {
  const [vehicles, setVehicles] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [insurance, setInsurance] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [v, m, f, i, r, res] = await Promise.all([
        base44.entities.Vehicle.list("-created_date", 500),
        base44.entities.VehicleMaintenance.list("-service_date", 1000),
        base44.entities.FuelLog.list("-fuel_date", 1000),
        base44.entities.VehicleInsurance.list("-created_date", 500),
        base44.entities.VehicleRegistration.list("-created_date", 500),
        base44.entities.VehicleReservation.list("-created_date", 500),
      ]);
      setVehicles(v); setMaintenance(m); setFuelLogs(f); setInsurance(i); setRegistrations(r); setReservations(res);
      setLoading(false);
    };
    load();
  }, []);

  const totalMaintenanceCost = useMemo(() => maintenance.reduce((sum, m) => sum + Number(m.cost || 0), 0), [maintenance]);
  const totalFuelCost = useMemo(() => fuelLogs.reduce((sum, l) => sum + Number(l.total_cost || 0), 0), [fuelLogs]);
  const totalFuelLiters = useMemo(() => fuelLogs.reduce((sum, l) => sum + Number(l.liters || 0), 0), [fuelLogs]);
  const totalInsuranceCost = useMemo(() => insurance.reduce((sum, i) => sum + Number(i.premium || 0), 0), [insurance]);

  const costByVehicle = useMemo(() => {
    const map = {};
    vehicles.forEach(v => { map[v.id] = { plate: v.plate_number, make: v.make, model: v.model, maintenance: 0, fuel: 0, insurance: 0 }; });
    maintenance.forEach(m => { if (map[m.vehicle_id]) map[m.vehicle_id].maintenance += Number(m.cost || 0); });
    fuelLogs.forEach(f => { if (map[f.vehicle_id]) map[f.vehicle_id].fuel += Number(f.total_cost || 0); });
    insurance.forEach(i => { if (map[i.vehicle_id]) map[i.vehicle_id].insurance += Number(i.premium || 0); });
    return Object.values(map).map(v => ({ ...v, total: v.maintenance + v.fuel + v.insurance })).sort((a, b) => b.total - a.total);
  }, [vehicles, maintenance, fuelLogs, insurance]);

  const fuelByMonth = useMemo(() => {
    const map = {};
    fuelLogs.forEach(l => {
      const month = moment(l.fuel_date).format("YYYY-MM");
      if (!map[month]) map[month] = { month, liters: 0, cost: 0 };
      map[month].liters += Number(l.liters || 0);
      map[month].cost += Number(l.total_cost || 0);
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  }, [fuelLogs]);

  const expiringDocs = useMemo(() => {
    const soon = moment().add(30, "days");
    const getPlate = (vid) => { const v = vehicles.find(x => x.id === vid); return v ? v.plate_number : vid; };
    const items = [];
    insurance.forEach(i => { if (i.end_date && moment(i.end_date).isBefore(soon)) items.push({ type: "Sigurim", plate: getPlate(i.vehicle_id), date: i.end_date, expired: moment(i.end_date).isBefore(moment()) }); });
    registrations.forEach(r => { if (r.expiry_date && moment(r.expiry_date).isBefore(soon)) items.push({ type: "Regjistrim", plate: getPlate(r.vehicle_id), date: r.expiry_date, expired: moment(r.expiry_date).isBefore(moment()) }); });
    return items.sort((a, b) => moment(a.date).diff(moment(b.date)));
  }, [insurance, registrations, vehicles]);

  const vehicleUsage = useMemo(() => {
    const map = {};
    vehicles.forEach(v => { map[v.id] = { plate: v.plate_number, trips: 0, totalKm: 0 }; });
    reservations.filter(r => r.status === "returned").forEach(r => {
      if (map[r.vehicle_id]) {
        map[r.vehicle_id].trips++;
        const km = Number(r.return_odometer || 0) - Number(r.pickup_odometer || 0);
        if (km > 0) map[r.vehicle_id].totalKm += km;
      }
    });
    return Object.values(map).filter(v => v.trips > 0).sort((a, b) => b.trips - a.trips);
  }, [vehicles, reservations]);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Raportet e Flotës</h1>
        <p className="text-sm text-muted-foreground mt-1">Analitika dhe raporte për flotën e automjeteve</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Car className="w-4 h-4" /> Automjete</div>
          <div className="text-2xl font-bold mt-1" data-testid="text-total-vehicles">{vehicles.length}</div>
          <div className="text-xs text-muted-foreground mt-1">{vehicles.filter(v => v.status === "available").length} të disponueshme</div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Wrench className="w-4 h-4" /> Kosto Mirëmbajtjes</div>
          <div className="text-2xl font-bold mt-1" data-testid="text-maintenance-cost">€{totalMaintenanceCost.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-1">{maintenance.length} regjistrime</div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Fuel className="w-4 h-4" /> Kosto Karburantit</div>
          <div className="text-2xl font-bold mt-1" data-testid="text-fuel-cost">€{totalFuelCost.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-1">{totalFuelLiters.toFixed(0)} litra</div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><DollarSign className="w-4 h-4" /> Kosto Totale</div>
          <div className="text-2xl font-bold mt-1 text-primary" data-testid="text-total-cost">€{(totalMaintenanceCost + totalFuelCost + totalInsuranceCost).toFixed(2)}</div>
        </div>
      </div>

      {expiringDocs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-3"><AlertTriangle className="w-4 h-4" /> Dokumente Ligjore - Alarme</div>
          <div className="space-y-2">
            {expiringDocs.map((d, i) => (
              <div key={i} className={cn("flex items-center justify-between text-sm p-2 rounded", d.expired ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800")} data-testid={`alert-doc-${i}`}>
                <span>{d.type}: <strong>{d.plate}</strong></span>
                <span>{d.expired ? "SKADUAR" : "Skadon"}: {moment(d.date).format("DD/MM/YYYY")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-4">Kosto sipas Automjetit</h3>
          <div className="space-y-3">
            {costByVehicle.slice(0, 10).map((v, i) => {
              const maxCost = costByVehicle[0]?.total || 1;
              return (
                <div key={i} data-testid={`cost-vehicle-${i}`}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{v.plate} - {v.make} {v.model}</span>
                    <span className="font-semibold">€{v.total.toFixed(2)}</span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                    <div className="bg-blue-500 rounded-l" style={{ width: `${(v.fuel / maxCost) * 100}%` }} title={`Karburant: €${v.fuel.toFixed(2)}`} />
                    <div className="bg-amber-500" style={{ width: `${(v.maintenance / maxCost) * 100}%` }} title={`Mirëmbajtje: €${v.maintenance.toFixed(2)}`} />
                    <div className="bg-green-500 rounded-r" style={{ width: `${(v.insurance / maxCost) * 100}%` }} title={`Sigurim: €${v.insurance.toFixed(2)}`} />
                  </div>
                  <div className="flex gap-4 text-[10px] text-muted-foreground mt-0.5">
                    <span>Karburant: €{v.fuel.toFixed(0)}</span>
                    <span>Mirëmbajtje: €{v.maintenance.toFixed(0)}</span>
                    <span>Sigurim: €{v.insurance.toFixed(0)}</span>
                  </div>
                </div>
              );
            })}
            {costByVehicle.length === 0 && <div className="text-center text-muted-foreground text-sm p-4">Nuk ka të dhëna</div>}
          </div>
        </div>

        <div className="bg-card rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-4">Konsumi Mujor i Karburantit</h3>
          <div className="space-y-2">
            {fuelByMonth.map((m, i) => {
              const maxCost = Math.max(...fuelByMonth.map(x => x.cost), 1);
              return (
                <div key={i} className="flex items-center gap-3" data-testid={`fuel-month-${i}`}>
                  <span className="text-xs text-muted-foreground w-16 shrink-0">{moment(m.month, "YYYY-MM").format("MMM YY")}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(m.cost / maxCost) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium w-20 text-right">€{m.cost.toFixed(0)} / {m.liters.toFixed(0)}L</span>
                </div>
              );
            })}
            {fuelByMonth.length === 0 && <div className="text-center text-muted-foreground text-sm p-4">Nuk ka të dhëna</div>}
          </div>
        </div>
      </div>

      {vehicleUsage.length > 0 && (
        <div className="bg-card rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-4">Përdorimi i Automjeteve</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b">
                <th className="text-left p-2 font-medium">Automjeti</th>
                <th className="text-right p-2 font-medium">Udhëtime</th>
                <th className="text-right p-2 font-medium">Km Totale</th>
                <th className="text-right p-2 font-medium">Km Mesatare/Udhëtim</th>
              </tr></thead>
              <tbody>
                {vehicleUsage.map((v, i) => (
                  <tr key={i} className="border-b" data-testid={`usage-vehicle-${i}`}>
                    <td className="p-2 font-medium">{v.plate}</td>
                    <td className="p-2 text-right">{v.trips}</td>
                    <td className="p-2 text-right">{v.totalKm.toLocaleString()} km</td>
                    <td className="p-2 text-right">{v.trips > 0 ? (v.totalKm / v.trips).toFixed(0) : 0} km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
