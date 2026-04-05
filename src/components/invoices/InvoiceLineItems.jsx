import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import CreatableEntitySelect from "@/components/shared/CreatableEntitySelect";
import UnitSelector from "./UnitSelector";
import TaxRateSelector from "./TaxRateSelector";
import ServiceSelector from "./ServiceSelector";
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
  discount_type: "none",
  discount_value: 0,
});

export default function InvoiceLineItems({ items, onChange, onDiscountChange, discountInfo = { type: "none", value: 0, amount: 0 } }) {
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [services, setServices] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.Product.list("-created_date", 100).catch(() => []),
      base44.entities.Unit.list("-created_date", 100).catch(() => []),
      base44.entities.TaxRate.list("-created_date", 100).catch(() => []),
      base44.entities.ServiceCategory.list("-created_date", 200).catch(() => []),
    ]).then(([prods, unts, trs, svcs]) => {
      setProducts(prods);
      setUnits(unts);
      setTaxRates(trs);
      setServices(svcs);
    });
  }, []);

  const update = (index, field, value) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      const next = { ...item, [field]: value };
      if (["price_ex_vat", "vat_rate", "quantity", "discount_type", "discount_value"].includes(field) || field === "price_inc_vat") {
        if (field !== "price_inc_vat") {
          next.price_inc_vat = parseFloat((next.price_ex_vat * (1 + next.vat_rate / 100)).toFixed(2));
        } else {
          next.price_ex_vat = parseFloat((next.price_inc_vat / (1 + next.vat_rate / 100)).toFixed(2));
        }
        const baseTotal = parseFloat((next.quantity * next.price_inc_vat).toFixed(2));
        let discountAmount = 0;
        if (next.discount_type === "percentage") {
          discountAmount = parseFloat((baseTotal * (next.discount_value || 0) / 100).toFixed(2));
        } else if (next.discount_type === "fixed") {
          discountAmount = Math.min(parseFloat(next.discount_value || 0), baseTotal);
        }
        next.line_total = parseFloat((baseTotal - discountAmount).toFixed(2));
      }
      return next;
    });
    onChange(updated);
  };

  const addItem = () => onChange([...items, emptyItem()]);
  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  const handleProductSelect = (itemIndex, product) => {
    if (!product) return;
    const updated = [...items];
    updated[itemIndex] = {
      ...updated[itemIndex],
      product_id: product.id,
      name: product.name,
      type: product.type,
      price_ex_vat: parseFloat(product.price_ex_vat) || 0,
      vat_rate: parseFloat(product.vat_rate) || 20,
      unit: product.unit || "cope",
      price_inc_vat: (parseFloat(product.price_ex_vat) || 0) * (1 + (parseFloat(product.vat_rate) || 20) / 100),
      line_total: (updated[itemIndex].quantity || 1) * (parseFloat(product.price_ex_vat) || 0) * (1 + (parseFloat(product.vat_rate) || 20) / 100),
    };
    onChange(updated);
  };

  const handleProductCreate = async (draft) => {
    return base44.entities.Product.create({
      name: draft.name,
      type: draft.type || "product",
      description: draft.description || "",
      price_ex_vat: parseFloat(draft.price_ex_vat) || 0,
      vat_rate: parseFloat(draft.vat_rate) || 20,
      unit: draft.unit || "cope",
      is_active: true,
    });
  };

  const calcSubtotal = () => items.reduce((s, it) => s + (it.line_total || 0), 0);
  const getDiscountAmount = () => {
    const subtotal = calcSubtotal();
    if (discountInfo.type === "percentage") {
      return parseFloat((subtotal * (discountInfo.value || 0) / 100).toFixed(2));
    } else if (discountInfo.type === "fixed") {
      return Math.min(parseFloat(discountInfo.value || 0), subtotal);
    }
    return 0;
  };

  const getItemDiscount = (item) => {
    const baseTotal = parseFloat((item.quantity * item.price_inc_vat).toFixed(2));
    if (item.discount_type === "percentage") {
      return parseFloat((baseTotal * (item.discount_value || 0) / 100).toFixed(2));
    } else if (item.discount_type === "fixed") {
      return Math.min(parseFloat(item.discount_value || 0), baseTotal);
    }
    return 0;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="bg-white border border-border rounded-xl p-4 hover:border-primary/30 transition">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Lloji</label>
                <Select value={item.type} onValueChange={(v) => update(i, "type", v)}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Produkt</SelectItem>
                    <SelectItem value="service">Shërbim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Përshkrimi / Emri *</label>
                {item.type === "service" && services.length > 0 ? (
                  <div className="space-y-1.5">
                    <ServiceSelector
                      value={item.service_id || ""}
                      onChange={(id, name) => {
                        const updated = [...items];
                        updated[i] = { ...updated[i], service_id: id, name };
                        onChange(updated);
                      }}
                      services={services}
                      onServicesChange={setServices}
                    />
                    <Input className="text-sm" placeholder="Ose shkruaj emrin..." value={item.name} onChange={(e) => update(i, "name", e.target.value)} />
                  </div>
                ) : products.length > 0 && item.type === "product" ? (
                  <div className="space-y-1.5">
                    <CreatableEntitySelect
                      value={item.product_id || ""}
                      items={products.filter(p => p.type === item.type)}
                      placeholder="Zgjedh produktin..."
                      searchPlaceholder="Kërko produktin..."
                      emptyMessage="Nuk u gjet asnjë produkt"
                      addLabel="Shto produkt të ri"
                      createTitle="Shto produkt të ri"
                      createButtonLabel="Shto"
                      initialDraft={{ name: "", type: "product", description: "", price_ex_vat: 0, vat_rate: 20, unit: "cope" }}
                      onSelect={(product) => handleProductSelect(i, product)}
                      onCreate={handleProductCreate}
                      onItemsChange={setProducts}
                      findSelectedItem={(list, currentValue) => list.find(p => p.id === currentValue) || null}
                      renderSelected={(product) => (
                        <>
                          <span className="truncate text-foreground">{product.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">€{(product.price_ex_vat || 0).toFixed(2)}</span>
                        </>
                      )}
                      renderOptions={({ items, selectedItem, selectItem, emptyMessage }) => (
                        <div className="p-1.5 space-y-0.5 max-h-64 overflow-y-auto">
                          {items.length === 0 ? (
                            <div className="text-xs text-muted-foreground text-center py-3">{emptyMessage}</div>
                          ) : (
                            items.map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => selectItem(product)}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-muted/60 transition-colors text-left",
                                  selectedItem?.id === product.id && "bg-primary/10 text-primary font-medium"
                                )}
                              >
                                <span className="font-medium">{product.name}</span>
                                <span className="text-xs text-muted-foreground">€{(product.price_ex_vat || 0).toFixed(2)}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                      renderCreateFields={({ draft, setDraft }) => (
                        <div className="space-y-2">
                          <Input
                            className="text-sm"
                            placeholder="Emri i produktit *"
                            value={draft.name}
                            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="text-sm"
                              placeholder="Çmim pa TVSH"
                              value={draft.price_ex_vat}
                              onChange={(e) => setDraft({ ...draft, price_ex_vat: e.target.value })}
                            />
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="text-sm"
                              placeholder="TVSH %"
                              value={draft.vat_rate}
                              onChange={(e) => setDraft({ ...draft, vat_rate: e.target.value })}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              className="text-sm"
                              placeholder="Njësia"
                              value={draft.unit}
                              onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                            />
                            <Input
                              className="text-sm"
                              placeholder="Përshkrim"
                              value={draft.description}
                              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                      canCreate={(draft) => Boolean(draft.name?.trim())}
                    />
                    <Input className="text-sm" placeholder="Ose shkruaj emrin..." value={item.name} onChange={(e) => update(i, "name", e.target.value)} />
                  </div>
                ) : (
                  <Input className="text-sm" placeholder="Emri i artikullit..." value={item.name} onChange={(e) => update(i, "name", e.target.value)} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Sasia</label>
                <Input className="text-sm" type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => update(i, "quantity", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Njësia</label>
                <UnitSelector
                  value={item.unit}
                  onChange={(v) => update(i, "unit", v)}
                  units={units}
                  onUnitsChange={setUnits}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">TVSH %</label>
                <TaxRateSelector
                  value={item.vat_rate}
                  onChange={(v) => update(i, "vat_rate", v)}
                  taxRates={taxRates}
                  onTaxRatesChange={setTaxRates}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Çmim pa TVSH</label>
                <Input className="text-sm" type="number" min="0" step="0.01" placeholder="0.00" value={item.price_ex_vat} onChange={(e) => update(i, "price_ex_vat", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Çmim me TVSH</label>
                <Input className="text-sm" type="number" min="0" step="0.01" placeholder="0.00" value={item.price_inc_vat} onChange={(e) => update(i, "price_inc_vat", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Total</label>
                <div className="bg-primary/10 rounded-lg p-2.5 text-sm font-bold text-primary border border-primary/20 flex justify-between items-center">
                  €{(item.line_total || 0).toFixed(2)}
                  <button onClick={() => removeItem(i)} className="text-destructive/60 hover:text-destructive ml-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 border border-border">
              <label className="text-xs font-semibold text-muted-foreground block mb-2">Zbritje (Opsionale)</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select value={item.discount_type || "none"} onValueChange={(v) => update(i, "discount_type", v)}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Pa zbritje</SelectItem>
                    <SelectItem value="percentage">% Përqindje</SelectItem>
                    <SelectItem value="fixed">€ Fikse</SelectItem>
                  </SelectContent>
                </Select>
                {item.discount_type !== "none" && (
                  <>
                    <Input type="number" min="0" step="0.01" placeholder="Vlera" value={item.discount_value || 0} onChange={(e) => update(i, "discount_value", parseFloat(e.target.value) || 0)} className="text-sm" />
                    <div className="text-sm font-semibold text-red-600 bg-red-50 rounded-lg px-3 py-2 flex items-center justify-center">−€{getItemDiscount(item).toFixed(2)}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2 w-full border-dashed">
          <Plus className="w-4 h-4" /> Shto Artikull të Ri
        </Button>
      </div>

      {onDiscountChange && (
        <div className="border-t pt-4 space-y-3">
          <div className="text-sm font-semibold">Zbritje në Total (Opsionale)</div>
          <div className="grid grid-cols-3 gap-3">
            <Select value={discountInfo.type} onValueChange={(v) => onDiscountChange({ ...discountInfo, type: v, value: 0 })}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Pa zbritje</SelectItem>
                <SelectItem value="percentage">%</SelectItem>
                <SelectItem value="fixed">€ Fikse</SelectItem>
              </SelectContent>
            </Select>
            {discountInfo.type !== "none" && (
              <>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Vlera"
                  value={discountInfo.value || 0}
                  onChange={(e) => onDiscountChange({ ...discountInfo, value: parseFloat(e.target.value) || 0 })}
                  className="text-xs"
                />
                <div className="text-xs font-semibold bg-muted/40 rounded px-2 py-1.5 flex items-center">−€{getDiscountAmount().toFixed(2)}</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
