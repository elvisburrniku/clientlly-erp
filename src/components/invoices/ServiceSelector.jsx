import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { Briefcase, Bug, Megaphone, Palette, Truck, Wrench, Zap } from "lucide-react";
import CreatableEntitySelect from "@/components/shared/CreatableEntitySelect";

const BILLING_LABELS = { "one-time": "1×", recurring: "↻", hourly: "h", project: "P" };
const BILLING_COLORS = { "one-time": "bg-slate-100 text-slate-700", recurring: "bg-blue-100 text-blue-700", hourly: "bg-amber-100 text-amber-700", project: "bg-violet-100 text-violet-700" };

const CATEGORY_ICONS = {
  "IT & Software": <Zap className="w-3 h-3" />,
  "Design & Creative": <Palette className="w-3 h-3" />,
  "Marketing": <Megaphone className="w-3 h-3" />,
  "Business & Professional": <Briefcase className="w-3 h-3" />,
  "Transport & Logistics": <Truck className="w-3 h-3" />,
  "Maintenance & Repairs": <Wrench className="w-3 h-3" />,
  "Pest Control Services": <Bug className="w-3 h-3" />,
};

const initialDraft = { name: "", category: "", subcategory: "", billing_type: "one-time" };

export default function ServiceSelector({ value, onChange, services, onServicesChange }) {
  const allCategories = [...new Set(services.map(s => s.category).filter(Boolean))];

  return (
    <CreatableEntitySelect
      value={value}
      items={services}
      placeholder="Zgjedh shërbimin..."
      searchPlaceholder="Kërko shërbimin..."
      emptyMessage="Nuk u gjet asnjë shërbim"
      addLabel="Shto shërbim të ri"
      createTitle="Shto shërbim të ri"
      createButtonLabel="Shto"
      initialDraft={initialDraft}
      onSelect={(service) => onChange(service.id, service.name, service)}
      onCreate={(draft) => base44.entities.ServiceCategory.create(draft)}
      onItemsChange={onServicesChange}
      findSelectedItem={(items, currentValue) => items.find(s => s.id === currentValue) || null}
      filterItem={(service, query) => {
        const needle = query.toLowerCase();
        return [
          service.name,
          service.category,
          service.subcategory,
        ].filter(Boolean).some(v => String(v).toLowerCase().includes(needle));
      }}
      renderSelected={(service) => (
        <>
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", BILLING_COLORS[service.billing_type || "one-time"])}>
            {BILLING_LABELS[service.billing_type || "one-time"]}
          </span>
          <span className="truncate text-foreground">{service.name}</span>
          {service.category && <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">· {service.category}</span>}
        </>
      )}
      renderOptions={({ items, selectedItem, selectItem, emptyMessage }) => {
        const grouped = items.reduce((acc, service) => {
          const group = service.category || "Tjera";
          if (!acc[group]) acc[group] = {};
          const sub = service.subcategory || "";
          if (!acc[group][sub]) acc[group][sub] = [];
          acc[group][sub].push(service);
          return acc;
        }, {});

        const hasItems = Object.keys(grouped).length > 0;

        return hasItems ? (
          <>
            {Object.entries(grouped).map(([category, subs]) => (
              <div key={category}>
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/30 sticky top-0 flex items-center gap-1.5">
                  {CATEGORY_ICONS[category] || <Briefcase className="w-3 h-3" />}
                  {category}
                </div>
                {Object.entries(subs).map(([subcategory, servicesInSub]) => (
                  <div key={subcategory}>
                    {subcategory && (
                      <div className="px-4 py-1 text-[10px] font-semibold text-muted-foreground/70 italic">
                        {subcategory}
                      </div>
                    )}
                    {servicesInSub.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => selectItem(service)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-primary/5 transition-colors text-left",
                          selectedItem?.id === service.id && "bg-primary/10 font-semibold text-primary"
                        )}
                      >
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", BILLING_COLORS[service.billing_type || "one-time"])}>
                          {BILLING_LABELS[service.billing_type || "one-time"]}
                        </span>
                        <span className="flex-1">{service.name}</span>
                        {service.default_price > 0 && (
                          <span className="text-xs text-muted-foreground shrink-0">€{service.default_price}</span>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </>
        ) : (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</div>
        );
      }}
      renderCreateFields={({ draft, setDraft }) => (
        <div className="space-y-2">
          <input
            className="w-full h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none focus:ring-1 focus:ring-ring"
            placeholder="Emri i shërbimit *"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-1.5">
            <select
              className="h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value, subcategory: "" })}
            >
              <option value="">Kategoria *</option>
              {allCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
              <option value="__new__">+ Tjetër...</option>
            </select>
            <select
              className="h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none"
              value={draft.subcategory}
              onChange={(e) => setDraft({ ...draft, subcategory: e.target.value })}
            >
              <option value="">Nënkategoria</option>
              {[...new Set(services.filter(s => s.category === draft.category).map(s => s.subcategory).filter(Boolean))].map((subcategory) => (
                <option key={subcategory} value={subcategory}>{subcategory}</option>
              ))}
            </select>
          </div>
          {draft.category === "__new__" && (
            <input
              className="w-full h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none focus:ring-1 focus:ring-ring"
              placeholder="Emri i kategorisë së re"
              value={draft.categoryText || ""}
              onChange={(e) => setDraft({ ...draft, category: e.target.value, categoryText: e.target.value })}
            />
          )}
          <select
            className="w-full h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none"
            value={draft.billing_type}
            onChange={(e) => setDraft({ ...draft, billing_type: e.target.value })}
          >
            <option value="one-time">Njëherësh</option>
            <option value="recurring">Periodike</option>
            <option value="hourly">Orare</option>
            <option value="project">Projekt</option>
          </select>
        </div>
      )}
      canCreate={(draft) => Boolean(draft.name?.trim() && draft.category && draft.category !== "__new__" && draft.category.trim())}
    />
  );
}
