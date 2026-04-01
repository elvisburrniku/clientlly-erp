import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function QuickInvoiceBuilder({ open, onClose, onCreateInvoice, currentUser }) {
  const [step, setStep] = useState(1); // 1: select client, 2: add products, 3: review
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const loadData = async () => {
    const [clientsData, productsData] = await Promise.all([
      base44.entities.Client.list(),
      base44.entities.Product.list(),
    ]);
    setClients(clientsData);
    setProducts(productsData.filter(p => p.is_active !== false));
    setLoading(false);
  };

  const addProduct = (product) => {
    setSelectedProducts([
      ...selectedProducts,
      { ...product, quantity: 1, line_total: product.price_inc_vat },
    ]);
  };

  const removeProduct = (idx) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== idx));
  };

  const updateQuantity = (idx, qty) => {
    const updated = [...selectedProducts];
    updated[idx].quantity = qty;
    updated[idx].line_total = (updated[idx].price_inc_vat || 0) * qty;
    setSelectedProducts(updated);
  };

  const calcTotals = () => {
    const subtotal = selectedProducts.reduce((s, p) => s + ((p.price_ex_vat || 0) * (p.quantity || 1)), 0);
    const vat_amount = selectedProducts.reduce((s, p) => {
      const exVat = (p.price_ex_vat || 0) * (p.quantity || 1);
      return s + exVat * ((p.vat_rate || 20) / 100);
    }, 0);
    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      vat_amount: parseFloat(vat_amount.toFixed(2)),
      amount: parseFloat((subtotal + vat_amount).toFixed(2)),
    };
  };

  const handleCreate = async () => {
    if (!selectedClient || selectedProducts.length === 0) return;
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const { subtotal, vat_amount, amount } = calcTotals();

    const items = selectedProducts.map(p => ({
      type: p.type || "product",
      name: p.name,
      quantity: p.quantity,
      unit: p.unit || "cope",
      price_ex_vat: p.price_ex_vat,
      vat_rate: p.vat_rate || 20,
      price_inc_vat: p.price_inc_vat,
      line_total: p.line_total,
    }));

    const newInvoice = {
      invoice_number: invoiceNumber,
      client_name: selectedClient.name,
      client_email: selectedClient.email,
      client_phone: selectedClient.phone || "",
      items,
      subtotal,
      vat_amount,
      amount,
      payment_method: paymentMethod,
      due_date: dueDate || undefined,
      status: "draft",
      is_open: true,
      issued_by: currentUser?.email,
    };

    await onCreateInvoice(newInvoice);
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setSelectedClient(null);
    setSelectedProducts([]);
    setPaymentMethod("cash");
    setDueDate("");
    onClose();
  };

  const { subtotal, vat_amount, amount } = calcTotals();

  if (loading) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Krijo Faturë me Katalogun e Shpejtë</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
            <div>
              <Label>Zgjedh Klientin *</Label>
              <Select value={selectedClient?.id || ""} onValueChange={(id) => {
                const client = clients.find(c => c.id === id);
                setSelectedClient(client);
              }}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Zgjedh klientin..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Metoda e Pagesës</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Transfer Bankar</SelectItem>
                    <SelectItem value="card">Kartë</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Afati i Pagesës</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1.5" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Anulo</Button>
              <Button onClick={() => setStep(2)} disabled={!selectedClient}>
                Vazhdo
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium mb-3">Zgjedh Produktet / Shërbimin</p>
              <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                {products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted transition text-left"
                  >
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">€{(p.price_inc_vat || 0).toFixed(2)} ({p.unit})</p>
                    </div>
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>

            {selectedProducts.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Produktet e zgjedhur:</p>
                <div className="space-y-2">
                  {selectedProducts.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                      <Input
                        type="number"
                        min="1"
                        value={p.quantity}
                        onChange={(e) => updateQuantity(idx, parseInt(e.target.value) || 1)}
                        className="w-16 h-8"
                      />
                      <div className="flex-1 text-sm">{p.name}</div>
                      <span className="text-sm font-medium">€{(p.line_total || 0).toFixed(2)}</span>
                      <button onClick={() => removeProduct(idx)} className="text-destructive hover:text-destructive/80">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Prapa</Button>
              <Button onClick={() => setStep(3)} disabled={selectedProducts.length === 0}>
                Shiko Përmbledhje
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-4">
            <div className="bg-muted/40 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="font-medium">Klienti:</span><span>{selectedClient?.name}</span></div>
              <div className="flex justify-between"><span className="font-medium">Email:</span><span>{selectedClient?.email}</span></div>
              <div className="flex justify-between"><span className="font-medium">Pagesa:</span><span className="capitalize">{paymentMethod}</span></div>
              {dueDate && <div className="flex justify-between"><span className="font-medium">Afat:</span><span>{dueDate}</span></div>}
            </div>

            <div className="space-y-2 text-sm">
              {selectedProducts.map((p, i) => (
                <div key={i} className="flex justify-between pb-1 border-b border-border">
                  <span>{p.quantity}x {p.name}</span>
                  <span className="font-medium">€{(p.line_total || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="bg-primary/10 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span>€{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">TVSH:</span><span>€{vat_amount.toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-primary/20 pt-1"><span className="font-bold">Total:</span><span className="font-bold text-primary">€{amount.toFixed(2)}</span></div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>Prapa</Button>
              <Button onClick={handleCreate} className="gap-2">
                <Check className="w-4 h-4" /> Krijo Faturën
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}