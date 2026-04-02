import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Loader2, Plus, Trash2, BellRing, Star } from "lucide-react";

const DEFAULT_UNITS = [
  { name: "Copë", code: "copë", category: "products", is_default: true },
  { name: "Njësi", code: "njësi", category: "products", is_default: true },
  { name: "Pako", code: "pako", category: "products", is_default: true },
  { name: "Kuti", code: "kuti", category: "products", is_default: true },
  { name: "Set", code: "set", category: "products", is_default: true },
  { name: "Çift", code: "çift", category: "products", is_default: true },
  { name: "Kilogram", code: "kg", category: "weight", is_default: true },
  { name: "Gram", code: "g", category: "weight", is_default: true },
  { name: "Ton", code: "ton", category: "weight", is_default: true },
  { name: "Litër", code: "l", category: "volume", is_default: true },
  { name: "Mililiter", code: "ml", category: "volume", is_default: true },
  { name: "Metër", code: "m", category: "length", is_default: true },
  { name: "Centimetër", code: "cm", category: "length", is_default: true },
  { name: "Metër katror", code: "m²", category: "length", is_default: true },
  { name: "Metër kub", code: "m³", category: "length", is_default: true },
  { name: "Kilometër", code: "km", category: "logistics", is_default: true },
  { name: "Ari", code: "ar", category: "length", is_default: true },
  { name: "Hektar", code: "ha", category: "length", is_default: true },
  { name: "Orë", code: "orë", category: "time", is_default: true },
  { name: "Ditë", code: "ditë", category: "time", is_default: true },
  { name: "Javë", code: "javë", category: "time", is_default: true },
  { name: "Muaj", code: "muaj", category: "time", is_default: true },
  { name: "Vit", code: "vit", category: "time", is_default: true },
  { name: "Projekt", code: "projekt", category: "time", is_default: true },
  { name: "Shërbim", code: "shërbim", category: "time", is_default: true },
  { name: "Përdorues", code: "usr", category: "it_saas", is_default: true },
  { name: "Liçensë", code: "liç", category: "it_saas", is_default: true },
  { name: "Abonament", code: "abo", category: "it_saas", is_default: true },
  { name: "Modul", code: "modul", category: "it_saas", is_default: true },
  { name: "Kërkesë API", code: "api", category: "it_saas", is_default: true },
  { name: "Gigabajt", code: "GB", category: "it_saas", is_default: true },
  { name: "Megabajt", code: "MB", category: "it_saas", is_default: true },
  { name: "Dërgesë", code: "dërgim", category: "logistics", is_default: true },
  { name: "Paletë", code: "paletë", category: "logistics", is_default: true },
  { name: "Kontejner", code: "kont", category: "logistics", is_default: true },
  { name: "Kontratë", code: "kontr", category: "business", is_default: true },
  { name: "Transaksion", code: "trans", category: "business", is_default: true },
  { name: "Tarifë", code: "tarife", category: "business", is_default: true },
  { name: "Përqindje", code: "%", category: "business", is_default: true },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Qira", parent_category: "Shpenzime Operative", type: "fixed" },
  { name: "Energji Elektrike", parent_category: "Shpenzime Operative", type: "fixed" },
  { name: "Ujë", parent_category: "Shpenzime Operative", type: "fixed" },
  { name: "Internet & Telefon", parent_category: "Shpenzime Operative", type: "fixed" },
  { name: "Mirëmbajtje Zyre", parent_category: "Shpenzime Operative", type: "variable" },
  { name: "Paga", parent_category: "Pagat & Burimet Njerëzore", type: "fixed" },
  { name: "Bonuse", parent_category: "Pagat & Burimet Njerëzore", type: "variable" },
  { name: "Përfitime Punonjësish", parent_category: "Pagat & Burimet Njerëzore", type: "fixed" },
  { name: "Trajnim", parent_category: "Pagat & Burimet Njerëzore", type: "variable" },
  { name: "Rekrutim", parent_category: "Pagat & Burimet Njerëzore", type: "one-time" },
  { name: "Reklama Online", parent_category: "Marketing & Reklamim", type: "variable" },
  { name: "Branding", parent_category: "Marketing & Reklamim", type: "one-time" },
  { name: "Dizajn Grafik", parent_category: "Marketing & Reklamim", type: "variable" },
  { name: "Evente & Promovime", parent_category: "Marketing & Reklamim", type: "one-time" },
  { name: "Karburant", parent_category: "Transport & Logjistikë", type: "variable" },
  { name: "Transport", parent_category: "Transport & Logjistikë", type: "variable" },
  { name: "Dërgesa", parent_category: "Transport & Logjistikë", type: "variable" },
  { name: "Mirëmbajtje Automjeti", parent_category: "Transport & Logjistikë", type: "variable" },
  { name: "Blerje Pajisje", parent_category: "Pajisje & Asete", type: "one-time" },
  { name: "Mobilje Zyre", parent_category: "Pajisje & Asete", type: "one-time" },
  { name: "Kompjuterë & Hardware", parent_category: "Pajisje & Asete", type: "one-time" },
  { name: "Vegla Pune", parent_category: "Pajisje & Asete", type: "one-time" },
  { name: "Abonime SaaS", parent_category: "Software & IT", type: "fixed" },
  { name: "Hosting", parent_category: "Software & IT", type: "fixed" },
  { name: "Domain", parent_category: "Software & IT", type: "fixed" },
  { name: "Liçensa Software", parent_category: "Software & IT", type: "fixed" },
  { name: "Kosto Zhvillimi", parent_category: "Software & IT", type: "variable" },
  { name: "Tarifa Bankare", parent_category: "Shpenzime Financiare", type: "variable" },
  { name: "Interesa", parent_category: "Shpenzime Financiare", type: "fixed" },
  { name: "Pagesa Kredie", parent_category: "Shpenzime Financiare", type: "fixed" },
  { name: "Tarifa Transaksioni", parent_category: "Shpenzime Financiare", type: "variable" },
  { name: "Shërbime Ligjore", parent_category: "Juridike & Profesionale", type: "variable" },
  { name: "Kontabilitet", parent_category: "Juridike & Profesionale", type: "fixed" },
  { name: "Konsulencë", parent_category: "Juridike & Profesionale", type: "variable" },
  { name: "Auditim", parent_category: "Juridike & Profesionale", type: "one-time" },
  { name: "Materiale Zyre", parent_category: "Materiale & Furnitura", type: "variable" },
  { name: "Konsumabëlë", parent_category: "Materiale & Furnitura", type: "variable" },
  { name: "Materiale Pastrimi", parent_category: "Materiale & Furnitura", type: "variable" },
  { name: "Lëndë të Para", parent_category: "Kosto të Drejtpërdrejta", type: "variable" },
  { name: "Kosto Prodhimi", parent_category: "Kosto të Drejtpërdrejta", type: "variable" },
  { name: "Paketim", parent_category: "Kosto të Drejtpërdrejta", type: "variable" },
  { name: "Sigurim Biznesi", parent_category: "Sigurime", type: "fixed" },
  { name: "Sigurim Shëndetësor", parent_category: "Sigurime", type: "fixed" },
  { name: "Sigurim Automjeti", parent_category: "Sigurime", type: "fixed" },
  { name: "Kurse", parent_category: "Arsim & Zhvillim", type: "variable" },
  { name: "Seminare", parent_category: "Arsim & Zhvillim", type: "one-time" },
  { name: "Libra", parent_category: "Arsim & Zhvillim", type: "variable" },
  { name: "Biletë Avioni", parent_category: "Udhëtime & Argëtim", type: "variable" },
  { name: "Hotel", parent_category: "Udhëtime & Argëtim", type: "variable" },
  { name: "Ushqim", parent_category: "Udhëtime & Argëtim", type: "variable" },
  { name: "Takime me Klientë", parent_category: "Udhëtime & Argëtim", type: "variable" },
  { name: "TVSH", parent_category: "Taksa & Shteti", type: "variable" },
  { name: "Tatim Korporativ", parent_category: "Taksa & Shteti", type: "fixed" },
  { name: "Taksa Lokale", parent_category: "Taksa & Shteti", type: "fixed" },
  { name: "Riparime", parent_category: "Mirëmbajtje & Riparime", type: "variable" },
  { name: "Servisim Pajisje", parent_category: "Mirëmbajtje & Riparime", type: "variable" },
  { name: "Mirëmbajtje Teknike", parent_category: "Mirëmbajtje & Riparime", type: "variable" },
  { name: "Amortizim Asetesh", parent_category: "Amortizim", type: "fixed" },
  { name: "Amortizim Automjeti", parent_category: "Amortizim", type: "fixed" },
];

const DEFAULT_SERVICE_CATEGORIES = [
  { name: "Zhvillim Software", category: "IT & Software", subcategory: "", billing_type: "project" },
  { name: "Mirëmbajtje Sistemesh", category: "IT & Software", subcategory: "", billing_type: "recurring" },
  { name: "Mbështetje Teknike", category: "IT & Software", subcategory: "", billing_type: "hourly" },
  { name: "Hosting", category: "IT & Software", subcategory: "", billing_type: "recurring" },
  { name: "Integrim API", category: "IT & Software", subcategory: "", billing_type: "project" },
  { name: "Dizajn Grafik", category: "Dizajn & Krijues", subcategory: "", billing_type: "project" },
  { name: "Branding", category: "Dizajn & Krijues", subcategory: "", billing_type: "project" },
  { name: "Dizajn UI/UX", category: "Dizajn & Krijues", subcategory: "", billing_type: "project" },
  { name: "Montim Video", category: "Dizajn & Krijues", subcategory: "", billing_type: "hourly" },
  { name: "Menaxhim Social Media", category: "Marketing", subcategory: "", billing_type: "recurring" },
  { name: "Reklama të Paguara (Facebook, Google)", category: "Marketing", subcategory: "", billing_type: "recurring" },
  { name: "SEO", category: "Marketing", subcategory: "", billing_type: "recurring" },
  { name: "Krijim Përmbajtje", category: "Marketing", subcategory: "", billing_type: "project" },
  { name: "Konsulencë", category: "Biznes & Profesionale", subcategory: "", billing_type: "hourly" },
  { name: "Kontabilitet", category: "Biznes & Profesionale", subcategory: "", billing_type: "recurring" },
  { name: "Shërbime Ligjore", category: "Biznes & Profesionale", subcategory: "", billing_type: "hourly" },
  { name: "Auditim", category: "Biznes & Profesionale", subcategory: "", billing_type: "one-time" },
  { name: "Dërgesa", category: "Transport & Logjistikë", subcategory: "", billing_type: "one-time" },
  { name: "Transport", category: "Transport & Logjistikë", subcategory: "", billing_type: "one-time" },
  { name: "Magazinim", category: "Transport & Logjistikë", subcategory: "", billing_type: "recurring" },
  { name: "Riparim Pajisje", category: "Mirëmbajtje & Riparime", subcategory: "", billing_type: "one-time" },
  { name: "Mirëmbajtje Teknike", category: "Mirëmbajtje & Riparime", subcategory: "", billing_type: "recurring" },
  { name: "Mirëmbajtje Objekti", category: "Mirëmbajtje & Riparime", subcategory: "", billing_type: "recurring" },
  { name: "Dezinfektim Sipërfaqesh", category: "Shërbime Mbrojtjes", subcategory: "Dezinfektim", billing_type: "one-time" },
  { name: "Dezinfektim Ajri", category: "Shërbime Mbrojtjes", subcategory: "Dezinfektim", billing_type: "one-time" },
  { name: "Dezinfektim Industrial", category: "Shërbime Mbrojtjes", subcategory: "Dezinfektim", billing_type: "one-time" },
  { name: "Dezinfektim Banesash", category: "Shërbime Mbrojtjes", subcategory: "Dezinfektim", billing_type: "one-time" },
  { name: "Insekte Fluturuese (mizë, mushkonjë)", category: "Shërbime Mbrojtjes", subcategory: "Dezinsektim", billing_type: "one-time" },
  { name: "Insekte Zvarranikë (bleta, milingona)", category: "Shërbime Mbrojtjes", subcategory: "Dezinsektim", billing_type: "one-time" },
  { name: "Trajtim Ploshtash", category: "Shërbime Mbrojtjes", subcategory: "Dezinsektim", billing_type: "one-time" },
  { name: "Kontrolli Grerëzave & Bletëve", category: "Shërbime Mbrojtjes", subcategory: "Dezinsektim", billing_type: "one-time" },
  { name: "Kontrolli Minjve", category: "Shërbime Mbrojtjes", subcategory: "Deratizim", billing_type: "one-time" },
  { name: "Kontrolli Rateve", category: "Shërbime Mbrojtjes", subcategory: "Deratizim", billing_type: "one-time" },
  { name: "Monitorim & Parandalim Brejtësish", category: "Shërbime Mbrojtjes", subcategory: "Deratizim", billing_type: "recurring" },
  { name: "Kontrolli Zogjve (pëllumba)", category: "Shërbime Mbrojtjes", subcategory: "Dëmkëmbës të Tjerë", billing_type: "one-time" },
  { name: "Kontrolli Reptilëve", category: "Shërbime Mbrojtjes", subcategory: "Dëmkëmbës të Tjerë", billing_type: "one-time" },
  { name: "Kontrolli Kafshëve të Egra", category: "Shërbime Mbrojtjes", subcategory: "Dëmkëmbës të Tjerë", billing_type: "one-time" },
  { name: "Kontrolli Gjarpërinjve", category: "Shërbime Mbrojtjes", subcategory: "Dëmkëmbës të Tjerë", billing_type: "one-time" },
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
  const [services, setServices] = useState([]);
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitCode, setNewUnitCode] = useState("");
  const [newUnitCategory, setNewUnitCategory] = useState("custom");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewService, setShowNewService] = useState(false);
  const [newService, setNewService] = useState({ name: "", category: "", subcategory: "", billing_type: "one-time" });
  const [cashboxSettings, setCashboxSettings] = useState(null);
  const [cashboxForm, setCashboxForm] = useState({ min_balance: 50, alert_email: '', notifications_enabled: true });
  const [savingCashbox, setSavingCashbox] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const [u, temps, invSets, unts, cats, cbSets, svcs] = await Promise.all([
        base44.auth.me(),
        base44.entities.InvoiceTemplate.list('-created_date', 1),
        base44.entities.InvoiceSettings.list('-created_date', 1),
        base44.entities.Unit.list('-created_date', 100).catch(() => []),
        base44.entities.ExpenseCategory.list('-created_date', 100).catch(() => []),
        base44.entities.CashboxSettings.list('-created_date', 1).catch(() => []),
        base44.entities.ServiceCategory.list('-created_date', 200).catch(() => []),
      ]);
      setUnits(unts);
      setUser(u);
      if (temps.length > 0) { setTemplate(temps[0]); setForm(temps[0]); }
      else setForm({ company_name: '', company_email: '', company_phone: '', company_address: '', logo_url: '', primary_color: '#4338CA', footer_text: '' });
      if (invSets.length > 0) setInvoiceSettings(invSets[0]);
      if (cbSets.length > 0) { setCashboxSettings(cbSets[0]); setCashboxForm(cbSets[0]); }

      // Auto-seed expense categories if empty
      let finalCats = cats || [];
      if (finalCats.length === 0) {
        const createdCats = await Promise.all(DEFAULT_EXPENSE_CATEGORIES.map(c => base44.entities.ExpenseCategory.create({ ...c, is_default: true })));
        finalCats = createdCats;
        toast.success(`U shtuan ${createdCats.length} kategori standarde`);
      }
      setCategories(finalCats);

      // Auto-seed services if empty
      let finalSvcs = svcs || [];
      if (finalSvcs.length === 0) {
        const created = await Promise.all(DEFAULT_SERVICE_CATEGORIES.map(s => base44.entities.ServiceCategory.create({ ...s, is_default: true })));
        finalSvcs = created;
        toast.success(`U shtuan ${created.length} shërbime standarde`);
      }
      setServices(finalSvcs);

      setLoading(false);
    };
    loadData();
  }, []);

  const CATEGORY_LABELS = { products: "Produkte", weight: "Peshë", volume: "Vëllim", length: "Gjatësi", time: "Kohë", it_saas: "IT/SaaS", logistics: "Logjistikë", business: "Biznes", custom: "Tjera" };
  const CATEGORY_COLORS = { products: "bg-slate-100 text-slate-700", weight: "bg-amber-100 text-amber-700", volume: "bg-blue-100 text-blue-700", length: "bg-emerald-100 text-emerald-700", time: "bg-rose-100 text-rose-700", it_saas: "bg-violet-100 text-violet-700", logistics: "bg-orange-100 text-orange-700", business: "bg-cyan-100 text-cyan-700", custom: "bg-pink-100 text-pink-700" };

  const addUnit = async () => {
    if (!newUnitName.trim() || !newUnitCode.trim()) return;
    const newUnit = await base44.entities.Unit.create({ name: newUnitName, code: newUnitCode, category: newUnitCategory });
    setUnits([...units, newUnit]);
    setNewUnitName(""); setNewUnitCode(""); setNewUnitCategory("custom"); setShowNewUnit(false);
    toast.success("Njësia u shtua");
  };

  const seedDefaultUnits = async () => {
    const existing = new Set(units.map(u => u.code?.toLowerCase()));
    const toAdd = DEFAULT_UNITS.filter(u => !existing.has(u.code?.toLowerCase()));
    if (toAdd.length === 0) { toast.info("Të gjitha njësitë standarde ekzistojnë tashmë"); return; }
    const created = await Promise.all(toAdd.map(u => base44.entities.Unit.create(u)));
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

  const seedDefaultCategories = async () => {
    const existing = new Set(categories.map(c => c.name.toLowerCase()));
    const toAdd = DEFAULT_EXPENSE_CATEGORIES.filter(c => !existing.has(c.name.toLowerCase()));
    if (toAdd.length === 0) { toast.info("Të gjitha kategoritë standarde ekzistojnë tashmë"); return; }
    const created = await Promise.all(toAdd.map(c => base44.entities.ExpenseCategory.create({ ...c, is_default: true })));
    setCategories([...categories, ...created]);
    toast.success(`U shtuan ${created.length} kategori standarde`);
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Fshi këtë kategori?")) return;
    await base44.entities.ExpenseCategory.delete(id);
    setCategories(categories.filter(c => c.id !== id));
    toast.success("Kategoria u fshi");
  };

  const seedDefaultServices = async () => {
    const existing = new Set(services.map(s => s.name.toLowerCase()));
    const toAdd = DEFAULT_SERVICE_CATEGORIES.filter(s => !existing.has(s.name.toLowerCase()));
    if (toAdd.length === 0) { toast.info("Të gjitha shërbimet standarde ekzistojnë tashmë"); return; }
    const created = await Promise.all(toAdd.map(s => base44.entities.ServiceCategory.create({ ...s, is_default: true })));
    setServices([...services, ...created]);
    toast.success(`U shtuan ${created.length} shërbime standarde`);
  };

  const addService = async () => {
    if (!newService.name.trim() || !newService.category) return;
    const created = await base44.entities.ServiceCategory.create(newService);
    setServices([...services, created]);
    setShowNewService(false);
    setNewService({ name: "", category: "", subcategory: "", billing_type: "one-time" });
    toast.success("Shërbimi u shtua");
  };

  const deleteService = async (id) => {
    if (!window.confirm("Fshi këtë shërbim?")) return;
    await base44.entities.ServiceCategory.delete(id);
    setServices(services.filter(s => s.id !== id));
    toast.success("Shërbimi u fshi");
  };

  const toggleFavoriteUnit = async (u) => {
    await base44.entities.Unit.update(u.id, { is_favorite: !u.is_favorite });
    setUnits(units.map(x => x.id === u.id ? { ...x, is_favorite: !x.is_favorite } : x));
  };

  const toggleFavoriteCategory = async (c) => {
    await base44.entities.ExpenseCategory.update(c.id, { is_favorite: !c.is_favorite });
    setCategories(categories.map(x => x.id === c.id ? { ...x, is_favorite: !x.is_favorite } : x));
  };

  const toggleFavoriteService = async (s) => {
    await base44.entities.ServiceCategory.update(s.id, { is_favorite: !s.is_favorite });
    setServices(services.map(x => x.id === s.id ? { ...x, is_favorite: !x.is_favorite } : x));
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
            <div><Label>Afati Default i Faturave (ditë)</Label><Input type="number" min="1" value={invoiceSettings?.default_due_days ?? 10} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, default_due_days: parseInt(e.target.value) || 10 })} className="mt-1.5" /><p className="text-xs text-muted-foreground mt-1">Afati për pagesën vendoset automatikisht kur krijohet fatura</p></div>
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
            <Input type="number" min="0" step="1" placeholder="50" value={cashboxForm.min_balance ?? 50} onChange={(e) => setCashboxForm({ ...cashboxForm, min_balance: parseFloat(e.target.value) || 0 })} className="mt-1.5" />
            <p className="text-xs text-muted-foreground mt-1">Njoftim dërgohet kur bilanci bie nën këtë vlerë</p>
          </div>
          <div>
            <Label>Email për Njoftim</Label>
            <Input type="email" placeholder="admin@company.com" value={cashboxForm.alert_email || ''} onChange={(e) => setCashboxForm({ ...cashboxForm, alert_email: e.target.value })} className="mt-1.5" />
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
          <input type="checkbox" id="notif-enabled" checked={cashboxForm.notifications_enabled ?? true} onChange={(e) => setCashboxForm({ ...cashboxForm, notifications_enabled: e.target.checked })} className="w-4 h-4 accent-primary" />
          <label htmlFor="notif-enabled" className="text-sm font-medium cursor-pointer">Aktivizo njoftimet automatike</label>
        </div>
        <Button onClick={handleSaveCashboxSettings} disabled={savingCashbox} className="w-full gap-2">
          {savingCashbox && <Loader2 className="w-4 h-4 animate-spin" />}
          {savingCashbox ? 'Duke ruajtur...' : 'Ruaj Cilësimet e Njoftimeve'}
        </Button>
      </div>

      {/* Njësitë e Matjes */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <h3 className="text-base font-semibold">Njësitë e Matjes</h3>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {[...units].sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0)).map(u => (
            <div key={u.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${CATEGORY_COLORS[u.category] || CATEGORY_COLORS.custom}`}>{u.code || u.name}</span>
                <span className="text-sm font-medium truncate">{u.name}</span>
                {u.category && <span className="text-xs text-muted-foreground hidden sm:inline">{CATEGORY_LABELS[u.category] || u.category}</span>}
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <button onClick={() => toggleFavoriteUnit(u)} className={u.is_favorite ? "text-amber-400" : "text-muted-foreground/30 hover:text-amber-400"}><Star className="w-4 h-4" fill={u.is_favorite ? "currentColor" : "none"} /></button>
                <button onClick={() => deleteUnit(u.id)} className="text-destructive/60 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
        {!showNewUnit ? (
          <div className="flex gap-2">
            <Button onClick={() => setShowNewUnit(true)} variant="outline" className="flex-1 gap-2"><Plus className="w-4 h-4" /> Njësi e Re</Button>
            <Button onClick={seedDefaultUnits} variant="outline" className="flex-1 gap-2 text-primary border-primary/30 hover:bg-primary/5">Shto Njësi Standarde</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Emri (Kilogram)" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} className="text-sm" />
              <Input placeholder="Kodi (kg)" value={newUnitCode} onChange={(e) => setNewUnitCode(e.target.value)} className="text-sm" />
            </div>
            <div className="flex gap-2">
              <select value={newUnitCategory} onChange={(e) => setNewUnitCategory(e.target.value)} className="flex-1 h-9 px-2 text-sm border border-input rounded-md bg-transparent">
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <Button size="sm" variant="outline" onClick={addUnit} className="px-3">✓ Shto</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowNewUnit(false); setNewUnitName(""); setNewUnitCode(""); }} className="px-2">✕</Button>
            </div>
          </div>
        )}
      </div>

      {/* Kategoriat e Shpenzimeve */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <h3 className="text-base font-semibold">Kategoriat e Shpenzimeve</h3>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {[...categories].sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0)).map(c => (
            <div key={c.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
              <div className="min-w-0 flex items-center gap-2">
                <span className="text-sm font-medium">{c.name}</span>
                {c.parent_category && <span className="text-xs text-muted-foreground">{c.parent_category}</span>}
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <button onClick={() => toggleFavoriteCategory(c)} className={c.is_favorite ? "text-amber-400" : "text-muted-foreground/30 hover:text-amber-400"}><Star className="w-4 h-4" fill={c.is_favorite ? "currentColor" : "none"} /></button>
                <button onClick={() => deleteCategory(c.id)} className="text-destructive/60 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
        {!showNewCategory ? (
          <div className="flex gap-2">
            <Button onClick={() => setShowNewCategory(true)} variant="outline" className="flex-1 gap-2"><Plus className="w-4 h-4" /> Kategori e Re</Button>
            <Button onClick={seedDefaultCategories} variant="outline" className="flex-1 gap-2 text-primary border-primary/30 hover:bg-primary/5">Shto Kategori Standarde</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input placeholder="Emri i kategorisë" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="text-sm" />
            <Button size="sm" variant="outline" onClick={addCategory} className="px-2">✓</Button>
            <Button size="sm" variant="outline" onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }} className="px-2">✕</Button>
          </div>
        )}
      </div>

      {/* Shërbimet & Llojet */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <h3 className="text-base font-semibold">Shërbimet & Llojet</h3>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {[...services].sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0)).map(s => (
            <div key={s.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-violet-100 text-violet-700">
                  {s.billing_type === "one-time" ? "1×" : s.billing_type === "recurring" ? "↻" : s.billing_type === "hourly" ? "h" : "P"}
                </span>
                <span className="text-sm font-medium truncate">{s.name}</span>
                <span className="text-xs text-muted-foreground hidden sm:inline shrink-0">{s.category}{s.subcategory ? " · " + s.subcategory : ""}</span>
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <button onClick={() => toggleFavoriteService(s)} className={s.is_favorite ? "text-amber-400" : "text-muted-foreground/30 hover:text-amber-400"}><Star className="w-4 h-4" fill={s.is_favorite ? "currentColor" : "none"} /></button>
                <button onClick={() => deleteService(s.id)} className="text-destructive/60 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
        {!showNewService ? (
          <div className="flex gap-2">
            <Button onClick={() => setShowNewService(true)} variant="outline" className="flex-1 gap-2"><Plus className="w-4 h-4" /> Shërbim i Ri</Button>
            <Button onClick={seedDefaultServices} variant="outline" className="flex-1 gap-2 text-primary border-primary/30 hover:bg-primary/5">Shto Shërbime Standarde</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Input placeholder="Emri i shërbimit *" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} className="text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Kategoria *" value={newService.category} onChange={(e) => setNewService({ ...newService, category: e.target.value })} className="text-sm" />
              <Input placeholder="Nënkategoria" value={newService.subcategory} onChange={(e) => setNewService({ ...newService, subcategory: e.target.value })} className="text-sm" />
            </div>
            <div className="flex gap-2">
              <select value={newService.billing_type} onChange={(e) => setNewService({ ...newService, billing_type: e.target.value })} className="flex-1 h-9 px-2 text-sm border border-input rounded-md bg-transparent">
                <option value="one-time">Njëherësh</option>
                <option value="recurring">Periodike</option>
                <option value="hourly">Orare</option>
                <option value="project">Projekt</option>
              </select>
              <Button size="sm" variant="outline" onClick={addService} className="px-3">✓ Shto</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowNewService(false); setNewService({ name: "", category: "", subcategory: "", billing_type: "one-time" }); }} className="px-2">✕</Button>
            </div>
          </div>
        )}
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