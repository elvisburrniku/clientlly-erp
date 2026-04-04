import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Settings, Plus, Trash2, Printer, CreditCard, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function POSConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState(["cash", "card", "bank_transfer"]);
  const [newMethod, setNewMethod] = useState("");
  const [posCategories, setPosCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [receiptHeader, setReceiptHeader] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");
  const [autoPrint, setAutoPrint] = useState(false);
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [printerWidth, setPrinterWidth] = useState("80");

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const configs = await base44.entities.PosConfig.list("-created_date", 1);
      if (configs.length > 0) {
        const c = configs[0];
        setConfig(c);
        setPaymentMethods(c.payment_methods || ["cash", "card", "bank_transfer"]);
        setPosCategories(c.pos_categories || []);
        setReceiptHeader(c.receipt_header || "");
        setReceiptFooter(c.receipt_footer || "");
        setAutoPrint(c.auto_print_receipt || false);
        setTaxInclusive(c.tax_inclusive || false);
        const pc = c.printer_config || {};
        setPrinterWidth(pc.width || "80");
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        payment_methods: paymentMethods,
        pos_categories: posCategories,
        receipt_header: receiptHeader,
        receipt_footer: receiptFooter,
        auto_print_receipt: autoPrint,
        tax_inclusive: taxInclusive,
        printer_config: { width: printerWidth },
      };
      if (config) {
        await base44.entities.PosConfig.update(config.id, data);
      } else {
        const created = await base44.entities.PosConfig.create(data);
        setConfig(created);
      }
      toast.success("Konfigurimet u ruajtën");
    } catch (err) {
      toast.error("Gabim në ruajtje");
    }
    setSaving(false);
  };

  const addPaymentMethod = () => {
    if (!newMethod.trim() || paymentMethods.includes(newMethod.trim())) return;
    setPaymentMethods([...paymentMethods, newMethod.trim()]);
    setNewMethod("");
  };

  const removePaymentMethod = (method) => {
    setPaymentMethods(paymentMethods.filter(m => m !== method));
  };

  const addCategory = () => {
    if (!newCategory.trim() || posCategories.includes(newCategory.trim())) return;
    setPosCategories([...posCategories, newCategory.trim()]);
    setNewCategory("");
  };

  const removeCategory = (cat) => {
    setPosCategories(posCategories.filter(c => c !== cat));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-3xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">POS</p>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-pos-config-title">Konfigurimet POS</h1>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-bold">Mënyrat e Pagesës</p>
            <p className="text-xs text-muted-foreground">Konfiguro mënyrat e pagesës në POS</p>
          </div>
        </div>

        <div className="space-y-2">
          {paymentMethods.map(method => (
            <div key={method} className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3" data-testid={`payment-method-${method}`}>
              <span className="text-sm font-medium capitalize">{method.replace("_", " ")}</span>
              <button onClick={() => removePaymentMethod(method)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder="P.sh. mobile_payment" value={newMethod} onChange={e => setNewMethod(e.target.value)} data-testid="input-new-payment-method"
              onKeyDown={e => { if (e.key === "Enter") addPaymentMethod(); }} />
            <Button variant="outline" onClick={addPaymentMethod} data-testid="button-add-payment-method"><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Tag className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-bold">Kategoritë POS</p>
            <p className="text-xs text-muted-foreground">Kategoritë e produkteve për shfaqje në POS</p>
          </div>
        </div>

        <div className="space-y-2">
          {posCategories.map(cat => (
            <div key={cat} className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3" data-testid={`pos-category-${cat}`}>
              <span className="text-sm font-medium">{cat}</span>
              <button onClick={() => removeCategory(cat)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder="P.sh. Ushqime, Pijet..." value={newCategory} onChange={e => setNewCategory(e.target.value)} data-testid="input-new-category"
              onKeyDown={e => { if (e.key === "Enter") addCategory(); }} />
            <Button variant="outline" onClick={addCategory} data-testid="button-add-category"><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Printer className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-bold">Printeri & Fatura</p>
            <p className="text-xs text-muted-foreground">Konfigurimet e printerit termik dhe faturës</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Gjerësia e Printerit (mm)</Label>
            <Input value={printerWidth} onChange={e => setPrinterWidth(e.target.value)} className="mt-1.5" data-testid="input-printer-width" />
          </div>
          <div className="flex flex-col justify-end gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={autoPrint} onChange={e => setAutoPrint(e.target.checked)} className="w-4 h-4 rounded border-border" data-testid="checkbox-auto-print" />
              <span className="text-sm font-medium">Auto-print pas pagesës</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={taxInclusive} onChange={e => setTaxInclusive(e.target.checked)} className="w-4 h-4 rounded border-border" data-testid="checkbox-tax-inclusive" />
              <span className="text-sm font-medium">Çmimet përfshijnë TVSH</span>
            </label>
          </div>
        </div>

        <div>
          <Label>Header i Faturës</Label>
          <Textarea value={receiptHeader} onChange={e => setReceiptHeader(e.target.value)} className="mt-1.5" rows={2} placeholder="Emri i kompanisë, adresa..." data-testid="input-receipt-header" />
        </div>
        <div>
          <Label>Footer i Faturës</Label>
          <Textarea value={receiptFooter} onChange={e => setReceiptFooter(e.target.value)} className="mt-1.5" rows={2} placeholder="Faleminderit! Mirë se vini përsëri!" data-testid="input-receipt-footer" />
        </div>
      </div>

      <Button size="lg" onClick={handleSave} disabled={saving} className="w-full" data-testid="button-save-config">
        {saving ? "Duke ruajtur..." : "Ruaj Konfigurimet"}
      </Button>
    </div>
  );
}
