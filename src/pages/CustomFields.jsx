import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Settings2, GripVertical } from "lucide-react";

const ENTITY_TYPES = {
  client: "Klientët",
  supplier: "Furnitorët",
  product: "Produktet",
  invoice: "Faturat",
  expense: "Shpenzimet",
  vehicle: "Automjetet",
  driver: "Shoferët",
  asset: "Asetet",
  service_appointment: "Takimet e Shërbimit",
};

const FIELD_TYPES = {
  text: "Tekst",
  number: "Numër",
  date: "Datë",
  select: "Listë Zgjedhjesh",
  checkbox: "Checkbox",
  textarea: "Tekst i Gjatë",
  email: "Email",
  phone: "Telefon",
  url: "URL",
};

const emptyForm = () => ({
  entity_type: "client",
  field_name: "",
  field_label: "",
  field_type: "text",
  options: [],
  is_required: false,
  sort_order: 0,
});

export default function CustomFields() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [entityFilter, setEntityFilter] = useState("all");
  const [optionInput, setOptionInput] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const f = await base44.entities.CustomField.list("sort_order", 500);
    setFields(f); setLoading(false);
  };

  const handleSave = async () => {
    if (!form.field_name || !form.field_label) { toast.error("Emri dhe etiketa janë të detyrueshme"); return; }
    setSubmitting(true);
    try {
      const data = { ...form, options: form.field_type === "select" ? form.options : [] };
      if (editingId) { await base44.entities.CustomField.update(editingId, data); toast.success("Fusha u përditësua"); }
      else { await base44.entities.CustomField.create(data); toast.success("Fusha u krijua"); }
      setDialogOpen(false); setForm(emptyForm()); setEditingId(null); loadData();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Fshi këtë fushë?")) return;
    await base44.entities.CustomField.delete(id);
    toast.success("Fusha u fshi"); loadData();
  };

  const addOption = () => {
    if (!optionInput.trim()) return;
    setForm({ ...form, options: [...(form.options || []), optionInput.trim()] });
    setOptionInput("");
  };

  const removeOption = (idx) => {
    setForm({ ...form, options: (form.options || []).filter((_, i) => i !== idx) });
  };

  const filtered = entityFilter === "all" ? fields : fields.filter(f => f.entity_type === entityFilter);

  const grouped = {};
  filtered.forEach(f => {
    const key = f.entity_type;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(f);
  });

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Fushat e Personalizuara</h1>
          <p className="text-sm text-muted-foreground mt-1">Shto fusha shtesë për çdo entitet</p>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setEditingId(null); setDialogOpen(true); }} data-testid="button-add"><Plus className="w-4 h-4 mr-1" /> Fushë e Re</Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-entity-filter"><SelectValue placeholder="Të gjitha entitetet" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha</SelectItem>
            {Object.entries(ENTITY_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} fusha</span>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground">
          <Settings2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">Nuk ka fusha të personalizuara</p>
          <p className="text-sm mt-1">Shto fusha shtesë për të menaxhuar informacione shtesë</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([entityType, entityFields]) => (
            <div key={entityType} className="bg-card rounded-xl border overflow-hidden">
              <div className="px-4 py-3 bg-muted/50 border-b">
                <h3 className="text-sm font-semibold">{ENTITY_TYPES[entityType] || entityType}</h3>
              </div>
              <div className="divide-y">
                {entityFields.map(f => (
                  <div key={f.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30" data-testid={`row-field-${f.id}`}>
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground/30" />
                      <div>
                        <div className="font-medium text-sm">{f.field_label}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="bg-muted px-1.5 py-0.5 rounded">{f.field_name}</span>
                          <span>{FIELD_TYPES[f.field_type] || f.field_type}</span>
                          {f.is_required && <span className="text-red-500">*</span>}
                          {f.field_type === "select" && f.options?.length > 0 && (
                            <span className="text-muted-foreground">({(Array.isArray(f.options) ? f.options : []).length} opsione)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setForm({ ...f, options: Array.isArray(f.options) ? f.options : [] }); setEditingId(f.id); setDialogOpen(true); }} data-testid={`button-edit-${f.id}`}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(f.id)} data-testid={`button-delete-${f.id}`}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Ndrysho Fushën" : "Fushë e Re"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Entiteti</Label>
              <Select value={form.entity_type} onValueChange={v => setForm({...form, entity_type: v})}>
                <SelectTrigger className="mt-1.5" data-testid="select-entity-type"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ENTITY_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Emri i Fushës (sistemi)</Label><Input data-testid="input-field-name" value={form.field_name} onChange={e => setForm({...form, field_name: e.target.value.toLowerCase().replace(/\s+/g, "_")})} className="mt-1.5" placeholder="p.sh. custom_note" /></div>
              <div><Label>Etiketa (shfaqja)</Label><Input data-testid="input-field-label" value={form.field_label} onChange={e => setForm({...form, field_label: e.target.value})} className="mt-1.5" placeholder="p.sh. Shënim Shtesë" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipi i Fushës</Label>
                <Select value={form.field_type} onValueChange={v => setForm({...form, field_type: v})}>
                  <SelectTrigger className="mt-1.5" data-testid="select-field-type"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(FIELD_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-0.5">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_required || false} onChange={e => setForm({...form, is_required: e.target.checked})} className="rounded" data-testid="checkbox-required" />
                  E detyrueshme
                </label>
              </div>
            </div>
            <div><Label>Radhitja</Label><Input data-testid="input-sort-order" type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: parseInt(e.target.value) || 0})} className="mt-1.5" /></div>

            {form.field_type === "select" && (
              <div>
                <Label>Opsionet</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input data-testid="input-option" value={optionInput} onChange={e => setOptionInput(e.target.value)} placeholder="Shto opsion" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addOption())} />
                  <Button variant="outline" size="sm" onClick={addOption} data-testid="button-add-option">Shto</Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(form.options || []).map((opt, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-xs" data-testid={`option-${i}`}>
                      {opt}
                      <button onClick={() => removeOption(i)} className="text-red-500 hover:text-red-700">&times;</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter><Button onClick={handleSave} disabled={submitting} data-testid="button-save">{submitting ? "Duke ruajtur..." : editingId ? "Përditëso" : "Ruaj"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
