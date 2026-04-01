import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Loader2, Plus, Trash2 } from "lucide-react";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({});
  const [invoiceSettings, setInvoiceSettings] = useState(null);
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const [u, temps, invSets, unts, cats] = await Promise.all([
        base44.auth.me(),
        base44.entities.InvoiceTemplate.list('-created_date', 1),
        base44.entities.InvoiceSettings.list('-created_date', 1),
        base44.entities.Unit.list('-created_date', 100).catch(() => []),
        base44.entities.ExpenseCategory.list('-created_date', 100).catch(() => []),
      ]);  
      setUnits(unts);
      setCategories(cats);
      setUser(u);
      if (temps.length > 0) {
        setTemplate(temps[0]);
        setForm(temps[0]);
      } else {
        setForm({ company_name: '', company_email: '', company_phone: '', company_address: '', logo_url: '', primary_color: '#4338CA', footer_text: '' });
      }
      if (invSets.length > 0) {
        setInvoiceSettings(invSets[0]);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const addUnit = async () => {
    if (!newUnitName.trim()) return;
    try {
      const newUnit = await base44.entities.Unit.create({ name: newUnitName });
      setUnits([...units, newUnit]);
      setNewUnitName("");
      setShowNewUnit(false);
      toast.success("Njësia u shtua");
    } catch (err) {
      toast.error("Gabim në ruajtje");
    }
  };

  const deleteUnit = async (id) => {
    if (!window.confirm("Fshi këtë njësi?")) return;
    try {
      await base44.entities.Unit.delete(id);
      setUnits(units.filter(u => u.id !== id));
      toast.success("Njësia u fshi");
    } catch (err) {
      toast.error("Gabim në fshirje");
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const newCat = await base44.entities.ExpenseCategory.create({ name: newCategoryName });
      setCategories([...categories, newCat]);
      setNewCategoryName("");
      setShowNewCategory(false);
      toast.success("Kategoria u shtua");
    } catch (err) {
      toast.error("Gabim në ruajtje");
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Fshi këtë kategori?")) return;
    try {
      await base44.entities.ExpenseCategory.delete(id);
      setCategories(categories.filter(c => c.id !== id));
      toast.success("Kategoria u fshi");
    } catch (err) {
      toast.error("Gabim në fshirje");
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm({ ...form, logo_url: file_url });
      toast.success('Logo u ngarkua');
    } catch (err) {
      toast.error('Gabim gjatë ngarkimit');
    }
    setUploading(false);
  };

  const handleSaveTemplate = async () => {
    if (!form.company_name) {
      toast.error('Emri i kompanisë është i detyrueshëm');
      return;
    }
    setSaving(true);
    try {
      if (template?.id) {
        await base44.entities.InvoiceTemplate.update(template.id, form);
        toast.success('Shabllon i përditësuar');
      } else {
        await base44.entities.InvoiceTemplate.create(form);
        toast.success('Shabllon i krijuar');
      }
      const temps = await base44.entities.InvoiceTemplate.list('-created_date', 1);
      if (temps.length > 0) setTemplate(temps[0]);
    } catch (err) {
      toast.error('Gabim në ruajtje');
    }
    setSaving(false);
  };

  const handleSaveInvoiceSettings = async () => {
    setSaving(true);
    try {
      if (invoiceSettings?.id) {
        await base44.entities.InvoiceSettings.update(invoiceSettings.id, invoiceSettings);
        toast.success('Cilësimet e faturave u përditësuan');
      } else {
        await base44.entities.InvoiceSettings.create(invoiceSettings || { invoice_number_format: 'INV-{###}' });
        toast.success('Cilësimet e faturave u krijuan');
      }
    } catch (err) {
      toast.error('Gabim në ruajtje');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Menaxho llogarinë dhe preferencat</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <h3 className="text-base font-semibold">Profili</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Emri</Label>
            <Input value={user?.full_name || ""} disabled className="mt-1.5 bg-muted/50" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="mt-1.5 bg-muted/50" />
          </div>
          <div>
            <Label>Roli</Label>
            <Input value={user?.role || "staff"} disabled className="mt-1.5 bg-muted/50 capitalize" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <h3 className="text-base font-semibold">Shabllon Faturash</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Emri i Kompanisë *</Label>
            <Input placeholder="ScentLinq Pro" value={form.company_name || ''} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label>Email i Kompanisë</Label>
            <Input type="email" placeholder="info@company.com" value={form.company_email || ''} onChange={(e) => setForm({ ...form, company_email: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label>Numri i Telefonit</Label>
            <Input placeholder="+355 6X XXX XXXX" value={form.company_phone || ''} onChange={(e) => setForm({ ...form, company_phone: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label>Ngjyra Kryesore</Label>
            <div className="flex gap-2 mt-1.5">
              <input type="color" value={form.primary_color || '#4338CA'} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-12 h-9 rounded-lg cursor-pointer border border-border" />
              <Input value={form.primary_color || '#4338CA'} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="flex-1" />
            </div>
          </div>
        </div>
        <div>
          <Label>Adresa e Kompanisë</Label>
          <Input placeholder="Tirane, Shqiperi" value={form.company_address || ''} onChange={(e) => setForm({ ...form, company_address: e.target.value })} className="mt-1.5" />
        </div>
        <div>
          <Label>Logo e Kompanisë</Label>
          <div className="mt-1.5 flex items-center gap-3">
            {form.logo_url && <img src={form.logo_url} alt="Logo" className="h-12 rounded-lg border border-border" />}
            <label className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-border bg-white hover:bg-muted cursor-pointer transition">
              <Upload className="w-4 h-4" />
              {uploading ? 'Duke ngarkuar...' : 'Ngarko Logo'}
              <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} className="hidden" />
            </label>
          </div>
        </div>
        <div>
          <Label>Teksti në Fund të Faturës</Label>
          <Textarea placeholder="Faleminderit për besimin tuaj!" value={form.footer_text || ''} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} className="mt-1.5" rows={3} />
        </div>
        <Button onClick={handleSaveTemplate} disabled={saving} className="w-full gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Duke ruajtur...' : 'Ruaj Shabllon'}
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <h3 className="text-base font-semibold">Cilësimet e Faturave</h3>
        <div className="space-y-4">
          <div>
            <Label>Format i Numrit të Faturës</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-2">Shembuj: INV-{'{###}'} → INV-001, FAT-{'{###}'} → FAT-001, INV-{'{YYYY}'}-{'{###}'} → INV-2026-001</p>
            <Input placeholder="INV-{###}" value={invoiceSettings?.invoice_number_format || 'INV-{###}'} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoice_number_format: e.target.value })} className="mt-1" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Ditë përpara afatit për kujtesë</Label>
              <Input type="number" min="1" value={invoiceSettings?.payment_reminder_days_before || 3} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, payment_reminder_days_before: parseInt(e.target.value) })} className="mt-1.5" />
            </div>
            <div>
              <Label>Ditë pas afatit për kujtesë</Label>
              <Input type="number" min="1" value={invoiceSettings?.payment_reminder_days_after || 5} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, payment_reminder_days_after: parseInt(e.target.value) })} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label>Shënime të Parazgjedhura Për Pagesës</Label>
            <Textarea placeholder="Llogarinë bankar, termin e pagesës..." value={invoiceSettings?.default_payment_notes || ''} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, default_payment_notes: e.target.value })} className="mt-1.5" rows={3} />
          </div>
          <Button onClick={handleSaveInvoiceSettings} disabled={saving} className="w-full gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Duke ruajtur...' : 'Ruaj Cilësimet e Faturave'}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <h3 className="text-base font-semibold">Njësitë e Matjes</h3>
        <div className="space-y-3">
          {units.map(u => (
            <div key={u.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
              <span className="text-sm font-medium">{u.name}</span>
              <button onClick={() => deleteUnit(u.id)} className="text-destructive/60 hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {!showNewUnit ? (
            <Button onClick={() => setShowNewUnit(true)} variant="outline" className="w-full gap-2">
              <Plus className="w-4 h-4" /> Njësi e Re
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input placeholder="P.sh. cope, kg, m, l..." value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} className="text-sm" />
              <Button size="sm" variant="outline" onClick={addUnit} className="px-2">✓</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowNewUnit(false); setNewUnitName(""); }} className="px-2">✕</Button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <h3 className="text-base font-semibold">Kategoriat e Shpenzimeve</h3>
        <div className="space-y-3">
          {categories.map(c => (
            <div key={c.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
              <span className="text-sm font-medium">{c.name}</span>
              <button onClick={() => deleteCategory(c.id)} className="text-destructive/60 hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {!showNewCategory ? (
            <Button onClick={() => setShowNewCategory(true)} variant="outline" className="w-full gap-2">
              <Plus className="w-4 h-4" /> Kategori e Re
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input placeholder="P.sh. Qira, Paga, Transport..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="text-sm" />
              <Button size="sm" variant="outline" onClick={addCategory} className="px-2">✓</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }} className="px-2">✕</Button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="text-base font-semibold">Aksionet</h3>
        <Button variant="outline" onClick={() => base44.auth.logout()} className="text-destructive border-destructive/20 hover:bg-destructive/5">
          Dil nga llogaria
        </Button>
      </div>
    </div>
  );
}