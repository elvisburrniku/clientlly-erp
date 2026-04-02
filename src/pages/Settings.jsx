import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Loader2, Plus, Trash2, BellRing } from "lucide-react";

const DEFAULT_UNITS = [
  { name: "Piece", code: "pcs", category: "products", is_default: true },
  { name: "Unit", code: "unit", category: "products", is_default: true },
  { name: "Pack", code: "pack", category: "products", is_default: true },
  { name: "Box", code: "box", category: "products", is_default: true },
  { name: "Set", code: "set", category: "products", is_default: true },
  { name: "Pair", code: "pair", category: "products", is_default: true },
  { name: "Kilogram", code: "kg", category: "weight", is_default: true },
  { name: "Gram", code: "g", category: "weight", is_default: true },
  { name: "Ton", code: "ton", category: "weight", is_default: true },
  { name: "Liter", code: "l", category: "volume", is_default: true },
  { name: "Milliliter", code: "ml", category: "volume", is_default: true },
  { name: "Meter", code: "m", category: "length", is_default: true },
  { name: "Centimeter", code: "cm", category: "length", is_default: true },
  { name: "Square Meter", code: "m2", category: "length", is_default: true },
  { name: "Cubic Meter", code: "m3", category: "length", is_default: true },
  { name: "Kilometer", code: "km", category: "logistics", is_default: true },
  { name: "Hour", code: "hr", category: "time", is_default: true },
  { name: "Day", code: "day", category: "time", is_default: true },
  { name: "Week", code: "week", category: "time", is_default: true },
  { name: "Month", code: "month", category: "time", is_default: true },
  { name: "Year", code: "year", category: "time", is_default: true },
  { name: "Project", code: "project", category: "time", is_default: true },
  { name: "Service", code: "service", category: "time", is_default: true },
  { name: "User", code: "user", category: "it_saas", is_default: true },
  { name: "License", code: "license", category: "it_saas", is_default: true },
  { name: "Subscription", code: "sub", category: "it_saas", is_default: true },
  { name: "Module", code: "module", category: "it_saas", is_default: true },
  { name: "API Request", code: "api_req", category: "it_saas", is_default: true },
  { name: "Gigabyte", code: "GB", category: "it_saas", is_default: true },
  { name: "Megabyte", code: "MB", category: "it_saas", is_default: true },
  { name: "Shipment", code: "ship", category: "logistics", is_default: true },
  { name: "Pallet", code: "pallet", category: "logistics", is_default: true },
  { name: "Container", code: "cont", category: "logistics", is_default: true },
  { name: "Contract", code: "contract", category: "business", is_default: true },
  { name: "Transaction", code: "txn", category: "business", is_default: true },
  { name: "Fee", code: "fee", category: "business", is_default: true },
  { name: "Percentage", code: "%", category: "business", is_default: true },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Rent", parent_category: "Operating Expenses", type: "fixed" },
  { name: "Electricity", parent_category: "Operating Expenses", type: "fixed" },
  { name: "Water", parent_category: "Operating Expenses", type: "fixed" },
  { name: "Internet & Phone", parent_category: "Operating Expenses", type: "fixed" },
  { name: "Office Maintenance", parent_category: "Operating Expenses", type: "variable" },
  { name: "Salaries", parent_category: "Payroll & HR", type: "fixed" },
  { name: "Bonuses", parent_category: "Payroll & HR", type: "variable" },
  { name: "Employee Benefits", parent_category: "Payroll & HR", type: "fixed" },
  { name: "Training", parent_category: "Payroll & HR", type: "variable" },
  { name: "Recruitment", parent_category: "Payroll & HR", type: "one-time" },
  { name: "Online Ads", parent_category: "Marketing & Advertising", type: "variable" },
  { name: "Branding", parent_category: "Marketing & Advertising", type: "one-time" },
  { name: "Graphic Design", parent_category: "Marketing & Advertising", type: "variable" },
  { name: "Events & Promotions", parent_category: "Marketing & Advertising", type: "one-time" },
  { name: "Fuel", parent_category: "Transport & Logistics", type: "variable" },
  { name: "Transportation", parent_category: "Transport & Logistics", type: "variable" },
  { name: "Shipping", parent_category: "Transport & Logistics", type: "variable" },
  { name: "Vehicle Maintenance", parent_category: "Transport & Logistics", type: "variable" },
  { name: "Equipment Purchase", parent_category: "Equipment & Assets", type: "one-time" },
  { name: "Office Furniture", parent_category: "Equipment & Assets", type: "one-time" },
  { name: "Computers & Hardware", parent_category: "Equipment & Assets", type: "one-time" },
  { name: "Tools", parent_category: "Equipment & Assets", type: "one-time" },
  { name: "SaaS Subscriptions", parent_category: "Software & IT", type: "fixed" },
  { name: "Hosting", parent_category: "Software & IT", type: "fixed" },
  { name: "Domain", parent_category: "Software & IT", type: "fixed" },
  { name: "Software Licenses", parent_category: "Software & IT", type: "fixed" },
  { name: "Development Costs", parent_category: "Software & IT", type: "variable" },
  { name: "Bank Fees", parent_category: "Financial Expenses", type: "variable" },
  { name: "Interest", parent_category: "Financial Expenses", type: "fixed" },
  { name: "Loan Payments", parent_category: "Financial Expenses", type: "fixed" },
  { name: "Transaction Fees", parent_category: "Financial Expenses", type: "variable" },
  { name: "Legal Services", parent_category: "Legal & Professional", type: "variable" },
  { name: "Accounting", parent_category: "Legal & Professional", type: "fixed" },
  { name: "Consulting", parent_category: "Legal & Professional", type: "variable" },
  { name: "Audit", parent_category: "Legal & Professional", type: "one-time" },
  { name: "Office Supplies", parent_category: "Supplies", type: "variable" },
  { name: "Consumables", parent_category: "Supplies", type: "variable" },
  { name: "Cleaning Supplies", parent_category: "Supplies", type: "variable" },
  { name: "Raw Materials", parent_category: "COGS", type: "variable" },
  { name: "Production Costs", parent_category: "COGS", type: "variable" },
  { name: "Packaging", parent_category: "COGS", type: "variable" },
  { name: "Business Insurance", parent_category: "Insurance & Health", type: "fixed" },
  { name: "Health Insurance", parent_category: "Insurance & Health", type: "fixed" },
  { name: "Vehicle Insurance", parent_category: "Insurance & Health", type: "fixed" },
  { name: "Courses", parent_category: "Education & Development", type: "variable" },
  { name: "Seminars", parent_category: "Education & Development", type: "one-time" },
  { name: "Books", parent_category: "Education & Development", type: "variable" },
  { name: "Flights", parent_category: "Travel & Entertainment", type: "variable" },
  { name: "Hotels", parent_category: "Travel & Entertainment", type: "variable" },
  { name: "Meals", parent_category: "Travel & Entertainment", type: "variable" },
  { name: "Client Meetings", parent_category: "Travel & Entertainment", type: "variable" },
  { name: "VAT", parent_category: "Taxes & Government", type: "variable" },
  { name: "Corporate Tax", parent_category: "Taxes & Government", type: "fixed" },
  { name: "Local Taxes", parent_category: "Taxes & Government", type: "fixed" },
  { name: "Repairs", parent_category: "Maintenance & Repairs", type: "variable" },
  { name: "Equipment Servicing", parent_category: "Maintenance & Repairs", type: "variable" },
  { name: "Technical Maintenance", parent_category: "Maintenance & Repairs", type: "variable" },
  { name: "Asset Depreciation", parent_category: "Depreciation", type: "fixed" },
  { name: "Vehicle Depreciation", parent_category: "Depreciation", type: "fixed" },
];

const DEFAULT_SERVICE_CATEGORIES = [
  { name: "Software Development", category: "IT & Software", subcategory: "", billing_type: "project" },
  { name: "System Maintenance", category: "IT & Software", subcategory: "", billing_type: "recurring" },
  { name: "Technical Support", category: "IT & Software", subcategory: "", billing_type: "hourly" },
  { name: "Hosting", category: "IT & Software", subcategory: "", billing_type: "recurring" },
  { name: "API Integration", category: "IT & Software", subcategory: "", billing_type: "project" },
  { name: "Graphic Design", category: "Design & Creative", subcategory: "", billing_type: "project" },
  { name: "Branding", category: "Design & Creative", subcategory: "", billing_type: "project" },
  { name: "UI/UX Design", category: "Design & Creative", subcategory: "", billing_type: "project" },
  { name: "Video Editing", category: "Design & Creative", subcategory: "", billing_type: "hourly" },
  { name: "Social Media Management", category: "Marketing", subcategory: "", billing_type: "recurring" },
  { name: "Paid Ads (Facebook, Google)", category: "Marketing", subcategory: "", billing_type: "recurring" },
  { name: "SEO", category: "Marketing", subcategory: "", billing_type: "recurring" },
  { name: "Content Creation", category: "Marketing", subcategory: "", billing_type: "project" },
  { name: "Consulting", category: "Business & Professional", subcategory: "", billing_type: "hourly" },
  { name: "Accounting", category: "Business & Professional", subcategory: "", billing_type: "recurring" },
  { name: "Legal Services", category: "Business & Professional", subcategory: "", billing_type: "hourly" },
  { name: "Audit", category: "Business & Professional", subcategory: "", billing_type: "one-time" },
  { name: "Shipping", category: "Transport & Logistics", subcategory: "", billing_type: "one-time" },
  { name: "Transportation", category: "Transport & Logistics", subcategory: "", billing_type: "one-time" },
  { name: "Storage", category: "Transport & Logistics", subcategory: "", billing_type: "recurring" },
  { name: "Equipment Repair", category: "Maintenance & Repairs", subcategory: "", billing_type: "one-time" },
  { name: "Technical Maintenance", category: "Maintenance & Repairs", subcategory: "", billing_type: "recurring" },
  { name: "Facility Maintenance", category: "Maintenance & Repairs", subcategory: "", billing_type: "recurring" },
  { name: "Surface Disinfection", category: "Pest Control Services", subcategory: "Disinfection", billing_type: "one-time" },
  { name: "Air Disinfection", category: "Pest Control Services", subcategory: "Disinfection", billing_type: "one-time" },
  { name: "Industrial Disinfection", category: "Pest Control Services", subcategory: "Disinfection", billing_type: "one-time" },
  { name: "Residential Disinfection", category: "Pest Control Services", subcategory: "Disinfection", billing_type: "one-time" },
  { name: "Flying Insects (flies, mosquitoes)", category: "Pest Control Services", subcategory: "Disinsection", billing_type: "one-time" },
  { name: "Crawling Insects (cockroaches, ants)", category: "Pest Control Services", subcategory: "Disinsection", billing_type: "one-time" },
  { name: "Bed Bugs Treatment", category: "Pest Control Services", subcategory: "Disinsection", billing_type: "one-time" },
  { name: "Wasps & Bees Control", category: "Pest Control Services", subcategory: "Disinsection", billing_type: "one-time" },
  { name: "Mice Control", category: "Pest Control Services", subcategory: "Deratization", billing_type: "one-time" },
  { name: "Rat Control", category: "Pest Control Services", subcategory: "Deratization", billing_type: "one-time" },
  { name: "Rodent Monitoring & Prevention", category: "Pest Control Services", subcategory: "Deratization", billing_type: "recurring" },
  { name: "Birds Control (pigeons)", category: "Pest Control Services", subcategory: "Other Pest", billing_type: "one-time" },
  { name: "Reptiles Control", category: "Pest Control Services", subcategory: "Other Pest", billing_type: "one-time" },
  { name: "Wildlife Control", category: "Pest Control Services", subcategory: "Other Pest", billing_type: "one-time" },
  { name: "Snakes Control", category: "Pest Control Services", subcategory: "Other Pest", billing_type: "one-time" },
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
      setCategories(cats);
      setUser(u);
      if (temps.length > 0) { setTemplate(temps[0]); setForm(temps[0]); }
      else setForm({ company_name: '', company_email: '', company_phone: '', company_address: '', logo_url: '', primary_color: '#4338CA', footer_text: '' });
      if (invSets.length > 0) setInvoiceSettings(invSets[0]);
      if (cbSets.length > 0) { setCashboxSettings(cbSets[0]); setCashboxForm(cbSets[0]); }

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
          {units.map(u => (
            <div key={u.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${CATEGORY_COLORS[u.category] || CATEGORY_COLORS.custom}`}>{u.code || u.name}</span>
                <span className="text-sm font-medium truncate">{u.name}</span>
                {u.category && <span className="text-xs text-muted-foreground hidden sm:inline">{CATEGORY_LABELS[u.category] || u.category}</span>}
              </div>
              <button onClick={() => deleteUnit(u.id)} className="text-destructive/60 hover:text-destructive ml-2 shrink-0"><Trash2 className="w-4 h-4" /></button>
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
          {categories.map(c => (
            <div key={c.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
              <div className="min-w-0">
                <span className="text-sm font-medium">{c.name}</span>
                {c.parent_category && <span className="text-xs text-muted-foreground ml-2">{c.parent_category}</span>}
              </div>
              <button onClick={() => deleteCategory(c.id)} className="text-destructive/60 hover:text-destructive ml-2 shrink-0"><Trash2 className="w-4 h-4" /></button>
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
          {services.map(s => (
            <div key={s.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-violet-100 text-violet-700">
                  {s.billing_type === "one-time" ? "1×" : s.billing_type === "recurring" ? "↻" : s.billing_type === "hourly" ? "h" : "P"}
                </span>
                <span className="text-sm font-medium truncate">{s.name}</span>
                <span className="text-xs text-muted-foreground hidden sm:inline shrink-0">{s.category}{s.subcategory ? " · " + s.subcategory : ""}</span>
              </div>
              <button onClick={() => deleteService(s.id)} className="text-destructive/60 hover:text-destructive ml-2 shrink-0"><Trash2 className="w-4 h-4" /></button>
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