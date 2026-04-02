import { useState, useRef, useEffect } from "react";
import { Search, Plus, ChevronDown, Bug, Zap, Palette, Megaphone, Briefcase, Truck, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const BILLING_LABELS = { "one-time": "1×", "recurring": "↻", "hourly": "h", "project": "P" };
const BILLING_COLORS = { "one-time": "bg-slate-100 text-slate-700", "recurring": "bg-blue-100 text-blue-700", "hourly": "bg-amber-100 text-amber-700", "project": "bg-violet-100 text-violet-700" };

const CATEGORY_ICONS = {
  "IT & Software": <Zap className="w-3 h-3" />,
  "Design & Creative": <Palette className="w-3 h-3" />,
  "Marketing": <Megaphone className="w-3 h-3" />,
  "Business & Professional": <Briefcase className="w-3 h-3" />,
  "Transport & Logistics": <Truck className="w-3 h-3" />,
  "Maintenance & Repairs": <Wrench className="w-3 h-3" />,
  "Pest Control Services": <Bug className="w-3 h-3" />,
};

export default function ServiceSelector({ value, onChange, services, onServicesChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newSvc, setNewSvc] = useState({ name: "", category: "", subcategory: "", billing_type: "one-time" });
  const [adding, setAdding] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = query
    ? services.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        (s.category || "").toLowerCase().includes(query.toLowerCase()) ||
        (s.subcategory || "").toLowerCase().includes(query.toLowerCase())
      )
    : services;

  const grouped = filtered.reduce((acc, s) => {
    const grp = s.category || "Tjera";
    if (!acc[grp]) acc[grp] = {};
    const sub = s.subcategory || "";
    if (!acc[grp][sub]) acc[grp][sub] = [];
    acc[grp][sub].push(s);
    return acc;
  }, {});

  const selected = services.find(s => s.id === value);
  const allCategories = [...new Set(services.map(s => s.category).filter(Boolean))];
  const allSubcategories = [...new Set(services.filter(s => s.category === newSvc.category).map(s => s.subcategory).filter(Boolean))];

  const handleSelect = (svc) => {
    onChange(svc.id, svc.name, svc);
    setOpen(false);
    setQuery("");
  };

  const handleAdd = async () => {
    if (!newSvc.name.trim() || !newSvc.category) return;
    setAdding(true);
    const created = await base44.entities.ServiceCategory.create({ ...newSvc });
    onServicesChange([...services, created]);
    onChange(created.id, created.name, created);
    setShowAdd(false);
    setNewSvc({ name: "", category: "", subcategory: "", billing_type: "one-time" });
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
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", BILLING_COLORS[selected.billing_type || "one-time"])}>
                {BILLING_LABELS[selected.billing_type || "one-time"]}
              </span>
              <span className="truncate text-foreground">{selected.name}</span>
              {selected.category && <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">· {selected.category}</span>}
            </>
          ) : (
            <span className="text-muted-foreground">Zgjedh shërbimin...</span>
          )}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 w-96 mt-1 bg-white border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Kërko shërbimin..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {Object.entries(grouped).map(([grp, subs]) => (
              <div key={grp}>
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/30 sticky top-0 flex items-center gap-1.5">
                  {CATEGORY_ICONS[grp] || <Briefcase className="w-3 h-3" />}
                  {grp}
                </div>
                {Object.entries(subs).map(([sub, svcs]) => (
                  <div key={sub}>
                    {sub && (
                      <div className="px-4 py-1 text-[10px] font-semibold text-muted-foreground/70 italic">
                        {sub}
                      </div>
                    )}
                    {svcs.map(svc => (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => handleSelect(svc)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-primary/5 transition-colors text-left",
                          value === svc.id && "bg-primary/10 font-semibold text-primary"
                        )}
                      >
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", BILLING_COLORS[svc.billing_type || "one-time"])}>
                          {BILLING_LABELS[svc.billing_type || "one-time"]}
                        </span>
                        <span className="flex-1">{svc.name}</span>
                        {svc.default_price > 0 && (
                          <span className="text-xs text-muted-foreground shrink-0">€{svc.default_price}</span>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">Nuk u gjet asnjë shërbim</div>
            )}
          </div>

          <div className="border-t border-border p-2">
            {!showAdd ? (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Shto shërbim të ri
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  className="w-full h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Emri i shërbimit *"
                  value={newSvc.name}
                  onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    className="h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none"
                    value={newSvc.category}
                    onChange={(e) => setNewSvc({ ...newSvc, category: e.target.value, subcategory: "" })}
                  >
                    <option value="">Kategoria *</option>
                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__new__">+ Tjetër...</option>
                  </select>
                  <select
                    className="h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none"
                    value={newSvc.subcategory}
                    onChange={(e) => setNewSvc({ ...newSvc, subcategory: e.target.value })}
                  >
                    <option value="">Nënkategoria</option>
                    {allSubcategories.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {newSvc.category === "__new__" && (
                  <input
                    className="w-full h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Emri i kategorisë së re"
                    onChange={(e) => setNewSvc({ ...newSvc, category: e.target.value })}
                  />
                )}
                <select
                  className="w-full h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none"
                  value={newSvc.billing_type}
                  onChange={(e) => setNewSvc({ ...newSvc, billing_type: e.target.value })}
                >
                  <option value="one-time">Njëherësh</option>
                  <option value="recurring">Periodike</option>
                  <option value="hourly">Orare</option>
                  <option value="project">Projekt</option>
                </select>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={adding || !newSvc.name || !newSvc.category || newSvc.category === "__new__"}
                    className="flex-1 h-8 text-sm bg-primary text-primary-foreground rounded-md font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                  >
                    {adding ? "Duke shtuar..." : "Shto"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAdd(false); setNewSvc({ name: "", category: "", subcategory: "", billing_type: "one-time" }); }}
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