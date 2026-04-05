import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import CreatableEntitySelect from "@/components/shared/CreatableEntitySelect";

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

const initialDraft = { name: "", code: "", category: "custom" };

export default function UnitSelector({ value, onChange, units, onUnitsChange }) {
  const grouped = (items) => items.reduce((acc, unit) => {
    const category = unit.category || "custom";
    if (!acc[category]) acc[category] = [];
    acc[category].push(unit);
    return acc;
  }, {});

  return (
    <CreatableEntitySelect
      value={value}
      items={units}
      placeholder="Zgjedh njësinë..."
      searchPlaceholder="Kërko njësinë..."
      emptyMessage="Nuk u gjet asnjë njësi"
      addLabel="Shto njësi të re"
      createTitle="Shto njësi të re"
      createButtonLabel="Shto"
      initialDraft={initialDraft}
      onSelect={(unit) => onChange(unit.code || unit.name)}
      onCreate={(draft) => base44.entities.Unit.create(draft)}
      onItemsChange={onUnitsChange}
      findSelectedItem={(items, currentValue) => items.find(u => u.code === currentValue || u.name === currentValue) || null}
      renderSelected={(unit) => (
        <>
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", CATEGORY_COLORS[unit.category || "custom"])}>
            {unit.code}
          </span>
          <span className="truncate text-foreground">{unit.name}</span>
        </>
      )}
      renderOptions={({ items, selectedItem, selectItem, emptyMessage }) => {
        const groupedItems = grouped(items);
        const categories = Object.entries(groupedItems);

        return (
          <>
            {categories.length > 0 ? categories.map(([category, catUnits]) => (
              <div key={category}>
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/30">
                  {CATEGORY_LABELS[category] || category}
                </div>
                {catUnits.map((unit) => (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => selectItem(unit)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-primary/5 transition-colors text-left",
                      selectedItem?.id === unit.id && "bg-primary/10 font-semibold text-primary"
                    )}
                  >
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 min-w-[28px] text-center", CATEGORY_COLORS[unit.category || "custom"])}>
                      {unit.code}
                    </span>
                    <span className="flex-1">{unit.name}</span>
                  </button>
                ))}
              </div>
            )) : (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</div>
            )}
          </>
        );
      }}
      renderCreateFields={({ draft, setDraft }) => (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            <input
              className="h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none focus:ring-1 focus:ring-ring"
              placeholder="Emri (p.sh. Kilogram)"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <input
              className="h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none focus:ring-1 focus:ring-ring"
              placeholder="Kodi (p.sh. kg)"
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
            />
          </div>
          <select
            className="w-full h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none focus:ring-1 focus:ring-ring"
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      )}
      canCreate={(draft) => Boolean(draft.name?.trim() && draft.code?.trim())}
    />
  );
}
