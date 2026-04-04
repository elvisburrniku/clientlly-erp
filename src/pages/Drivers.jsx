import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, User, Car, Calendar, Search, AlertTriangle, ArrowRightLeft } from "lucide-react";
import moment from "moment";

const D_STATUS = { active: "Aktiv", inactive: "Joaktiv", on_leave: "Me Leje" };
const D_STATUS_COLORS = { active: "bg-green-100 text-green-800", inactive: "bg-gray-100 text-gray-800", on_leave: "bg-amber-100 text-amber-800" };
const RES_STATUS = { reserved: "Rezervuar", picked_up: "Marrë", returned: "Kthyer", cancelled: "Anuluar" };
const RES_STATUS_COLORS = { reserved: "bg-blue-100 text-blue-800", picked_up: "bg-amber-100 text-amber-800", returned: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800" };

const emptyDriver = () => ({ full_name: "", email: "", phone: "", license_number: "", license_type: "B", license_expiry: "", status: "active", assigned_vehicle_id: "", assigned_vehicle_plate: "", notes: "" });
const emptyReservation = () => ({ vehicle_id: "", vehicle_plate: "", driver_id: "", driver_name: "", purpose: "", start_date: moment().format("YYYY-MM-DDTHH:mm"), end_date: moment().add(1, "day").format("YYYY-MM-DDTHH:mm"), pickup_odometer: "", return_odometer: "", status: "reserved", notes: "" });

export default function Drivers() {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dDialog, setDDialog] = useState(false);
  const [rDialog, setRDialog] = useState(false);
  const [dForm, setDForm] = useState(emptyDriver());
  const [rForm, setRForm] = useState(emptyReservation());
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("drivers");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [d, v, r] = await Promise.all([
      base44.entities.Driver.list("-created_date", 500),
      base44.entities.Vehicle.list("-created_date", 500),
      base44.entities.VehicleReservation.list("-start_date", 500),
    ]);
    setDrivers(d); setVehicles(v); setReservations(r); setLoading(false);
  };

  const handleSaveDriver = async () => {
    if (!dForm.full_name) { toast.error("Emri është i detyrueshëm"); return; }
    setSubmitting(true);
    try {
      if (editingId) { await base44.entities.Driver.update(editingId, dForm); toast.success("Shoferi u përditësua"); }
      else { await base44.entities.Driver.create(dForm); toast.success("Shoferi u shtua"); }
      setDDialog(false); setDForm(emptyDriver()); setEditingId(null); loadData();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleSaveReservation = async () => {
    if (!rForm.vehicle_id || !rForm.driver_id) { toast.error("Automjeti dhe shoferi janë të detyrueshëm"); return; }
    setSubmitting(true);
    try {
      const v = vehicles.find(x => x.id === rForm.vehicle_id);
      const d = drivers.find(x => x.id === rForm.driver_id);
      const data = { ...rForm, vehicle_plate: v?.plate_number || "", driver_name: d?.full_name || "" };
      if (editingId) { await base44.entities.VehicleReservation.update(editingId, data); toast.success("Rezervimi u përditësua"); }
      else { await base44.entities.VehicleReservation.create(data); toast.success("Rezervimi u krijua"); }
      setRDialog(false); setRForm(emptyReservation()); setEditingId(null); loadData();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handlePickup = async (res) => {
    const odometer = prompt("Kilometrazhi aktual:");
    if (odometer === null) return;
    await base44.entities.VehicleReservation.update(res.id, { status: "picked_up", pickup_odometer: parseFloat(odometer) || 0 });
    if (res.vehicle_id) await base44.entities.Vehicle.update(res.vehicle_id, { status: "in_use" });
    toast.success("Automjeti u dërgua"); loadData();
  };

  const handleReturn = async (res) => {
    const odometer = prompt("Kilometrazhi i kthimit:");
    if (odometer === null) return;
    await base44.entities.VehicleReservation.update(res.id, { status: "returned", return_odometer: parseFloat(odometer) || 0 });
    if (res.vehicle_id) await base44.entities.Vehicle.update(res.vehicle_id, { status: "available", odometer: parseFloat(odometer) || 0 });
    toast.success("Automjeti u kthye"); loadData();
  };

  const handleDeleteDriver = async (id) => { if (!window.confirm("Fshi?")) return; await base44.entities.Driver.delete(id); toast.success("U fshi"); loadData(); };
  const handleDeleteReservation = async (id) => { if (!window.confirm("Fshi?")) return; await base44.entities.VehicleReservation.delete(id); toast.success("U fshi"); loadData(); };

  const filteredDrivers = useMemo(() => {
    if (!search) return drivers;
    const s = search.toLowerCase();
    return drivers.filter(d => d.full_name.toLowerCase().includes(s) || (d.license_number || "").toLowerCase().includes(s));
  }, [drivers, search]);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Shoferët & Rezervimet</h1>
          <p className="text-sm text-muted-foreground mt-1">Menaxho shoferët dhe rezervimet e automjeteve</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setRForm(emptyReservation()); setEditingId(null); setRDialog(true); }} data-testid="button-add-reservation"><ArrowRightLeft className="w-4 h-4 mr-1" /> Rezervim i Ri</Button>
          <Button onClick={() => { setDForm(emptyDriver()); setEditingId(null); setDDialog(true); }} data-testid="button-add-driver"><Plus className="w-4 h-4 mr-1" /> Shofer i Ri</Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          <Button variant={tab === "drivers" ? "default" : "outline"} size="sm" onClick={() => setTab("drivers")} data-testid="button-tab-drivers"><User className="w-4 h-4 mr-1" /> Shoferët</Button>
          <Button variant={tab === "reservations" ? "default" : "outline"} size="sm" onClick={() => setTab("reservations")} data-testid="button-tab-reservations"><Calendar className="w-4 h-4 mr-1" /> Rezervimet</Button>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input data-testid="input-search" className="pl-9" placeholder="Kërko..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {tab === "drivers" && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Emri</th>
                <th className="text-left p-3 font-medium">Telefon</th>
                <th className="text-left p-3 font-medium">Patenta</th>
                <th className="text-left p-3 font-medium">Skadon</th>
                <th className="text-left p-3 font-medium">Automjeti</th>
                <th className="text-center p-3 font-medium">Statusi</th>
                <th className="text-center p-3 font-medium">Veprime</th>
              </tr></thead>
              <tbody>
                {filteredDrivers.map(d => (
                  <tr key={d.id} className="border-b hover:bg-muted/30" data-testid={`row-driver-${d.id}`}>
                    <td className="p-3 font-medium">{d.full_name}</td>
                    <td className="p-3">{d.phone || "—"}</td>
                    <td className="p-3">{d.license_number || "—"} {d.license_type ? `(${d.license_type})` : ""}</td>
                    <td className="p-3">
                      {d.license_expiry ? (
                        <span className={cn(moment(d.license_expiry).isBefore(moment()) ? "text-red-600 font-medium" : moment(d.license_expiry).isBefore(moment().add(30, "days")) ? "text-amber-600" : "")}>
                          {moment(d.license_expiry).format("DD/MM/YYYY")}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="p-3">{d.assigned_vehicle_plate || "—"}</td>
                    <td className="p-3 text-center"><span className={cn("px-2 py-0.5 rounded-full text-xs", D_STATUS_COLORS[d.status])}>{D_STATUS[d.status] || d.status}</span></td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setDForm(d); setEditingId(d.id); setDDialog(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteDriver(d.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDrivers.length === 0 && <tr><td colSpan={7} className="text-center text-muted-foreground p-8">Nuk ka shoferë</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "reservations" && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Automjeti</th>
                <th className="text-left p-3 font-medium">Shoferi</th>
                <th className="text-left p-3 font-medium">Periudha</th>
                <th className="text-left p-3 font-medium">Qëllimi</th>
                <th className="text-center p-3 font-medium">Statusi</th>
                <th className="text-center p-3 font-medium">Veprime</th>
              </tr></thead>
              <tbody>
                {reservations.map(r => (
                  <tr key={r.id} className="border-b hover:bg-muted/30" data-testid={`row-reservation-${r.id}`}>
                    <td className="p-3">{r.vehicle_plate || "—"}</td>
                    <td className="p-3">{r.driver_name || "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {r.start_date ? moment(r.start_date).format("DD/MM/YY HH:mm") : "—"} — {r.end_date ? moment(r.end_date).format("DD/MM/YY HH:mm") : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground max-w-[200px] truncate">{r.purpose || "—"}</td>
                    <td className="p-3 text-center"><span className={cn("px-2 py-0.5 rounded-full text-xs", RES_STATUS_COLORS[r.status])}>{RES_STATUS[r.status] || r.status}</span></td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {r.status === "reserved" && <Button variant="outline" size="sm" onClick={() => handlePickup(r)} data-testid={`button-pickup-${r.id}`}>Dërgo</Button>}
                        {r.status === "picked_up" && <Button variant="outline" size="sm" onClick={() => handleReturn(r)} data-testid={`button-return-${r.id}`}>Kthe</Button>}
                        <Button variant="ghost" size="sm" onClick={() => { setRForm(r); setEditingId(r.id); setRDialog(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteReservation(r.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {reservations.length === 0 && <tr><td colSpan={6} className="text-center text-muted-foreground p-8">Nuk ka rezervime</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Driver Dialog */}
      <Dialog open={dDialog} onOpenChange={setDDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Ndrysho Shoferin" : "Shofer i Ri"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Emri i Plotë *</Label><Input data-testid="input-driver-name" value={dForm.full_name} onChange={e => setDForm({...dForm, full_name: e.target.value})} className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input data-testid="input-driver-email" value={dForm.email || ""} onChange={e => setDForm({...dForm, email: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Telefon</Label><Input data-testid="input-driver-phone" value={dForm.phone || ""} onChange={e => setDForm({...dForm, phone: e.target.value})} className="mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Nr. Patentës</Label><Input data-testid="input-license" value={dForm.license_number || ""} onChange={e => setDForm({...dForm, license_number: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Tipi</Label><Input data-testid="input-license-type" value={dForm.license_type || ""} onChange={e => setDForm({...dForm, license_type: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Skadon</Label><Input data-testid="input-license-expiry" type="date" value={dForm.license_expiry || ""} onChange={e => setDForm({...dForm, license_expiry: e.target.value})} className="mt-1.5" /></div>
            </div>
            <div>
              <Label>Automjeti i Caktuar</Label>
              <Select value={dForm.assigned_vehicle_id || ""} onValueChange={v => {
                const veh = vehicles.find(x => x.id === v);
                setDForm({...dForm, assigned_vehicle_id: v, assigned_vehicle_plate: veh?.plate_number || ""});
              }}>
                <SelectTrigger className="mt-1.5" data-testid="select-driver-vehicle"><SelectValue placeholder="Zgjidh automjetin" /></SelectTrigger>
                <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.make} {v.model} ({v.plate_number})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statusi</Label>
              <Select value={dForm.status} onValueChange={v => setDForm({...dForm, status: v})}>
                <SelectTrigger className="mt-1.5" data-testid="select-driver-status"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(D_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Shënime</Label><Textarea data-testid="input-driver-notes" value={dForm.notes || ""} onChange={e => setDForm({...dForm, notes: e.target.value})} className="mt-1.5" rows={2} /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveDriver} disabled={submitting} data-testid="button-save-driver">{submitting ? "Duke ruajtur..." : editingId ? "Përditëso" : "Ruaj"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reservation Dialog */}
      <Dialog open={rDialog} onOpenChange={setRDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Ndrysho Rezervimin" : "Rezervim i Ri"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Automjeti *</Label>
              <Select value={rForm.vehicle_id || ""} onValueChange={v => setRForm({...rForm, vehicle_id: v})}>
                <SelectTrigger className="mt-1.5" data-testid="select-res-vehicle"><SelectValue placeholder="Zgjidh automjetin" /></SelectTrigger>
                <SelectContent>{vehicles.filter(v => v.status === "available").map(v => <SelectItem key={v.id} value={v.id}>{v.make} {v.model} ({v.plate_number})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shoferi *</Label>
              <Select value={rForm.driver_id || ""} onValueChange={v => setRForm({...rForm, driver_id: v})}>
                <SelectTrigger className="mt-1.5" data-testid="select-res-driver"><SelectValue placeholder="Zgjidh shoferin" /></SelectTrigger>
                <SelectContent>{drivers.filter(d => d.status === "active").map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Fillimi</Label><Input data-testid="input-res-start" type="datetime-local" value={rForm.start_date ? moment(rForm.start_date).format("YYYY-MM-DDTHH:mm") : ""} onChange={e => setRForm({...rForm, start_date: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Mbarimi</Label><Input data-testid="input-res-end" type="datetime-local" value={rForm.end_date ? moment(rForm.end_date).format("YYYY-MM-DDTHH:mm") : ""} onChange={e => setRForm({...rForm, end_date: e.target.value})} className="mt-1.5" /></div>
            </div>
            <div><Label>Qëllimi</Label><Textarea data-testid="input-res-purpose" value={rForm.purpose || ""} onChange={e => setRForm({...rForm, purpose: e.target.value})} className="mt-1.5" rows={2} /></div>
            <div><Label>Shënime</Label><Textarea data-testid="input-res-notes" value={rForm.notes || ""} onChange={e => setRForm({...rForm, notes: e.target.value})} className="mt-1.5" rows={2} /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveReservation} disabled={submitting} data-testid="button-save-reservation">{submitting ? "Duke ruajtur..." : editingId ? "Përditëso" : "Ruaj"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
