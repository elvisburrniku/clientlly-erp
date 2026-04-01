import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
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

  useEffect(() => {
    base44.entities.Product.list('-created_date', 100).then(setProducts).catch(() => {});
  }, []);

  const update = (index, field, value) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      const next = { ...item, [field]: value };
      // Recalculate price_inc_vat and line_total when relevant fields change
      if (["price_ex_vat", "vat_rate", "quantity", "discount_type", "discount_value"].includes(field) || field === "price_inc_vat") {
        if (field !== "price_inc_vat") {
          next.price_inc_vat = parseFloat((next.price_ex_vat * (1 + next.vat_rate / 100)).toFixed(2));
        } else {
          // back-calculate ex vat
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

  const handleProductSelect = (itemIndex, productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const updated = [...items];
    updated[itemIndex] = {
      ...updated[itemIndex],
      name: product.name,
      type: product.type,
      price_ex_vat: product.price_ex_vat,
      vat_rate: product.vat_rate,
      unit: product.unit,
      price_inc_vat: product.price_ex_vat * (1 + (product.vat_rate || 20) / 100),
      line_total: (updated[itemIndex].quantity || 1) * product.price_ex_vat * (1 + (product.vat_rate || 20) / 100),
    };
    onChange(updated);
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

      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="bg-white border border-border rounded-xl p-4 hover:border-primary/30 transition">
            {/* Row 1: Type & Name */}
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
                {products.length > 0 ? (
                  <div className="space-y-1.5">
                    <Select value={item.product_id || ""} onValueChange={(v) => handleProductSelect(i, v)}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="Zgjedh produktin..." /></SelectTrigger>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} (€{(p.price_ex_vat || 0).toFixed(2)})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input className="text-sm" placeholder="Ose shkruaj emrin..." value={item.name} onChange={(e) => update(i, "name", e.target.value)} />
                  </div>
                ) : (
                  <Input className="text-sm" placeholder="Emri i artikullit..." value={item.name} onChange={(e) => update(i, "name", e.target.value)} />
                )}
              </div>
            </div>

            {/* Row 2: Quantity & Unit & VAT */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Sasia</label>
                <Input className="text-sm" type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => update(i, "quantity", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Njësia</label>
                <Input className="text-sm" placeholder="cope, kg, ore..." value={item.unit} onChange={(e) => update(i, "unit", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">TVSH %</label>
                <Select value={String(item.vat_rate)} onValueChange={(v) => update(i, "vat_rate", parseFloat(v))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Prices */}
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

            {/* Row 4: Discount */}
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
}