import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Trash2, Edit2, MoreHorizontal, Warehouse, MapPin, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const emptyWarehouse = () => ({
  name: "",
  code: "",
  address: "",
  city: "",
  phone: "",
  manager_name: "",
  is_active: true,
  notes: "",
});

const emptyLocation = () => ({
  name: "",
  code: "",
  zone: "",
  aisle: "",
  rack: "",
  shelf: "",
  is_active: true,
});

export default function Warehouses() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editLoc, setEditLoc] = useState(null);
  const [form, setForm] = useState(emptyWarehouse());
  const [locForm, setLocForm] = useState(emptyLocation());
  const [submitting, setSubmitting] = useState(false);
  const [expandedWarehouse, setExpandedWarehouse] = useState(null);
  const [selectedWarehouseForLoc, setSelectedWarehouseForLoc] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [wh, locs] = await Promise.all([
      base44.entities.Warehouse.list("-created_date", 100),
      base44.entities.WarehouseLocation.list("-created_date", 500),
    ]);
    setWarehouses(wh);
    setLocations(locs);
    setLoading(false);
  };

  const handleSaveWarehouse = async () => {
    if (!form.name) { toast.error("Emri është i detyrueshëm"); return; }
    setSubmitting(true);
    if (editItem) {
      await base44.entities.Warehouse.update(editItem.id, form);
      toast.success("Magazina u përditësua");
    } else {
      await base44.entities.Warehouse.create({ ...form, tenant_id: tenantId });
      toast.success("Magazina u krijua");
    }
    setDialogOpen(false);
    setForm(emptyWarehouse());
    setEditItem(null);
    setSubmitting(false);
    loadData();
  };

  const handleDeleteWarehouse = async (wh) => {
    if (!window.confirm(`Fshi magazinën "${wh.name}"?`)) return;
    await base44.entities.Warehouse.delete(wh.id);
    toast.success("Magazina u fshi");
    loadData();
  };

  const openEditWarehouse = (wh) => {
    setForm({ name: wh.name, code: wh.code || "", address: wh.address || "", city: wh.city || "", phone: wh.phone || "", manager_name: wh.manager_name || "", is_active: wh.is_active !== false, notes: wh.notes || "" });
    setEditItem(wh);
    setDialogOpen(true);
  };

  const handleSaveLocation = async () => {
    if (!locForm.name || !selectedWarehouseForLoc) { toast.error("Emri dhe magazina janë të detyrueshme"); return; }
    setSubmitting(true);
    const data = { ...locForm, warehouse_id: selectedWarehouseForLoc.id, warehouse_name: selectedWarehouseForLoc.name, tenant_id: tenantId };
    if (editLoc) {
      await base44.entities.WarehouseLocation.update(editLoc.id, data);
      toast.success("Lokacioni u përditësua");
    } else {
      await base44.entities.WarehouseLocation.create(data);
      toast.success("Lokacioni u krijua");
    }
    setLocDialogOpen(false);
    setLocForm(emptyLocation());
    setEditLoc(null);
    setSubmitting(false);
    loadData();
  };

  const handleDeleteLocation = async (loc) => {
    if (!window.confirm(`Fshi lokacionin "${loc.name}"?`)) return;
    await base44.entities.WarehouseLocation.delete(loc.id);
    toast.success("Lokacioni u fshi");
    loadData();
  };

  const openAddLocation = (wh) => {
    setSelectedWarehouseForLoc(wh);
    setLocForm(emptyLocation());
    setEditLoc(null);
    setLocDialogOpen(true);
  };

  const openEditLocation = (loc, wh) => {
    setSelectedWarehouseForLoc(wh);
    setLocForm({ name: loc.name, code: loc.code || "", zone: loc.zone || "", aisle: loc.aisle || "", rack: loc.rack || "", shelf: loc.shelf || "", is_active: loc.is_active !== false });
    setEditLoc(loc);
    setLocDialogOpen(true);
  };

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
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxhimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Magazinat</h1>
        </div>
        <Button onClick={() => { setForm(emptyWarehouse()); setEditItem(null); setDialogOpen(true); }} className="gap-2 self-start sm:self-auto" data-testid="button-add-warehouse">
          <Plus className="w-4 h-4" /> Magazinë e Re
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-indigo-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><Warehouse className="w-4 h-4 text-indigo-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej Magazina</p></div>
            <p className="text-2xl font-bold" data-testid="text-total-warehouses">{warehouses.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-emerald-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-emerald-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Aktive</p></div>
            <p className="text-2xl font-bold text-emerald-600" data-testid="text-active-warehouses">{warehouses.filter(w => w.is_active !== false).length}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-amber-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><MapPin className="w-4 h-4 text-amber-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Lokacione</p></div>
            <p className="text-2xl font-bold" data-testid="text-total-locations">{locations.length}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {warehouses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <Warehouse className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Nuk ka magazina të regjistruara</p>
            </div>
          </div>
        ) : (
          warehouses.map((wh) => {
            const whLocations = locations.filter(l => l.warehouse_id === wh.id);
            const isExpanded = expandedWarehouse === wh.id;
            return (
              <div key={wh.id} className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden" data-testid={`card-warehouse-${wh.id}`}>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setExpandedWarehouse(isExpanded ? null : wh.id)}>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Warehouse className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{wh.name}</p>
                        {wh.code && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{wh.code}</span>}
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", wh.is_active !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                          {wh.is_active !== false ? "Aktiv" : "Joaktiv"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[wh.address, wh.city].filter(Boolean).join(", ") || "Pa adresë"}
                        {wh.manager_name && ` · Menaxheri: ${wh.manager_name}`}
                        {` · ${whLocations.length} lokacione`}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-4" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-4" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openAddLocation(wh)} className="gap-1 text-xs" data-testid={`button-add-location-${wh.id}`}>
                      <MapPin className="w-3 h-3" /> Lokacion
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7" data-testid={`button-menu-warehouse-${wh.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditWarehouse(wh)} data-testid={`button-edit-warehouse-${wh.id}`}>
                          <Edit2 className="w-4 h-4 mr-2" /> Modifiko
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteWarehouse(wh)} className="text-destructive focus:text-destructive" data-testid={`button-delete-warehouse-${wh.id}`}>
                          <Trash2 className="w-4 h-4 mr-2" /> Fshi
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {isExpanded && whLocations.length > 0 && (
                  <div className="border-t border-border">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/20">
                          <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-2.5">Lokacioni</th>
                          <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-2.5">Kodi</th>
                          <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-2.5">Zona</th>
                          <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-2.5">Korridori/Rafti/Rafti</th>
                          <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-2.5">Veprime</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {whLocations.map(loc => (
                          <tr key={loc.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-6 py-3 text-sm font-medium">{loc.name}</td>
                            <td className="px-6 py-3 text-sm text-muted-foreground">{loc.code || "—"}</td>
                            <td className="px-6 py-3 text-sm text-muted-foreground">{loc.zone || "—"}</td>
                            <td className="px-6 py-3 text-sm text-muted-foreground">{[loc.aisle, loc.rack, loc.shelf].filter(Boolean).join(" / ") || "—"}</td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex gap-1 justify-end">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditLocation(loc, wh)}>
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDeleteLocation(loc)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {isExpanded && whLocations.length === 0 && (
                  <div className="border-t border-border px-6 py-8 text-center">
                    <p className="text-sm text-muted-foreground">Nuk ka lokacione. Shtoni një lokacion të ri.</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Modifiko Magazinën" : "Magazinë e Re"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Emri *</Label>
                <Input placeholder="Magazina Qendrore" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1.5" data-testid="input-warehouse-name" />
              </div>
              <div>
                <Label>Kodi</Label>
                <Input placeholder="MQ-01" value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="mt-1.5" data-testid="input-warehouse-code" />
              </div>
            </div>
            <div>
              <Label>Adresa</Label>
              <Input placeholder="Adresa e magazinës" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Qyteti</Label>
                <Input placeholder="Tiranë" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="mt-1.5" />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input placeholder="+355..." value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Menaxheri</Label>
              <Input placeholder="Emri i menaxherit" value={form.manager_name} onChange={e => setForm({...form, manager_name: e.target.value})} className="mt-1.5" />
            </div>
            <div>
              <Label>Shënime</Label>
              <Textarea placeholder="Shënime opsionale..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1.5" rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="wh_active" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-4 h-4 rounded" />
              <Label htmlFor="wh_active" className="!mt-0 cursor-pointer text-sm">Aktiv</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSaveWarehouse} disabled={submitting} data-testid="button-save-warehouse">
              {submitting ? "Duke ruajtur..." : editItem ? "Përditëso" : "Krijo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={locDialogOpen} onOpenChange={setLocDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editLoc ? "Modifiko Lokacionin" : "Lokacion i Ri"} — {selectedWarehouseForLoc?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Emri *</Label>
                <Input placeholder="Zona A-1" value={locForm.name} onChange={e => setLocForm({...locForm, name: e.target.value})} className="mt-1.5" data-testid="input-location-name" />
              </div>
              <div>
                <Label>Kodi</Label>
                <Input placeholder="A1" value={locForm.code} onChange={e => setLocForm({...locForm, code: e.target.value})} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Zona</Label>
              <Input placeholder="Zona A" value={locForm.zone} onChange={e => setLocForm({...locForm, zone: e.target.value})} className="mt-1.5" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Korridori</Label>
                <Input placeholder="1" value={locForm.aisle} onChange={e => setLocForm({...locForm, aisle: e.target.value})} className="mt-1.5" />
              </div>
              <div>
                <Label>Rafti</Label>
                <Input placeholder="A" value={locForm.rack} onChange={e => setLocForm({...locForm, rack: e.target.value})} className="mt-1.5" />
              </div>
              <div>
                <Label>Niveli</Label>
                <Input placeholder="3" value={locForm.shelf} onChange={e => setLocForm({...locForm, shelf: e.target.value})} className="mt-1.5" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSaveLocation} disabled={submitting} data-testid="button-save-location">
              {submitting ? "Duke ruajtur..." : editLoc ? "Përditëso" : "Krijo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
