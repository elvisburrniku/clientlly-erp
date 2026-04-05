import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

const COUNTRY_TAX_RATES = {
  sq: {
    country: "Shqipëri",
    rates: [
      { name: "Pa TVSH (0%)", rate: 0, is_inclusive: false },
      { name: "TVSH e Reduktuar 6%", rate: 6, is_inclusive: false },
      { name: "TVSH Standarde 20%", rate: 20, is_inclusive: false },
    ],
  },
  en: {
    country: "United Kingdom",
    rates: [
      { name: "Zero Rate (0%)", rate: 0, is_inclusive: false },
      { name: "Reduced Rate (5%)", rate: 5, is_inclusive: false },
      { name: "Standard Rate (20%)", rate: 20, is_inclusive: false },
    ],
  },
  de: {
    country: "Deutschland",
    rates: [
      { name: "Steuerfrei (0%)", rate: 0, is_inclusive: false },
      { name: "Ermäßigter Steuersatz (7%)", rate: 7, is_inclusive: false },
      { name: "Regelsteuersatz (19%)", rate: 19, is_inclusive: false },
    ],
  },
  es: {
    country: "España",
    rates: [
      { name: "Exento (0%)", rate: 0, is_inclusive: false },
      { name: "Tipo Superreducido (4%)", rate: 4, is_inclusive: false },
      { name: "Tipo Reducido (10%)", rate: 10, is_inclusive: false },
      { name: "Tipo General (21%)", rate: 21, is_inclusive: false },
    ],
  },
  mk: {
    country: "Северна Македонија",
    rates: [
      { name: "Без ДДВ (0%)", rate: 0, is_inclusive: false },
      { name: "Намален ДДВ (5%)", rate: 5, is_inclusive: false },
      { name: "Стандарден ДДВ (18%)", rate: 18, is_inclusive: false },
    ],
  },
  default: {
    country: "Standard",
    rates: [
      { name: "Tax Exempt (0%)", rate: 0, is_inclusive: false },
      { name: "Reduced Rate (10%)", rate: 10, is_inclusive: false },
      { name: "Standard Rate (20%)", rate: 20, is_inclusive: false },
    ],
  },
};

export default function TaxRates() {
  const { language } = useLanguage();
  const [taxRates, setTaxRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [newRate, setNewRate] = useState({ name: "", rate: "", is_inclusive: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.TaxRate.list('-created_date', 100)
      .then(setTaxRates)
      .catch(() => setTaxRates([]))
      .finally(() => setLoading(false));
  }, []);

  const countryData = COUNTRY_TAX_RATES[language] || COUNTRY_TAX_RATES.default;

  const addRate = async () => {
    if (!newRate.name.trim() || newRate.rate === "") return;
    setSaving(true);
    const created = await base44.entities.TaxRate.create({
      name: newRate.name,
      rate: parseFloat(newRate.rate),
      is_inclusive: newRate.is_inclusive,
    });
    setTaxRates([...taxRates, created]);
    setNewRate({ name: "", rate: "", is_inclusive: false });
    setShowNew(false);
    setSaving(false);
    toast.success("Norma TVSH u shtua");
  };

  const updateRate = async () => {
    if (!editingRate || !editingRate.name.trim() || editingRate.rate === "") return;
    setSaving(true);
    const updated = await base44.entities.TaxRate.update(editingRate.id, {
      name: editingRate.name,
      rate: parseFloat(editingRate.rate),
      is_inclusive: editingRate.is_inclusive,
    });
    setTaxRates(taxRates.map(t => t.id === editingRate.id ? { ...t, ...updated } : t));
    setEditingRate(null);
    setSaving(false);
    toast.success("Norma TVSH u përditësua");
  };

  const deleteRate = async (id) => {
    if (!window.confirm("Fshi këtë normë TVSH?")) return;
    await base44.entities.TaxRate.delete(id);
    setTaxRates(taxRates.filter(t => t.id !== id));
    toast.success("Norma TVSH u fshi");
  };

  const seedDefaults = async () => {
    const existing = new Set(taxRates.map(t => parseFloat(t.rate)));
    const toAdd = countryData.rates.filter(d => !existing.has(d.rate));
    if (toAdd.length === 0) { toast.info("Të gjitha normat standarde ekzistojnë tashmë"); return; }
    const created = await Promise.all(toAdd.map(d => base44.entities.TaxRate.create(d)));
    setTaxRates([...taxRates, ...created]);
    toast.success(`U shtuan ${created.length} norma standarde për ${countryData.country}`);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Normat e TVSH-së</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Menaxho normat e TVSH-së — këto shfaqen në faturë gjatë krijimit dhe editimit
          </p>
        </div>
        <Button onClick={seedDefaults} variant="outline" className="gap-2 text-primary border-primary/30 hover:bg-primary/5">
          Shto Standarde ({countryData.country})
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
        {taxRates.length === 0 && !showNew && (
          <div className="p-12 text-center">
            <p className="text-muted-foreground text-sm mb-4">
              Nuk ka norma TVSH. Shto njërën manualisht ose përdor normat standarde.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setShowNew(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Normë e Re
              </Button>
              <Button onClick={seedDefaults} variant="outline" className="gap-2">
                Shto Standarde ({countryData.country})
              </Button>
            </div>
          </div>
        )}

        {taxRates.map(t => (
          <div key={t.id}>
            {editingRate?.id === t.id ? (
              <div className="p-4 space-y-3 bg-muted/20">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Emri (p.sh. TVSH 20%)"
                    value={editingRate.name}
                    onChange={(e) => setEditingRate({ ...editingRate, name: e.target.value })}
                  />
                  <Input
                    type="number" min="0" max="100" step="0.01"
                    placeholder="Norma %"
                    value={editingRate.rate}
                    onChange={(e) => setEditingRate({ ...editingRate, rate: e.target.value })}
                  />
                </div>
                <select
                  value={editingRate.is_inclusive ? "inclusive" : "exclusive"}
                  onChange={(e) => setEditingRate({ ...editingRate, is_inclusive: e.target.value === "inclusive" })}
                  className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background"
                >
                  <option value="exclusive">Exclusive – TVSH shtohet sipër çmimit (p.sh. 100€ + 20% = 120€)</option>
                  <option value="inclusive">Inclusive – TVSH e përfshirë në çmim (p.sh. 120€ përfshin 20% TVSH)</option>
                </select>
                <div className="flex gap-2">
                  <Button size="sm" onClick={updateRate} disabled={saving} className="gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Ruaj
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingRate(null)}>
                    <X className="w-3.5 h-3.5" /> Anulo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold px-2 py-1 rounded bg-blue-100 text-blue-700 min-w-[48px] text-center">
                    {t.rate}%
                  </span>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.is_inclusive
                        ? "Inclusive — çmimi e përfshin TVSH-në"
                        : "Exclusive — TVSH shtohet sipër çmimit"}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-1 ${
                    t.is_inclusive ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {t.is_inclusive ? "INC" : "EXC"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setEditingRate({ ...t })}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteRate(t.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {showNew && (
          <div className="p-4 space-y-3 bg-muted/20">
            <p className="text-sm font-semibold">Normë e Re TVSH</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Emri (p.sh. TVSH 20%)"
                value={newRate.name}
                onChange={(e) => setNewRate({ ...newRate, name: e.target.value })}
              />
              <Input
                type="number" min="0" max="100" step="0.01"
                placeholder="Norma % (p.sh. 20)"
                value={newRate.rate}
                onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })}
              />
            </div>
            <select
              value={newRate.is_inclusive ? "inclusive" : "exclusive"}
              onChange={(e) => setNewRate({ ...newRate, is_inclusive: e.target.value === "inclusive" })}
              className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background"
            >
              <option value="exclusive">Exclusive – TVSH shtohet sipër çmimit (p.sh. 100€ + 20% = 120€)</option>
              <option value="inclusive">Inclusive – TVSH e përfshirë në çmim (p.sh. 120€ përfshin 20% TVSH)</option>
            </select>
            <div className="flex gap-2">
              <Button size="sm" onClick={addRate} disabled={saving || !newRate.name || newRate.rate === ""} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Shto
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowNew(false); setNewRate({ name: "", rate: "", is_inclusive: false }); }}>
                <X className="w-3.5 h-3.5" /> Anulo
              </Button>
            </div>
          </div>
        )}
      </div>

      {(taxRates.length > 0 || !showNew) && (
        <Button onClick={() => setShowNew(true)} variant="outline" className="gap-2 w-full border-dashed">
          <Plus className="w-4 h-4" /> Normë e Re TVSH
        </Button>
      )}
    </div>
  );
}
