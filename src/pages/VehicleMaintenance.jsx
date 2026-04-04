import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Wrench, Search, DollarSign, Calendar } from "lucide-react";
import moment from "moment";

const M_STATUS = { scheduled: "Planifikuar", in_progress: "Në Progres", completed: "Përfunduar" };
const M_STATUS_COLORS = { scheduled: "bg-blue-100 text-blue-800", in_progress: "bg-amber-100 text-amber-800", completed: "bg-green-100 text-green-800" };

const emptyForm = () => ({
  vehicle_id: "", vehicle_plate: "", maintenance_type: "", description: "",
  service_date: new Date().toISOString().split("T")[0], next_service_date: "",
  odometer_at_service: 0, cost: 0, provider: "", status: "completed", notes: "",
});

export default function VehicleMaintenance() {
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [m, v] = await Promise.all([
      base44.entities.VehicleMaintenance.list("-service_date", 500),
      base44.entities.Vehicle.list("-created_date", 500),
    ]);
    setRecords(m); setVehicles(v); setLoading(false);
  };

  const handleSave = async () => {
    if (!form.vehicle_id || !form.maintenance_type) { toast.error("Automjeti dhe lloji i mirëmbajtjes janë të detyrueshme"); return; }
    setSubmitting(true);
    try {
      const v = vehicles.find(x => x.id === form.vehicle_id);
      const data = { ...form, vehicle_plate: v?.plate_number || "" };
      if (editingId) { await base44.entities.VehicleMaintenance.update(editingId, data); toast.success("Mirëmbajtja u përditësua"); }
      else { await base44.entities.VehicleMaintenance.create(data); toast.success("Mirëmbajtja u shtua"); }
      setDialogOpen(false); setForm(emptyForm()); setEditingId(null); loadData();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => { if (!window.confirm("Fshi?")) return; await base44.entities.VehicleMaintenance.delete(id); toast.success("U fshi"); loadData(); };

  const filtered = useMemo(() => {
    let r = records;
    if (vehicleFilter) r = r.filter(m => m.vehicle_id === vehicleFilter);
    if (search) { const s = search.toLowerCase(); r = r.filter(m => (m.maintenance_type || "").toLowerCase().includes(s) || (m.provider || "").toLowerCase().includes(s)); }
    return r;
  }, [records, vehicleFilter, search]);

  const totalCost = useMemo(() => filtered.reduce((sum, m) => sum + Number(m.cost || 0), 0), [filtered]);

  const upcoming = useMemo(() => records.filter(m => m.next_service_date && moment(m.next_service_date).isBefore(moment().add(30, "days")) && moment(m.next_service_date).isAfter(moment())), [records]);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Mirëmbajtja e Automjeteve</h1>
          <p className="text-sm text-muted-foreground mt-1">Regjistro dhe planifiko mirëmbajtjen</p>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setEditingId(null); setDialogOpen(true); }} data-testid="button-add"><Plus className="w-4 h-4 mr-1" /> Shto Mirëmbajtje</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Wrench className="w-4 h-4" /> Total Regjistrime</div>
          <div className="text-2xl font-bold mt-1" data-testid="text-total-records">{records.length}</div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><DollarSign className="w-4 h-4" /> Kosto Totale</div>
          <div className="text-2xl font-bold mt-1" data-testid="text-total-cost">€{totalCost.toFixed(2)}</div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Calendar className="w-4 h-4" /> Të Planifikuara</div>
          <div className="text-2xl font-bold mt-1" data-testid="text-upcoming">{upcoming.length}</div>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-sm font-medium text-blue-800 mb-2">Mirëmbajtje të planifikuara (30 ditë):</div>
          {upcoming.map(m => (
            <div key={m.id} className="text-xs text-blue-700" data-testid={`alert-upcoming-${m.id}`}>
              {m.vehicle_plate} — {m.maintenance_type} — {moment(m.next_service_date).format("DD/MM/YYYY")}
            </div>
          ))}
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
              <th className="text-left p-3 font-medium">Automjeti</th>
              <th className="text-left p-3 font-medium">Lloji</th>
              <th className="text-left p-3 font-medium">Furnizuesi</th>
              <th className="text-left p-3 font-medium">Data</th>
              <th className="text-right p-3 font-medium">Kosto</th>
              <th className="text-right p-3 font-medium">Km</th>
              <th className="text-center p-3 font-medium">Statusi</th>
              <th className="text-center p-3 font-medium">Veprime</th>
            </tr></thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-b hover:bg-muted/30" data-testid={`row-maintenance-${m.id}`}>
                  <td className="p-3">{m.vehicle_plate || "—"}</td>
                  <td className="p-3 font-medium">{m.maintenance_type}</td>
                  <td className="p-3 text-muted-foreground">{m.provider || "—"}</td>
                  <td className="p-3 text-muted-foreground">{m.service_date ? moment(m.service_date).format("DD/MM/YYYY") : "—"}</td>
                  <td className="p-3 text-right">€{Number(m.cost || 0).toFixed(2)}</td>
                  <td className="p-3 text-right">{Number(m.odometer_at_service || 0).toLocaleString()}</td>
                  <td className="p-3 text-center"><span className={cn("px-2 py-0.5 rounded-full text-xs", M_STATUS_COLORS[m.status])}>{M_STATUS[m.status] || m.status}</span></td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setForm(m); setEditingId(m.id); setDialogOpen(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center text-muted-foreground p-8">Nuk ka regjistrime</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Ndrysho" : "Mirëmbajtje e Re"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Automjeti *</Label>
              <Select value={form.vehicle_id || ""} onValueChange={v => setForm({...form, vehicle_id: v})}>
                <SelectTrigger className="mt-1.5" data-testid="select-vehicle"><SelectValue placeholder="Zgjidh automjetin" /></SelectTrigger>
                <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.make} {v.model} ({v.plate_number})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Lloji i Mirëmbajtjes *</Label><Input data-testid="input-type" value={form.maintenance_type} onChange={e => setForm({...form, maintenance_type: e.target.value})} className="mt-1.5" placeholder="p.sh. Ndërrimi i vajit, Goma" /></div>
            <div><Label>Përshkrim</Label><Textarea data-testid="input-description" value={form.description || ""} onChange={e => setForm({...form, description: e.target.value})} className="mt-1.5" rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Data e Shërbimit</Label><Input data-testid="input-date" type="date" value={form.service_date || ""} onChange={e => setForm({...form, service_date: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Shërbimi i Ardhshëm</Label><Input data-testid="input-next-date" type="date" value={form.next_service_date || ""} onChange={e => setForm({...form, next_service_date: e.target.value})} className="mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Kosto (€)</Label><Input data-testid="input-cost" type="number" value={form.cost} onChange={e => setForm({...form, cost: parseFloat(e.target.value) || 0})} className="mt-1.5" /></div>
              <div><Label>Km në Shërbim</Label><Input data-testid="input-odometer" type="number" value={form.odometer_at_service} onChange={e => setForm({...form, odometer_at_service: parseFloat(e.target.value) || 0})} className="mt-1.5" /></div>
            </div>
            <div><Label>Furnizuesi</Label><Input data-testid="input-provider" value={form.provider || ""} onChange={e => setForm({...form, provider: e.target.value})} className="mt-1.5" /></div>
            <div>
              <Label>Statusi</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger className="mt-1.5" data-testid="select-status"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(M_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave} disabled={submitting} data-testid="button-save">{submitting ? "Duke ruajtur..." : editingId ? "Përditëso" : "Ruaj"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
