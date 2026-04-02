import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Loader2, Plus, Trash2, BellRing } from "lucide-react";

const DEFAULT_UNITS = [
  { name: "cope", category: "sasi" },
  { name: "çift", category: "sasi" },
  { name: "pako", category: "sasi" },
  { name: "kuti", category: "sasi" },
  { name: "sasi", category: "sasi" },
  { name: "g", category: "peshe" },
  { name: "kg", category: "peshe" },
  { name: "t", category: "peshe" },
  { name: "mg", category: "peshe" },
  { name: "ml", category: "volume" },
  { name: "cl", category: "volume" },
  { name: "dl", category: "volume" },
  { name: "l", category: "volume" },
  { name: "mm", category: "gjatesi" },
  { name: "cm", category: "gjatesi" },
  { name: "m", category: "gjatesi" },
  { name: "km", category: "gjatesi" },
  { name: "m2", category: "siperfaqe" },
  { name: "m3", category: "siperfaqe" },
  { name: "ari", category: "siperfaqe" },
  { name: "hektar", category: "siperfaqe" },
  { name: "ore", category: "kohe" },
  { name: "ditë", category: "kohe" },
  { name: "javë", category: "kohe" },
  { name: "muaj", category: "kohe" },
  { name: "shërbim", category: "sherbim" },
];

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
  const [cashboxSettings, setCashboxSettings] = useState(null);
  const [cashboxForm, setCashboxForm] = useState({ min_balance: 50, alert_email: '', notifications_enabled: true });
  const [savingCashbox, setSavingCashbox] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const [u, temps, invSets, unts, cats, cbSets] = await Promise.all([
        base44.auth.me(),
        base44.entities.InvoiceTemplate.list('-created_date', 1),
        base44.entities.InvoiceSettings.list('-created_date', 1),
        base44.entities.Unit.list('-created_date', 100).catch(() => []),
        base44.entities.ExpenseCategory.list('-created_date', 100).catch(() => []),
        base44.entities.CashboxSettings.list('-created_date', 1).catch(() => []),
      ]);
      setUnits(unts);
      setCategories(cats);
      setUser(u);
      if (temps.length > 0) { setTemplate(temps[0]); setForm(temps[0]); }
      else setForm({ company_name: '', company_email: '', company_phone: '', company_address: '', logo_url: '', primary_color: '#4338CA', footer_text: '' });
      if (invSets.length > 0) setInvoiceSettings(invSets[0]);
      if (cbSets.length > 0) { setCashboxSettings(cbSets[0]); setCashboxForm(cbSets[0]); }
      setLoading(false);
    };
    loadData();
  }, []);

  const addUnit = async () => {
    if (!newUnitName.trim()) return;
    const newUnit = await base44.entities.Unit.create({ name: newUnitName });
    setUnits([...units, newUnit]);
    setNewUnitName(""); setShowNewUnit(false);
    toast.success("Njësia u shtua");
  };

  const seedDefaultUnits = async () => {
    const existing = units.map(u => u.name.toLowerCase());
    const toAdd = DEFAULT_UNITS.filter(u => !existing.includes(u.name.toLowerCase()));
    if (toAdd.length === 0) { toast.info("Të gjitha njësitë standarde ekzistojnë tashmë"); return; }
    const created = await Promise.all(toAdd.map(u => base44.entities.Unit.create({ name: u.name })));
    setUnits([...units, ...created]);
    toast.success(`U shtuan ${created.length} njësi standarde`);
  };

  const deleteUnit = async (id) => {
    if (!window.confirm("Fshi këtë njësi?")) return;
    await base44.entities.Unit.delete(id);
    setUnits(units.filter(u => u.id !== id));
    toast.success("Njësia u fshi");
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newCat = await base44.entities.ExpenseCategory.create({ name: newCategoryName });
    setCategories([...categories, newCat]);
    setNewCategoryName(""); setShowNewCategory(false);
    toast.success("Kategoria u shtua");
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Fshi këtë kategori?")) return;
    await base44.entities.ExpenseCategory.delete(id);
    setCategories(categories.filter(c => c.id !== id));
    toast.success("Kategoria u fshi");
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm({ ...form, logo_url: file_url });
    toast.success('Logo u ngarkua');
    setUploading(false);
  };

  const handleSaveTemplate = async () => {
    if (!form.company_name) { toast.error('Emri i kompanisë është i detyrueshëm'); return; }
    setSaving(true);
    if (template?.id) { await base44.entities.InvoiceTemplate.update(template.id, form); toast.success('Shabllon i përditësuar'); }
    else { await base44.entities.InvoiceTemplate.create(form); toast.success('Shabllon i krijuar'); }
    const temps = await base44.entities.InvoiceTemplate.list('-created_date', 1);
    if (temps.length > 0) setTemplate(temps[0]);
    setSaving(false);
  };

  const handleSaveInvoiceSettings = async () => {
    setSaving(true);
    if (invoiceSettings?.id) { await base44.entities.InvoiceSettings.update(invoiceSettings.id, invoiceSettings); toast.success('Cilësimet e faturave u përditësuan'); }
    else { await base44.entities.InvoiceSettings.create(invoiceSettings || { invoice_number_format: 'INV-{###}' }); toast.success('Cilësimet e faturave u krijuan'); }
    setSaving(false);
  };

  const handleSaveCashboxSettings = async () => {
    setSavingCashbox(true);
    if (cashboxSettings?.id) {
      const updated = await base44.entities.CashboxSettings.update(cashboxSettings.id, cashboxForm);
      setCashboxSettings(updated);
      toast.success('Cilësimet e arkës u përditësuan');
    } else {
      const created = await base44.entities.CashboxSettings.create(cashboxForm);
      setCashboxSettings(created);
      toast.success('Cilësimet e arkës u ruajtën');
    }
    setSavingCashbox(false);
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

      {/* Profili */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <h3 className="text-base font-semibold">Profili</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Emri</Label><Input value={user?.full_name || ""} disabled className="mt-1.5 bg-muted/50" /></div>
          <div><Label>Email</Label><Input value={user?.email || ""} disabled className="mt-1.5 bg-muted/50" /></div>
          <div><Label>Roli</Label><Input value={user?.role || "staff"} disabled className="mt-1.5 bg-muted/50 capitalize" /></div>
        </div>
      </div>

      {/* Shabllon Faturash */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <h3 className="text-base font-semibold">Shabllon Faturash</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Emri i Kompanisë *</Label><Input placeholder="ScentLinq Pro" value={form.company_name || ''} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="mt-1.5" /></div>
          <div><Label>Email i Kompanisë</Label><Input type="email" placeholder="info@company.com" value={form.company_email || ''} onChange={(e) => setForm({ ...form, company_email: e.target.value })} className="mt-1.5" /></div>
          <div><Label>Numri i Telefonit</Label><Input placeholder="+355 6X XXX XXXX" value={form.company_phone || ''} onChange={(e) => setForm({ ...form, company_phone: e.target.value })} className="mt-1.5" /></div>
          <div>
            <Label>Ngjyra Kryesore</Label>
            <div className="flex gap-2 mt-1.5">
              <input type="color" value={form.primary_color || '#4338CA'} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-12 h-9 rounded-lg cursor-pointer border border-border" />
              <Input value={form.primary_color || '#4338CA'} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="flex-1" />
            </div>
          </div>
        </div>
        <div><Label>Adresa e Kompanisë</Label><Input placeholder="Tirane, Shqiperi" value={form.company_address || ''} onChange={(e) => setForm({ ...form, company_address: e.target.value })} className="mt-1.5" /></div>
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
        <div><Label>Teksti në Fund të Faturës</Label><Textarea placeholder="Faleminderit për besimin tuaj!" value={form.footer_text || ''} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} className="mt-1.5" rows={3} /></div>
        <Button onClick={handleSaveTemplate} disabled={saving} className="w-full gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Duke ruajtur...' : 'Ruaj Shabllon'}
        </Button>
      </div>

      {/* Cilësimet e Faturave */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <h3 className="text-base font-semibold">Cilësimet e Faturave</h3>
        <div className="space-y-4">
          <div>
            <Label>Format i Numrit të Faturës</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-2">Shembuj: INV-{'{###}'} → INV-001, FAT-{'{###}'} → FAT-001, INV-{'{YYYY}'}-{'{###}'} → INV-2026-001</p>
            <Input placeholder="INV-{###}" value={invoiceSettings?.invoice_number_format || 'INV-{###}'} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoice_number_format: e.target.value })} className="mt-1" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Afati Default i Faturave (ditë)</Label><Input type="number" min="1" value={invoiceSettings?.default_due_days ?? 10} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, default_due_days: parseInt(e.target.value) || 10 })} className="mt-1.5" /><p className="text-xs text-muted-foreground mt-1">Afati për pagesmën vendoset automatikisht kur krijohet fatura</p></div>
            <div className="sm:col-span-1"></div>
            <div><Label>Ditë përpara afatit për kujtesë</Label><Input type="number" min="1" value={invoiceSettings?.payment_reminder_days_before || 3} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, payment_reminder_days_before: parseInt(e.target.value) })} className="mt-1.5" /></div>
            <div><Label>Ditë pas afatit për kujtesë</Label><Input type="number" min="1" value={invoiceSettings?.payment_reminder_days_after || 5} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, payment_reminder_days_after: parseInt(e.target.value) })} className="mt-1.5" /></div>
          </div>
          <div><Label>Shënime të Parazgjedhura Për Pagesës</Label><Textarea placeholder="Llogarinë bankar, termin e pagesës..." value={invoiceSettings?.default_payment_notes || ''} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, default_payment_notes: e.target.value })} className="mt-1.5" rows={3} /></div>
          <Button onClick={handleSaveInvoiceSettings} disabled={saving} className="w-full gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Duke ruajtur...' : 'Ruaj Cilësimet e Faturave'}
          </Button>
        </div>
      </div>

      {/* Njoftimet e Arkës */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="flex items-center gap-2">
          <BellRing className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold">Njoftimet e Arkës</h3>
        </div>
        <p className="text-sm text-muted-foreground">Merr një email automatik kur bilanci i arkës bie nën kufirin minimal.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Bilanci Minimal (€)</Label>
            <Input
              type="number" min="0" step="1"
              placeholder="50"
              value={cashboxForm.min_balance ?? 50}
              onChange={(e) => setCashboxForm({ ...cashboxForm, min_balance: parseFloat(e.target.value) || 0 })}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">Njoftim dërgohet kur bilanci bie nën këtë vlerë</p>
          </div>
          <div>
            <Label>Email për Njoftim</Label>
            <Input
              type="email"
              placeholder="admin@company.com"
              value={cashboxForm.alert_email || ''}
              onChange={(e) => setCashboxForm({ ...cashboxForm, alert_email: e.target.value })}
              className="mt-1.5"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
          <input
            type="checkbox"
            id="notif-enabled"
            checked={cashboxForm.notifications_enabled ?? true}
            onChange={(e) => setCashboxForm({ ...cashboxForm, notifications_enabled: e.target.checked })}
            className="w-4 h-4 accent-primary"
          />
          <label htmlFor="notif-enabled" className="text-sm font-medium cursor-pointer">
            Aktivizo njoftimet automatike
          </label>
        </div>
        <Button onClick={handleSaveCashboxSettings} disabled={savingCashbox} className="w-full gap-2">
          {savingCashbox && <Loader2 className="w-4 h-4 animate-spin" />}
          {savingCashbox ? 'Duke ruajtur...' : 'Ruaj Cilësimet e Njoftimeve'}
        </Button>
      </div>

      {/* Njësitë e Matjes */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <h3 className="text-base font-semibold">Njësitë e Matjes</h3>
        <div className="space-y-3">
          {units.map(u => (
            <div key={u.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
              <span className="text-sm font-medium">{u.name}</span>
              <button onClick={() => deleteUnit(u.id)} className="text-destructive/60 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {!showNewUnit ? (
            <div className="flex gap-2">
              <Button onClick={() => setShowNewUnit(true)} variant="outline" className="flex-1 gap-2"><Plus className="w-4 h-4" /> Njësi e Re</Button>
              <Button onClick={seedDefaultUnits} variant="outline" className="flex-1 gap-2 text-primary border-primary/30 hover:bg-primary/5">Shto Njësi Standarde</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input placeholder="P.sh. cope, kg, m, l..." value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} className="text-sm" />
              <Button size="sm" variant="outline" onClick={addUnit} className="px-2">✓</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowNewUnit(false); setNewUnitName(""); }} className="px-2">✕</Button>
            </div>
          )}
        </div>
      </div>

      {/* Kategoriat e Shpenzimeve */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <h3 className="text-base font-semibold">Kategoriat e Shpenzimeve</h3>
        <div className="space-y-3">
          {categories.map(c => (
            <div key={c.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
              <span className="text-sm font-medium">{c.name}</span>
              <button onClick={() => deleteCategory(c.id)} className="text-destructive/60 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {!showNewCategory ? (
            <Button onClick={() => setShowNewCategory(true)} variant="outline" className="w-full gap-2"><Plus className="w-4 h-4" /> Kategori e Re</Button>
          ) : (
            <div className="flex gap-2">
              <Input placeholder="P.sh. Qira, Paga, Transport..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="text-sm" />
              <Button size="sm" variant="outline" onClick={addCategory} className="px-2">✓</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }} className="px-2">✕</Button>
            </div>
          )}
        </div>
      </div>

      {/* Aksionet */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="text-base font-semibold">Aksionet</h3>
        <Button variant="outline" onClick={() => base44.auth.logout()} className="text-destructive border-destructive/20 hover:bg-destructive/5">
          Dil nga llogaria
        </Button>
      </div>
    </div>
  );
}