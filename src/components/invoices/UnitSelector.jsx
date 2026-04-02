import { useState, useRef, useEffect } from "react";
import { Search, Plus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const CATEGORY_LABELS = {
  products: "Produkte",
  weight: "Peshë",
  volume: "Vëllim",
  length: "Gjatësi / Sipërfaqe",
  time: "Kohë / Shërbime",
  it_saas: "IT / SaaS",
  logistics: "Logjistikë",
  business: "Biznes",
  custom: "Të personalizuara",
};

const CATEGORY_COLORS = {
  products: "bg-slate-100 text-slate-700",
  weight: "bg-amber-100 text-amber-700",
  volume: "bg-blue-100 text-blue-700",
  length: "bg-emerald-100 text-emerald-700",
  time: "bg-rose-100 text-rose-700",
  it_saas: "bg-violet-100 text-violet-700",
  logistics: "bg-orange-100 text-orange-700",
  business: "bg-cyan-100 text-cyan-700",
  custom: "bg-pink-100 text-pink-700",
};

export default function UnitSelector({ value, onChange, units, onUnitsChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newUnit, setNewUnit] = useState({ name: "", code: "", category: "custom" });
  const [adding, setAdding] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = query
    ? units.filter(u => u.name.toLowerCase().includes(query.toLowerCase()) || u.code.toLowerCase().includes(query.toLowerCase()))
    : units;

  const grouped = filtered.reduce((acc, u) => {
    const cat = u.category || "custom";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(u);
    return acc;
  }, {});

  const selected = units.find(u => u.code === value || u.name === value);

  const handleSelect = (unit) => {
    onChange(unit.code || unit.name);
    setOpen(false);
    setQuery("");
  };

  const handleAdd = async () => {
    if (!newUnit.name.trim() || !newUnit.code.trim()) return;
    setAdding(true);
    const created = await base44.entities.Unit.create({ ...newUnit });
    onUnitsChange([...units, created]);
    onChange(created.code);
    setShowAdd(false);
    setNewUnit({ name: "", code: "", category: "custom" });
    setAdding(false);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setQuery(""); }}
        className={cn(
          "w-full flex items-center justify-between gap-2 h-9 px-3 rounded-md border border-input bg-transparent text-sm shadow-sm transition-colors hover:bg-accent",
          open && "ring-1 ring-ring border-ring"
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", CATEGORY_COLORS[selected.category || "custom"])}>
                {selected.code}
              </span>
              <span className="truncate text-foreground">{selected.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{value || "Zgjedh njësinë..."}</span>
          )}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 w-72 mt-1 bg-white border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Kërko njësinë..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Groups */}
          <div className="max-h-64 overflow-y-auto">
            {Object.entries(grouped).map(([cat, catUnits]) => (
              <div key={cat}>
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/30">
                  {CATEGORY_LABELS[cat] || cat}
                </div>
                {catUnits.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelect(u)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-primary/5 transition-colors text-left",
                      (value === u.code || value === u.name) && "bg-primary/10 font-semibold text-primary"
                    )}
                  >
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 min-w-[28px] text-center", CATEGORY_COLORS[u.category || "custom"])}>
                      {u.code}
                    </span>
                    <span className="flex-1">{u.name}</span>
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">Nuk u gjet asnjë njësi</div>
            )}
          </div>

          {/* Add custom */}
          <div className="border-t border-border p-2">
            {!showAdd ? (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Shto njësi të re
              </button>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    className="h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Emri (p.sh. Kilogram)"
                    value={newUnit.name}
                    onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                  />
                  <input
                    className="h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Kodi (p.sh. kg)"
                    value={newUnit.code}
                    onChange={(e) => setNewUnit({ ...newUnit, code: e.target.value })}
                  />
                </div>
                <select
                  className="w-full h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none focus:ring-1 focus:ring-ring"
                  value={newUnit.category}
                  onChange={(e) => setNewUnit({ ...newUnit, category: e.target.value })}
                >
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={adding || !newUnit.name || !newUnit.code}
                    className="flex-1 h-8 text-sm bg-primary text-primary-foreground rounded-md font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                  >
                    {adding ? "Duke shtuar..." : "Shto"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAdd(false); setNewUnit({ name: "", code: "", category: "custom" }); }}
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