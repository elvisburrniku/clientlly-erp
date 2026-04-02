import { useState, useRef, useEffect } from "react";
import { Search, Plus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const TYPE_LABELS = { fixed: "Fikse", variable: "Variabël", "one-time": "Njëherësh" };
const TYPE_COLORS = { fixed: "bg-blue-100 text-blue-700", variable: "bg-amber-100 text-amber-700", "one-time": "bg-rose-100 text-rose-700" };

export default function CategorySelector({ value, onChange, categories, onCategoriesChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", parent_category: "", type: "variable" });
  const [adding, setAdding] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = query
    ? categories.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || (c.parent_category || "").toLowerCase().includes(query.toLowerCase()))
    : categories;

  const grouped = filtered.reduce((acc, c) => {
    const grp = c.parent_category || "Tjera";
    if (!acc[grp]) acc[grp] = [];
    acc[grp].push(c);
    return acc;
  }, {});

  const selected = categories.find(c => c.id === value);

  const handleSelect = (cat) => {
    onChange(cat.id);
    setOpen(false);
    setQuery("");
  };

  const handleAdd = async () => {
    if (!newCat.name.trim()) return;
    setAdding(true);
    const created = await base44.entities.ExpenseCategory.create({ ...newCat });
    onCategoriesChange([...categories, created]);
    onChange(created.id);
    setShowAdd(false);
    setNewCat({ name: "", parent_category: "", type: "variable" });
    setAdding(false);
    setOpen(false);
  };

  const parentGroups = [...new Set(categories.map(c => c.parent_category).filter(Boolean))];

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
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", TYPE_COLORS[selected.type || "variable"])}>
                {TYPE_LABELS[selected.type || "variable"]?.[0] || "V"}
              </span>
              <span className="truncate text-foreground">{selected.name}</span>
              {selected.parent_category && <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">· {selected.parent_category}</span>}
            </>
          ) : (
            <span className="text-muted-foreground">Zgjedh kategorinë...</span>
          )}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 w-80 mt-1 bg-white border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Kërko kategorinë..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {Object.entries(grouped).map(([grp, cats]) => (
              <div key={grp}>
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/30 sticky top-0">
                  {grp}
                </div>
                {cats.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelect(cat)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-primary/5 transition-colors text-left",
                      value === cat.id && "bg-primary/10 font-semibold text-primary"
                    )}
                  >
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", TYPE_COLORS[cat.type || "variable"])}>
                      {TYPE_LABELS[cat.type || "variable"]?.[0] || "V"}
                    </span>
                    <span className="flex-1">{cat.name}</span>
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">Nuk u gjet asnjë kategori</div>
            )}
          </div>

          <div className="border-t border-border p-2">
            {!showAdd ? (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Shto kategori të re
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  className="w-full h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Emri i kategorisë *"
                  value={newCat.name}
                  onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    className="h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none"
                    value={newCat.parent_category}
                    onChange={(e) => setNewCat({ ...newCat, parent_category: e.target.value })}
                  >
                    <option value="">Grupi (opsional)</option>
                    {parentGroups.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <select
                    className="h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none"
                    value={newCat.type}
                    onChange={(e) => setNewCat({ ...newCat, type: e.target.value })}
                  >
                    <option value="fixed">Fikse</option>
                    <option value="variable">Variabël</option>
                    <option value="one-time">Njëherësh</option>
                  </select>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={adding || !newCat.name}
                    className="flex-1 h-8 text-sm bg-primary text-primary-foreground rounded-md font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                  >
                    {adding ? "Duke shtuar..." : "Shto"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAdd(false); setNewCat({ name: "", parent_category: "", type: "variable" }); }}
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