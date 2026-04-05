import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

export default function TaxRateSelector({ value, onChange, taxRates, onTaxRatesChange }) {
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newRate, setNewRate] = useState({ name: "", rate: "", is_inclusive: false });
  const [adding, setAdding] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = taxRates.find(t => t.rate === value || String(t.rate) === String(value));

  const handleSelect = (taxRate) => {
    onChange(parseFloat(taxRate.rate));
    setOpen(false);
  };

  const handleAdd = async () => {
    if (!newRate.name.trim() || newRate.rate === "") return;
    setAdding(true);
    const created = await base44.entities.TaxRate.create({
      name: newRate.name,
      rate: parseFloat(newRate.rate),
      is_inclusive: newRate.is_inclusive,
    });
    onTaxRatesChange([...taxRates, created]);
    onChange(parseFloat(created.rate));
    setShowAdd(false);
    setNewRate({ name: "", rate: "", is_inclusive: false });
    setAdding(false);
    setOpen(false);
  };

  const displayLabel = selected
    ? `${selected.rate}% ${selected.is_inclusive ? "(inc.)" : "(exc.)"}`
    : `${value}%`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(!open); }}
        className={cn(
          "w-full flex items-center justify-between gap-2 h-9 px-3 rounded-md border border-input bg-transparent text-sm shadow-sm transition-colors hover:bg-accent",
          open && "ring-1 ring-ring border-ring"
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 shrink-0">
            TVSH
          </span>
          <span className="text-foreground">{displayLabel}</span>
        </span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 w-64 mt-1 bg-white border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="p-1.5 space-y-0.5 max-h-48 overflow-y-auto">
            {taxRates.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-3">
                Nuk ka norma TVSH. Shto njërën.
              </div>
            )}
            {taxRates.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelect(t)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-muted/60 transition-colors text-left",
                  selected?.id === t.id && "bg-primary/10 text-primary font-medium"
                )}
              >
                <span className="font-medium">{t.name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                    {t.rate}%
                  </span>
                  <span className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                    t.is_inclusive
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700"
                  )}>
                    {t.is_inclusive ? "INC" : "EXC"}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-border p-2">
            {!showAdd ? (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Shto normë të re
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  className="w-full h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Emri (p.sh. TVSH 20%)"
                  value={newRate.name}
                  onChange={(e) => setNewRate({ ...newRate, name: e.target.value })}
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Norma % (p.sh. 20)"
                  value={newRate.rate}
                  onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })}
                />
                <select
                  className="w-full h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none focus:ring-1 focus:ring-ring"
                  value={newRate.is_inclusive ? "inclusive" : "exclusive"}
                  onChange={(e) => setNewRate({ ...newRate, is_inclusive: e.target.value === "inclusive" })}
                >
                  <option value="exclusive">Exclusive – TVSH shtohet sipër çmimit</option>
                  <option value="inclusive">Inclusive – TVSH e përfshirë në çmim</option>
                </select>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={adding || !newRate.name || newRate.rate === ""}
                    className="flex-1 h-8 text-sm bg-primary text-primary-foreground rounded-md font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                  >
                    {adding ? "Duke shtuar..." : "Shto"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAdd(false); setNewRate({ name: "", rate: "", is_inclusive: false }); }}
                    className="flex-1 h-8 text-sm border border-input rounded-md hover:bg-muted transition-colors"
                  >
                    Anulo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
