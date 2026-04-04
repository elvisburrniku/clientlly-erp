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
import { Plus, Trash2, Edit2, Package, TrendingDown, DollarSign, MapPin, Search } from "lucide-react";
import moment from "moment";

const STATUS_LABELS = { active: "Aktiv", in_repair: "Në Riparim", retired: "I Tërhequr", disposed: "I Asgjësuar" };
const STATUS_COLORS = { active: "bg-green-100 text-green-800", in_repair: "bg-amber-100 text-amber-800", retired: "bg-gray-100 text-gray-800", disposed: "bg-red-100 text-red-800" };

const emptyForm = () => ({
  name: "", asset_type_name: "", serial_number: "", purchase_date: new Date().toISOString().split("T")[0],
  purchase_price: 0, current_value: 0, depreciation_rate: 10, location: "", status: "active", assigned_to: "", notes: "",
});

const emptyTypeForm = () => ({ name: "", description: "", depreciation_rate: 10, depreciation_method: "straight_line", useful_life_years: 5 });

export default function Assets() {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [typeForm, setTypeForm] = useState(emptyTypeForm());
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("assets");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [a, t] = await Promise.all([
      base44.entities.Asset.list("-created_date", 500),
      base44.entities.AssetType.list("-created_date", 100),
    ]);
    setAssets(a); setAssetTypes(t); setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("Emri është i detyrueshëm"); return; }
    setSubmitting(true);
    try {
      if (editingId) {
        await base44.entities.Asset.update(editingId, form);
        toast.success("Aseti u përditësua");
      } else {
        await base44.entities.Asset.create(form);
        toast.success("Aseti u krijua");
      }
      setDialogOpen(false); setForm(emptyForm()); setEditingId(null); loadData();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleSaveType = async () => {
    if (!typeForm.name) { toast.error("Emri është i detyrueshëm"); return; }
    setSubmitting(true);
    try {
      await base44.entities.AssetType.create(typeForm);
      toast.success("Tipi u krijua");
      setTypeDialogOpen(false); setTypeForm(emptyTypeForm()); loadData();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Fshi këtë aset?")) return;
    await base44.entities.Asset.delete(id);
    toast.success("Aseti u fshi"); loadData();
  };

  const handleDeleteType = async (id) => {
    if (!window.confirm("Fshi këtë tip?")) return;
    await base44.entities.AssetType.delete(id);
    toast.success("Tipi u fshi"); loadData();
  };

  const filtered = useMemo(() => {
    if (!search) return assets;
    const s = search.toLowerCase();
    return assets.filter(a => (a.name || "").toLowerCase().includes(s) || (a.location || "").toLowerCase().includes(s) || (a.asset_type_name || "").toLowerCase().includes(s));
  }, [assets, search]);

  const totalValue = useMemo(() => assets.reduce((sum, a) => sum + Number(a.current_value || a.purchase_price || 0), 0), [assets]);
  const totalPurchase = useMemo(() => assets.reduce((sum, a) => sum + Number(a.purchase_price || 0), 0), [assets]);
  const totalDepreciation = totalPurchase - totalValue;

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Asetet</h1>
          <p className="text-sm text-muted-foreground mt-1">Menaxho asetet e kompanisë</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTypeDialogOpen(true)} data-testid="button-add-type"><Plus className="w-4 h-4 mr-1" /> Tip Aseti</Button>
          <Button onClick={() => { setForm(emptyForm()); setEditingId(null); setDialogOpen(true); }} data-testid="button-add-asset"><Plus className="w-4 h-4 mr-1" /> Aset i Ri</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Package className="w-4 h-4" /> Total Asete</div>
          <div className="text-2xl font-bold mt-1" data-testid="text-total-assets">{assets.length}</div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><DollarSign className="w-4 h-4" /> Vlera Aktuale</div>
          <div className="text-2xl font-bold mt-1" data-testid="text-total-value">€{totalValue.toFixed(2)}</div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingDown className="w-4 h-4" /> Amortizimi</div>
          <div className="text-2xl font-bold mt-1 text-red-600" data-testid="text-depreciation">€{totalDepreciation.toFixed(2)}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          <Button variant={tab === "assets" ? "default" : "outline"} size="sm" onClick={() => setTab("assets")} data-testid="button-tab-assets">Asetet</Button>
          <Button variant={tab === "types" ? "default" : "outline"} size="sm" onClick={() => setTab("types")} data-testid="button-tab-types">Tipet</Button>
        </div>
        {tab === "assets" && (
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input data-testid="input-search" className="pl-9" placeholder="Kërko asete..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        )}
      </div>

      {tab === "assets" && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Emri</th>
                <th className="text-left p-3 font-medium">Tipi</th>
                <th className="text-left p-3 font-medium">Vendndodhja</th>
                <th className="text-right p-3 font-medium">Vlera Blerjes</th>
                <th className="text-right p-3 font-medium">Vlera Aktuale</th>
                <th className="text-center p-3 font-medium">Statusi</th>
                <th className="text-center p-3 font-medium">Veprime</th>
              </tr></thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="border-b hover:bg-muted/30" data-testid={`row-asset-${a.id}`}>
                    <td className="p-3 font-medium">{a.name}</td>
                    <td className="p-3 text-muted-foreground">{a.asset_type_name || "—"}</td>
                    <td className="p-3 text-muted-foreground">{a.location || "—"}</td>
                    <td className="p-3 text-right">€{Number(a.purchase_price || 0).toFixed(2)}</td>
                    <td className="p-3 text-right">€{Number(a.current_value || 0).toFixed(2)}</td>
                    <td className="p-3 text-center"><span className={cn("px-2 py-0.5 rounded-full text-xs", STATUS_COLORS[a.status] || "bg-gray-100")}>{STATUS_LABELS[a.status] || a.status}</span></td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setForm(a); setEditingId(a.id); setDialogOpen(true); }} data-testid={`button-edit-${a.id}`}><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} data-testid={`button-delete-${a.id}`}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-muted-foreground p-8">Nuk ka asete</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "types" && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Emri</th>
                <th className="text-left p-3 font-medium">Përshkrim</th>
                <th className="text-right p-3 font-medium">Norma Amortizimit</th>
                <th className="text-right p-3 font-medium">Jeta e Dobishme (Vite)</th>
                <th className="text-center p-3 font-medium">Veprime</th>
              </tr></thead>
              <tbody>
                {assetTypes.map(t => (
                  <tr key={t.id} className="border-b hover:bg-muted/30" data-testid={`row-type-${t.id}`}>
                    <td className="p-3 font-medium">{t.name}</td>
                    <td className="p-3 text-muted-foreground">{t.description || "—"}</td>
                    <td className="p-3 text-right">{t.depreciation_rate}%</td>
                    <td className="p-3 text-right">{t.useful_life_years}</td>
                    <td className="p-3 text-center">
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteType(t.id)} data-testid={`button-delete-type-${t.id}`}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                    </td>
                  </tr>
                ))}
                {assetTypes.length === 0 && <tr><td colSpan={5} className="text-center text-muted-foreground p-8">Nuk ka tipe asetesh</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Ndrysho Asetin" : "Aset i Ri"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Emri *</Label><Input data-testid="input-name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1.5" /></div>
            <div>
              <Label>Tipi i Asetit</Label>
              <Select value={form.asset_type_name || ""} onValueChange={v => setForm({...form, asset_type_name: v})}>
                <SelectTrigger className="mt-1.5" data-testid="select-type"><SelectValue placeholder="Zgjidh tipin" /></SelectTrigger>
                <SelectContent>
                  {assetTypes.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Nr. Serial</Label><Input data-testid="input-serial" value={form.serial_number || ""} onChange={e => setForm({...form, serial_number: e.target.value})} className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Data e Blerjes</Label><Input data-testid="input-purchase-date" type="date" value={form.purchase_date || ""} onChange={e => setForm({...form, purchase_date: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Çmimi i Blerjes</Label><Input data-testid="input-purchase-price" type="number" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: parseFloat(e.target.value) || 0})} className="mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Vlera Aktuale</Label><Input data-testid="input-current-value" type="number" value={form.current_value} onChange={e => setForm({...form, current_value: parseFloat(e.target.value) || 0})} className="mt-1.5" /></div>
              <div><Label>Norma Amortizimit (%)</Label><Input data-testid="input-depreciation" type="number" value={form.depreciation_rate} onChange={e => setForm({...form, depreciation_rate: parseFloat(e.target.value) || 0})} className="mt-1.5" /></div>
            </div>
            <div><Label>Vendndodhja</Label><Input data-testid="input-location" value={form.location || ""} onChange={e => setForm({...form, location: e.target.value})} className="mt-1.5" /></div>
            <div>
              <Label>Statusi</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger className="mt-1.5" data-testid="select-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Caktuar Për</Label><Input data-testid="input-assigned" value={form.assigned_to || ""} onChange={e => setForm({...form, assigned_to: e.target.value})} className="mt-1.5" /></div>
            <div><Label>Shënime</Label><Textarea data-testid="input-notes" value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1.5" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={submitting} data-testid="button-save">{submitting ? "Duke ruajtur..." : editingId ? "Përditëso" : "Ruaj"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tip i Ri Aseti</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Emri *</Label><Input data-testid="input-type-name" value={typeForm.name} onChange={e => setTypeForm({...typeForm, name: e.target.value})} className="mt-1.5" /></div>
            <div><Label>Përshkrim</Label><Input data-testid="input-type-desc" value={typeForm.description || ""} onChange={e => setTypeForm({...typeForm, description: e.target.value})} className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Norma Amortizimit (%)</Label><Input data-testid="input-type-rate" type="number" value={typeForm.depreciation_rate} onChange={e => setTypeForm({...typeForm, depreciation_rate: parseFloat(e.target.value) || 0})} className="mt-1.5" /></div>
              <div><Label>Jeta e Dobishme (Vite)</Label><Input data-testid="input-type-life" type="number" value={typeForm.useful_life_years} onChange={e => setTypeForm({...typeForm, useful_life_years: parseInt(e.target.value) || 0})} className="mt-1.5" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveType} disabled={submitting} data-testid="button-save-type">{submitting ? "Duke ruajtur..." : "Ruaj"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
