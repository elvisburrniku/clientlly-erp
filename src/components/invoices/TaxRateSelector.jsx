import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import CreatableEntitySelect from "@/components/shared/CreatableEntitySelect";

const initialDraft = { name: "", rate: "", is_inclusive: false };

export default function TaxRateSelector({ value, onChange, taxRates, onTaxRatesChange }) {
  return (
    <CreatableEntitySelect
      value={value}
      items={taxRates}
      placeholder={value !== undefined && value !== null && value !== "" ? `${value}%` : "Zgjedh TVSH..."}
      searchPlaceholder="Kërko normën..."
      emptyMessage="Nuk ka norma TVSH"
      addLabel="Shto normë të re"
      createTitle="Shto normë të re"
      createButtonLabel="Shto"
      initialDraft={initialDraft}
      onSelect={(taxRate) => onChange(parseFloat(taxRate.rate))}
      onCreate={(draft) => base44.entities.TaxRate.create({
        name: draft.name,
        rate: parseFloat(draft.rate),
        is_inclusive: draft.is_inclusive,
      })}
      onItemsChange={onTaxRatesChange}
      findSelectedItem={(items, currentValue) => items.find(t => t.rate === currentValue || String(t.rate) === String(currentValue)) || null}
      renderSelected={(taxRate) => (
        <>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 shrink-0">TVSH</span>
          <span className="text-foreground">{`${taxRate.rate}% ${taxRate.is_inclusive ? "(inc.)" : "(exc.)"}`}</span>
        </>
      )}
      renderOptions={({ items, selectedItem, selectItem, emptyMessage }) => (
        <div className="p-1.5 space-y-0.5 max-h-48 overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-3">{emptyMessage}</div>
          ) : (
            items.map((taxRate) => (
              <button
                key={taxRate.id}
                type="button"
                onClick={() => selectItem(taxRate)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-muted/60 transition-colors text-left",
                  selectedItem?.id === taxRate.id && "bg-primary/10 text-primary font-medium"
                )}
              >
                <span className="font-medium">{taxRate.name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                    {taxRate.rate}%
                  </span>
                  <span className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                    taxRate.is_inclusive ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  )}>
                    {taxRate.is_inclusive ? "INC" : "EXC"}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
      renderCreateFields={({ draft, setDraft }) => (
        <div className="space-y-2">
          <input
            className="w-full h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none focus:ring-1 focus:ring-ring"
            placeholder="Emri (p.sh. TVSH 20%)"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            className="w-full h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none focus:ring-1 focus:ring-ring"
            placeholder="Norma % (p.sh. 20)"
            value={draft.rate}
            onChange={(e) => setDraft({ ...draft, rate: e.target.value })}
          />
          <select
            className="w-full h-8 px-2 text-sm border border-input rounded-md bg-transparent outline-none focus:ring-1 focus:ring-ring"
            value={draft.is_inclusive ? "inclusive" : "exclusive"}
            onChange={(e) => setDraft({ ...draft, is_inclusive: e.target.value === "inclusive" })}
          >
            <option value="exclusive">Exclusive - TVSH shtohet sipër çmimit</option>
            <option value="inclusive">Inclusive - TVSH e përfshirë në çmim</option>
          </select>
        </div>
      )}
      canCreate={(draft) => Boolean(draft.name?.trim() && draft.rate !== "")}
    />
  );
}
