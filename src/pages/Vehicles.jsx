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
import { Plus, Trash2, Edit2, Car, Shield, FileText, Search, AlertTriangle } from "lucide-react";
import moment from "moment";

const V_STATUS = { available: "I Disponueshëm", in_use: "Në Përdorim", maintenance: "Mirëmbajtje", retired: "I Tërhequr" };
const V_STATUS_COLORS = { available: "bg-green-100 text-green-800", in_use: "bg-blue-100 text-blue-800", maintenance: "bg-amber-100 text-amber-800", retired: "bg-gray-100 text-gray-800" };
const FUEL_TYPES = { diesel: "Diesel", gasoline: "Benzinë", electric: "Elektrik", hybrid: "Hibrid", lpg: "GPL" };

const emptyVehicle = () => ({ make: "", model: "", year: new Date().getFullYear(), plate_number: "", vin: "", color: "", fuel_type: "diesel", odometer: 0, status: "available", purchase_date: "", purchase_price: 0, notes: "" });
const emptyInsurance = () => ({ vehicle_id: "", policy_number: "", provider: "", coverage_type: "full", start_date: "", end_date: "", premium: 0, status: "active", notes: "" });
const emptyRegistration = () => ({ vehicle_id: "", registration_number: "", issue_date: "", expiry_date: "", issuing_authority: "", status: "active", notes: "" });

export default function Vehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [insurance, setInsurance] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vDialog, setVDialog] = useState(false);
  const [iDialog, setIDialog] = useState(false);
  const [rDialog, setRDialog] = useState(false);
  const [vForm, setVForm] = useState(emptyVehicle());
  const [iForm, setIForm] = useState(emptyInsurance());
  const [rForm, setRForm] = useState(emptyRegistration());
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("vehicles");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [v, i, r] = await Promise.all([
      base44.entities.Vehicle.list("-created_date", 500),
      base44.entities.VehicleInsurance.list("-created_date", 500),
      base44.entities.VehicleRegistration.list("-created_date", 500),
    ]);
    setVehicles(v); setInsurance(i); setRegistrations(r); setLoading(false);
  };

  const handleSaveVehicle = async () => {
    if (!vForm.plate_number) { toast.error("Targa është e detyrueshme"); return; }
    setSubmitting(true);
    try {
      if (editingId) { await base44.entities.Vehicle.update(editingId, vForm); toast.success("Automjeti u përditësua"); }
      else { await base44.entities.Vehicle.create(vForm); toast.success("Automjeti u shtua"); }
      setVDialog(false); setVForm(emptyVehicle()); setEditingId(null); loadData();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleSaveInsurance = async () => {
    if (!iForm.vehicle_id || !iForm.policy_number) { toast.error("Automjeti dhe nr. poliçës janë të detyrueshme"); return; }
    setSubmitting(true);
    try {
      if (editingId) { await base44.entities.VehicleInsurance.update(editingId, iForm); toast.success("Sigurimi u përditësua"); }
      else { await base44.entities.VehicleInsurance.create(iForm); toast.success("Sigurimi u shtua"); }
      setIDialog(false); setIForm(emptyInsurance()); setEditingId(null); loadData();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleSaveRegistration = async () => {
    if (!rForm.vehicle_id || !rForm.registration_number) { toast.error("Automjeti dhe nr. regjistrimit janë të detyrueshme"); return; }
    setSubmitting(true);
    try {
      if (editingId) { await base44.entities.VehicleRegistration.update(editingId, rForm); toast.success("Regjistrimi u përditësua"); }
      else { await base44.entities.VehicleRegistration.create(rForm); toast.success("Regjistrimi u shtua"); }
      setRDialog(false); setRForm(emptyRegistration()); setEditingId(null); loadData();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleDeleteVehicle = async (id) => { if (!window.confirm("Fshi?")) return; await base44.entities.Vehicle.delete(id); toast.success("U fshi"); loadData(); };
  const handleDeleteInsurance = async (id) => { if (!window.confirm("Fshi?")) return; await base44.entities.VehicleInsurance.delete(id); toast.success("U fshi"); loadData(); };
  const handleDeleteRegistration = async (id) => { if (!window.confirm("Fshi?")) return; await base44.entities.VehicleRegistration.delete(id); toast.success("U fshi"); loadData(); };

  const getVehicleLabel = (id) => { const v = vehicles.find(x => x.id === id); return v ? `${v.make} ${v.model} (${v.plate_number})` : id; };

  const expiringDocs = useMemo(() => {
    const soon = moment().add(30, "days");
    const expIns = insurance.filter(i => i.end_date && moment(i.end_date).isBefore(soon));
    const expReg = registrations.filter(r => r.expiry_date && moment(r.expiry_date).isBefore(soon));
    return [...expIns.map(i => ({ type: "Sigurim", vehicle_id: i.vehicle_id, date: i.end_date, id: i.id })),
            ...expReg.map(r => ({ type: "Regjistrim", vehicle_id: r.vehicle_id, date: r.expiry_date, id: r.id }))];
  }, [insurance, registrations]);

  const filtered = useMemo(() => {
    if (!search) return vehicles;
    const s = search.toLowerCase();
    return vehicles.filter(v => `${v.make} ${v.model} ${v.plate_number}`.toLowerCase().includes(s));
  }, [vehicles, search]);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Automjetet</h1>
          <p className="text-sm text-muted-foreground mt-1">Menaxho flotën e automjeteve</p>
        </div>
        <Button onClick={() => { setVForm(emptyVehicle()); setEditingId(null); setVDialog(true); }} data-testid="button-add-vehicle"><Plus className="w-4 h-4 mr-1" /> Automjet i Ri</Button>
      </div>

      {expiringDocs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-2"><AlertTriangle className="w-4 h-4" /> Dokumente që skadojnë së shpejti</div>
          <div className="space-y-1">
            {expiringDocs.map(d => (
              <div key={d.id} className="text-xs text-amber-700" data-testid={`alert-expiry-${d.id}`}>
                {d.type}: {getVehicleLabel(d.vehicle_id)} — skadon {moment(d.date).format("DD/MM/YYYY")}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          <Button variant={tab === "vehicles" ? "default" : "outline"} size="sm" onClick={() => setTab("vehicles")} data-testid="button-tab-vehicles"><Car className="w-4 h-4 mr-1" /> Automjetet</Button>
          <Button variant={tab === "insurance" ? "default" : "outline"} size="sm" onClick={() => setTab("insurance")} data-testid="button-tab-insurance"><Shield className="w-4 h-4 mr-1" /> Sigurimet</Button>
          <Button variant={tab === "registration" ? "default" : "outline"} size="sm" onClick={() => setTab("registration")} data-testid="button-tab-registration"><FileText className="w-4 h-4 mr-1" /> Regjistrimet</Button>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input data-testid="input-search" className="pl-9" placeholder="Kërko..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {tab === "vehicles" && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Automjeti</th>
                <th className="text-left p-3 font-medium">Targa</th>
                <th className="text-left p-3 font-medium">Karburant</th>
                <th className="text-right p-3 font-medium">Kilometrazh</th>
                <th className="text-center p-3 font-medium">Statusi</th>
                <th className="text-center p-3 font-medium">Veprime</th>
              </tr></thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} className="border-b hover:bg-muted/30" data-testid={`row-vehicle-${v.id}`}>
                    <td className="p-3 font-medium">{v.make} {v.model} {v.year ? `(${v.year})` : ""}</td>
                    <td className="p-3">{v.plate_number}</td>
                    <td className="p-3 text-muted-foreground">{FUEL_TYPES[v.fuel_type] || v.fuel_type}</td>
                    <td className="p-3 text-right">{Number(v.odometer || 0).toLocaleString()} km</td>
                    <td className="p-3 text-center"><span className={cn("px-2 py-0.5 rounded-full text-xs", V_STATUS_COLORS[v.status])}>{V_STATUS[v.status] || v.status}</span></td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setVForm(v); setEditingId(v.id); setVDialog(true); }} data-testid={`button-edit-${v.id}`}><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteVehicle(v.id)} data-testid={`button-delete-${v.id}`}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="text-center text-muted-foreground p-8">Nuk ka automjete</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "insurance" && (
        <div className="space-y-3">
          <Button variant="outline" size="sm" onClick={() => { setIForm(emptyInsurance()); setEditingId(null); setIDialog(true); }} data-testid="button-add-insurance"><Plus className="w-4 h-4 mr-1" /> Sigurim i Ri</Button>
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Automjeti</th>
                  <th className="text-left p-3 font-medium">Nr. Poliçës</th>
                  <th className="text-left p-3 font-medium">Siguruesi</th>
                  <th className="text-left p-3 font-medium">Periudha</th>
                  <th className="text-right p-3 font-medium">Primi</th>
                  <th className="text-center p-3 font-medium">Veprime</th>
                </tr></thead>
                <tbody>
                  {insurance.map(i => (
                    <tr key={i.id} className="border-b hover:bg-muted/30" data-testid={`row-insurance-${i.id}`}>
                      <td className="p-3">{getVehicleLabel(i.vehicle_id)}</td>
                      <td className="p-3 font-medium">{i.policy_number}</td>
                      <td className="p-3">{i.provider}</td>
                      <td className="p-3 text-muted-foreground text-xs">{i.start_date ? moment(i.start_date).format("DD/MM/YY") : "—"} — {i.end_date ? moment(i.end_date).format("DD/MM/YY") : "—"}</td>
                      <td className="p-3 text-right">€{Number(i.premium || 0).toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setIForm(i); setEditingId(i.id); setIDialog(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteInsurance(i.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {insurance.length === 0 && <tr><td colSpan={6} className="text-center text-muted-foreground p-8">Nuk ka sigurime</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "registration" && (
        <div className="space-y-3">
          <Button variant="outline" size="sm" onClick={() => { setRForm(emptyRegistration()); setEditingId(null); setRDialog(true); }} data-testid="button-add-registration"><Plus className="w-4 h-4 mr-1" /> Regjistrim i Ri</Button>
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Automjeti</th>
                  <th className="text-left p-3 font-medium">Nr. Regjistrimit</th>
                  <th className="text-left p-3 font-medium">Autoriteti</th>
                  <th className="text-left p-3 font-medium">Skadon</th>
                  <th className="text-center p-3 font-medium">Veprime</th>
                </tr></thead>
                <tbody>
                  {registrations.map(r => (
                    <tr key={r.id} className="border-b hover:bg-muted/30" data-testid={`row-registration-${r.id}`}>
                      <td className="p-3">{getVehicleLabel(r.vehicle_id)}</td>
                      <td className="p-3 font-medium">{r.registration_number}</td>
                      <td className="p-3">{r.issuing_authority || "—"}</td>
                      <td className="p-3">
                        {r.expiry_date ? (
                          <span className={cn("text-sm", moment(r.expiry_date).isBefore(moment()) ? "text-red-600 font-medium" : moment(r.expiry_date).isBefore(moment().add(30, "days")) ? "text-amber-600" : "")}>
                            {moment(r.expiry_date).format("DD/MM/YYYY")}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setRForm(r); setEditingId(r.id); setRDialog(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteRegistration(r.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {registrations.length === 0 && <tr><td colSpan={5} className="text-center text-muted-foreground p-8">Nuk ka regjistra</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Dialog */}
      <Dialog open={vDialog} onOpenChange={setVDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Ndrysho Automjetin" : "Automjet i Ri"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Marka</Label><Input data-testid="input-make" value={vForm.make} onChange={e => setVForm({...vForm, make: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Modeli</Label><Input data-testid="input-model" value={vForm.model} onChange={e => setVForm({...vForm, model: e.target.value})} className="mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Viti</Label><Input data-testid="input-year" type="number" value={vForm.year} onChange={e => setVForm({...vForm, year: parseInt(e.target.value) || 0})} className="mt-1.5" /></div>
              <div><Label>Targa *</Label><Input data-testid="input-plate" value={vForm.plate_number} onChange={e => setVForm({...vForm, plate_number: e.target.value})} className="mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>VIN</Label><Input data-testid="input-vin" value={vForm.vin || ""} onChange={e => setVForm({...vForm, vin: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Ngjyra</Label><Input data-testid="input-color" value={vForm.color || ""} onChange={e => setVForm({...vForm, color: e.target.value})} className="mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Karburanti</Label>
                <Select value={vForm.fuel_type} onValueChange={v => setVForm({...vForm, fuel_type: v})}>
                  <SelectTrigger className="mt-1.5" data-testid="select-fuel"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(FUEL_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Statusi</Label>
                <Select value={vForm.status} onValueChange={v => setVForm({...vForm, status: v})}>
                  <SelectTrigger className="mt-1.5" data-testid="select-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(V_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Kilometrazhi</Label><Input data-testid="input-odometer" type="number" value={vForm.odometer} onChange={e => setVForm({...vForm, odometer: parseFloat(e.target.value) || 0})} className="mt-1.5" /></div>
            <div><Label>Shënime</Label><Textarea data-testid="input-notes" value={vForm.notes || ""} onChange={e => setVForm({...vForm, notes: e.target.value})} className="mt-1.5" rows={2} /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveVehicle} disabled={submitting} data-testid="button-save">{submitting ? "Duke ruajtur..." : editingId ? "Përditëso" : "Ruaj"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insurance Dialog */}
      <Dialog open={iDialog} onOpenChange={setIDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Ndrysho Sigurimin" : "Sigurim i Ri"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Automjeti *</Label>
              <Select value={iForm.vehicle_id || ""} onValueChange={v => setIForm({...iForm, vehicle_id: v})}>
                <SelectTrigger className="mt-1.5" data-testid="select-insurance-vehicle"><SelectValue placeholder="Zgjidh automjetin" /></SelectTrigger>
                <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.make} {v.model} ({v.plate_number})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nr. Poliçës *</Label><Input data-testid="input-policy" value={iForm.policy_number} onChange={e => setIForm({...iForm, policy_number: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Siguruesi</Label><Input data-testid="input-provider" value={iForm.provider || ""} onChange={e => setIForm({...iForm, provider: e.target.value})} className="mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Fillimi</Label><Input data-testid="input-ins-start" type="date" value={iForm.start_date || ""} onChange={e => setIForm({...iForm, start_date: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Mbarimi</Label><Input data-testid="input-ins-end" type="date" value={iForm.end_date || ""} onChange={e => setIForm({...iForm, end_date: e.target.value})} className="mt-1.5" /></div>
            </div>
            <div><Label>Primi (€)</Label><Input data-testid="input-premium" type="number" value={iForm.premium} onChange={e => setIForm({...iForm, premium: parseFloat(e.target.value) || 0})} className="mt-1.5" /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveInsurance} disabled={submitting} data-testid="button-save-insurance">{submitting ? "Duke ruajtur..." : editingId ? "Përditëso" : "Ruaj"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registration Dialog */}
      <Dialog open={rDialog} onOpenChange={setRDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Ndrysho Regjistrimin" : "Regjistrim i Ri"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Automjeti *</Label>
              <Select value={rForm.vehicle_id || ""} onValueChange={v => setRForm({...rForm, vehicle_id: v})}>
                <SelectTrigger className="mt-1.5" data-testid="select-reg-vehicle"><SelectValue placeholder="Zgjidh automjetin" /></SelectTrigger>
                <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.make} {v.model} ({v.plate_number})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Nr. Regjistrimit *</Label><Input data-testid="input-reg-number" value={rForm.registration_number} onChange={e => setRForm({...rForm, registration_number: e.target.value})} className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Data e Lëshimit</Label><Input data-testid="input-reg-issue" type="date" value={rForm.issue_date || ""} onChange={e => setRForm({...rForm, issue_date: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Data e Skadimit</Label><Input data-testid="input-reg-expiry" type="date" value={rForm.expiry_date || ""} onChange={e => setRForm({...rForm, expiry_date: e.target.value})} className="mt-1.5" /></div>
            </div>
            <div><Label>Autoriteti Lëshues</Label><Input data-testid="input-reg-authority" value={rForm.issuing_authority || ""} onChange={e => setRForm({...rForm, issuing_authority: e.target.value})} className="mt-1.5" /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveRegistration} disabled={submitting} data-testid="button-save-registration">{submitting ? "Duke ruajtur..." : editingId ? "Përditëso" : "Ruaj"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
