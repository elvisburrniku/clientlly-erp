import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const emptyItem = () => ({
  type: "service",
  name: "",
  quantity: 1,
  unit: "cope",
  price_ex_vat: 0,
  vat_rate: 20,
  price_inc_vat: 0,
  line_total: 0,
});

export default function InvoiceLineItems({ items, onChange }) {
  const update = (index, field, value) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      const next = { ...item, [field]: value };
      // Recalculate price_inc_vat and line_total when relevant fields change
      if (["price_ex_vat", "vat_rate", "quantity"].includes(field) || field === "price_inc_vat") {
        if (field !== "price_inc_vat") {
          next.price_inc_vat = parseFloat((next.price_ex_vat * (1 + next.vat_rate / 100)).toFixed(2));
        } else {
          // back-calculate ex vat
          next.price_ex_vat = parseFloat((next.price_inc_vat / (1 + next.vat_rate / 100)).toFixed(2));
        }
        next.line_total = parseFloat((next.quantity * next.price_inc_vat).toFixed(2));
      }
      return next;
    });
    onChange(updated);
  };

  const addItem = () => onChange([...items, emptyItem()]);
  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      <div className="hidden lg:grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
        <div className="col-span-1">Lloji</div>
        <div className="col-span-3">Përshkrimi</div>
        <div className="col-span-1">Sasia</div>
        <div className="col-span-1">Njësia</div>
        <div className="col-span-2">Çm. pa TVSH</div>
        <div className="col-span-1">TVSH %</div>
        <div className="col-span-2">Çm. me TVSH</div>
        <div className="col-span-1">Total</div>
      </div>

      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-center bg-muted/30 rounded-xl p-2">
          <div className="col-span-1">
            <Select value={item.type} onValueChange={(v) => update(i, "type", v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Produkt</SelectItem>
                <SelectItem value="service">Shërbim</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3">
            <Input className="h-8 text-xs" placeholder="Emri..." value={item.name} onChange={(e) => update(i, "name", e.target.value)} />
          </div>
          <div className="col-span-1">
            <Input className="h-8 text-xs" type="number" min="0" value={item.quantity} onChange={(e) => update(i, "quantity", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="col-span-1">
            <Input className="h-8 text-xs" placeholder="cope" value={item.unit} onChange={(e) => update(i, "unit", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Input className="h-8 text-xs" type="number" min="0" step="0.01" placeholder="0.00" value={item.price_ex_vat} onChange={(e) => update(i, "price_ex_vat", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="col-span-1">
            <Select value={String(item.vat_rate)} onValueChange={(v) => update(i, "vat_rate", parseFloat(v))}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0%</SelectItem>
                <SelectItem value="10">10%</SelectItem>
                <SelectItem value="20">20%</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Input className="h-8 text-xs" type="number" min="0" step="0.01" placeholder="0.00" value={item.price_inc_vat} onChange={(e) => update(i, "price_inc_vat", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="col-span-1 flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-foreground">€{(item.line_total || 0).toFixed(2)}</span>
            <button onClick={() => removeItem(i)} className="text-destructive/60 hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2 w-full border-dashed">
        <Plus className="w-4 h-4" /> Shto Artikull
      </Button>
    </div>
  );
}