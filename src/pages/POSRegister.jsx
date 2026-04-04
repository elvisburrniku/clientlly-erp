import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Building2, Receipt, X, User, Phone, SplitSquareHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const PAYMENT_ICONS = {
  cash: Banknote,
  card: CreditCard,
  bank_transfer: Building2,
};

const PAYMENT_LABELS = {
  cash: "Cash",
  card: "Kartë",
  bank_transfer: "Transfer",
};

export default function POSRegister() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [openSessionOpen, setOpenSessionOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [posConfig, setPosConfig] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentEntries, setPaymentEntries] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prods, inv, sessions, configs] = await Promise.all([
        base44.entities.Product.list("-created_date", 500),
        base44.entities.Inventory.list("-created_date", 500),
        base44.entities.PosSession.filter({ status: "open" }),
        base44.entities.PosConfig.list("-created_date", 1),
      ]);
      setProducts(prods.filter(p => p.is_active !== false));
      setInventory(inv);
      if (sessions.length > 0) setActiveSession(sessions[0]);
      if (configs.length > 0) setPosConfig(configs[0]);
    } catch (err) {
      console.error("Load error:", err);
    }
    setLoading(false);
  };

  const getStock = (productId) => {
    const inv = inventory.find(i => i.product_id === productId);
    return inv ? inv.quantity : null;
  };

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter(p => {
    if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    }
    return true;
  });

  const addToCart = (product) => {
    const existing = cart.find(c => c.product_id === product.id);
    if (existing) {
      setCart(cart.map(c => c.product_id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        price: parseFloat(product.price) || 0,
        tax_rate: parseFloat(product.tax_rate) || 20,
        quantity: 1,
        unit: product.unit || "cope",
      }]);
    }
  };

  const updateQty = (productId, delta) => {
    setCart(cart.map(c => {
      if (c.product_id !== productId) return c;
      const newQty = c.quantity + delta;
      return newQty > 0 ? { ...c, quantity: newQty } : c;
    }).filter(c => c.quantity > 0));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(c => c.product_id !== productId));
  };

  const cartSubtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartTax = cart.reduce((s, c) => s + (c.price * c.quantity * c.tax_rate / 100), 0);
  const cartTotal = cartSubtotal + cartTax;

  const totalPaid = paymentEntries.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const changeAmount = totalPaid > cartTotal ? totalPaid - cartTotal : 0;
  const remaining = cartTotal - totalPaid;

  const handleOpenSession = async () => {
    try {
      const sessionNum = `POS-${Date.now().toString(36).toUpperCase()}`;
      const session = await base44.entities.PosSession.create({
        session_number: sessionNum,
        opened_by: user?.email || user?.full_name,
        opened_by_id: user?.id,
        opening_balance: openingBalance,
        status: "open",
      });
      setActiveSession(session);
      setOpenSessionOpen(false);
      toast.success("Sesioni POS u hap me sukses");
    } catch (err) {
      toast.error("Gabim në hapjen e sesionit");
    }
  };

  const openCheckout = () => {
    if (cart.length === 0) return;
    const methods = posConfig?.payment_methods || ["cash", "card", "bank_transfer"];
    const defaultMethod = typeof methods[0] === 'object' ? methods[0].id || 'cash' : methods[0];
    setPaymentEntries([{ method: defaultMethod, amount: cartTotal }]);
    setCheckoutOpen(true);
  };

  const addPaymentEntry = () => {
    const methods = posConfig?.payment_methods || ["cash", "card", "bank_transfer"];
    const defaultMethod = typeof methods[0] === 'object' ? methods[0].id || 'cash' : methods[0];
    setPaymentEntries([...paymentEntries, { method: defaultMethod, amount: 0 }]);
  };

  const updatePaymentEntry = (idx, field, value) => {
    setPaymentEntries(paymentEntries.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const removePaymentEntry = (idx) => {
    if (paymentEntries.length <= 1) return;
    setPaymentEntries(paymentEntries.filter((_, i) => i !== idx));
  };

  const handleCheckout = async () => {
    if (remaining > 0.01) {
      toast.error("Shuma e paguar nuk mjafton");
      return;
    }
    setSubmitting(true);
    try {
      const orderNum = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const orderItems = cart.map(c => ({
        product_id: c.product_id,
        name: c.name,
        price: c.price,
        tax_rate: c.tax_rate,
        quantity: c.quantity,
        unit: c.unit,
        line_total: c.price * c.quantity,
        tax_total: c.price * c.quantity * c.tax_rate / 100,
      }));

      const order = await base44.entities.PosOrder.create({
        session_id: activeSession?.id,
        order_number: orderNum,
        items: orderItems,
        subtotal: parseFloat(cartSubtotal.toFixed(2)),
        tax_amount: parseFloat(cartTax.toFixed(2)),
        total: parseFloat(cartTotal.toFixed(2)),
        payments: paymentEntries.map(p => ({ method: p.method, amount: parseFloat(p.amount) || 0 })),
        payment_status: "paid",
        change_amount: parseFloat(changeAmount.toFixed(2)),
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        status: "completed",
        created_by: user?.email,
      });

      for (const item of cart) {
        const inv = inventory.find(i => i.product_id === item.product_id);
        if (inv) {
          await base44.entities.Inventory.update(inv.id, {
            quantity: Math.max(0, inv.quantity - item.quantity),
          });
        }
      }

      if (activeSession) {
        await base44.entities.PosSession.update(activeSession.id, {
          total_sales: (parseFloat(activeSession.total_sales) || 0) + cartTotal,
          total_orders: (parseInt(activeSession.total_orders) || 0) + 1,
        });
        setActiveSession(prev => ({
          ...prev,
          total_sales: (parseFloat(prev.total_sales) || 0) + cartTotal,
          total_orders: (parseInt(prev.total_orders) || 0) + 1,
        }));
      }

      setLastOrder({ ...order, items: orderItems, payments: paymentEntries });
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setCheckoutOpen(false);
      setReceiptOpen(true);
      toast.success("Porosia u kompletua");
      loadData();
    } catch (err) {
      toast.error("Gabim në krijimin e porosisë");
    }
    setSubmitting(false);
  };

  const printReceipt = () => {
    if (!lastOrder) return;
    const receiptWindow = window.open("", "_blank", "width=300,height=600");
    const items = lastOrder.items || [];
    const payments = lastOrder.payments || [];
    receiptWindow.document.write(`
      <html><head><title>Receipt</title>
      <style>
        body { font-family: 'Courier New', monospace; width: 72mm; margin: 0 auto; padding: 8px; font-size: 12px; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; }
        .total-row td { font-weight: bold; font-size: 14px; padding-top: 4px; }
      </style></head><body>
      <div class="center bold" style="font-size:16px">${posConfig?.receipt_header || "POS Receipt"}</div>
      <div class="center" style="font-size:10px">${moment().format("DD/MM/YYYY HH:mm")}</div>
      <div class="center" style="font-size:10px">Nr: ${lastOrder.order_number}</div>
      ${lastOrder.customer_name ? `<div class="center" style="font-size:10px">Klienti: ${lastOrder.customer_name}</div>` : ""}
      <div class="line"></div>
      <table>
        ${items.map(it => `
          <tr><td colspan="2">${it.name}</td></tr>
          <tr><td>${it.quantity} x €${it.price.toFixed(2)}</td><td class="right">€${it.line_total.toFixed(2)}</td></tr>
        `).join("")}
      </table>
      <div class="line"></div>
      <table>
        <tr><td>Nëntotali:</td><td class="right">€${(lastOrder.subtotal || 0).toFixed(2)}</td></tr>
        <tr><td>TVSH:</td><td class="right">€${(lastOrder.tax_amount || 0).toFixed(2)}</td></tr>
        <tr class="total-row"><td>TOTALI:</td><td class="right">€${(lastOrder.total || 0).toFixed(2)}</td></tr>
      </table>
      <div class="line"></div>
      <table>
        ${payments.map(p => `<tr><td>${PAYMENT_LABELS[p.method] || p.method}:</td><td class="right">€${(p.amount || 0).toFixed(2)}</td></tr>`).join("")}
        ${lastOrder.change_amount > 0 ? `<tr><td>Kusur:</td><td class="right">€${lastOrder.change_amount.toFixed(2)}</td></tr>` : ""}
      </table>
      <div class="line"></div>
      <div class="center" style="font-size:10px">${posConfig?.receipt_footer || "Faleminderit!"}</div>
      </body></html>
    `);
    receiptWindow.document.close();
    receiptWindow.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <ShoppingCart className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-pos-no-session">Pika e Shitjes</h2>
            <p className="text-muted-foreground mt-2">Hapni një sesion të ri për të filluar shitjen</p>
          </div>
          <Button size="lg" onClick={() => setOpenSessionOpen(true)} className="gap-2" data-testid="button-open-session">
            <Plus className="w-5 h-5" /> Hap Sesionin
          </Button>

          <Dialog open={openSessionOpen} onOpenChange={setOpenSessionOpen}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader><DialogTitle>Hap Sesion POS</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-sm font-medium">Bilanci Fillestar (€)</label>
                  <Input type="number" value={openingBalance} onChange={e => setOpeningBalance(parseFloat(e.target.value) || 0)} className="mt-1.5" data-testid="input-opening-balance" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenSessionOpen(false)}>Anulo</Button>
                <Button onClick={handleOpenSession} data-testid="button-confirm-open-session">Hap Sesionin</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden" data-testid="pos-register-container">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border bg-white flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sesioni:</span>
            <span className="font-bold text-primary" data-testid="text-session-number">{activeSession.session_number}</span>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Kërko produkt ose barkod..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-pos-search"
            />
          </div>
        </div>

        <div className="px-4 py-2 border-b border-border bg-muted/30 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all",
              selectedCategory === "all" ? "bg-primary text-white" : "bg-white text-foreground hover:bg-muted")}
            data-testid="button-category-all"
          >Të Gjitha</button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all",
                selectedCategory === cat ? "bg-primary text-white" : "bg-white text-foreground hover:bg-muted")}
              data-testid={`button-category-${cat}`}
            >{cat}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredProducts.map(product => {
              const stock = getStock(product.id);
              const isOutOfStock = stock !== null && stock <= 0;
              return (
                <button
                  key={product.id}
                  onClick={() => !isOutOfStock && addToCart(product)}
                  disabled={isOutOfStock}
                  className={cn(
                    "bg-white rounded-xl border border-border/60 p-3 text-left transition-all hover:shadow-md hover:border-primary/30",
                    isOutOfStock && "opacity-50 cursor-not-allowed"
                  )}
                  data-testid={`button-product-${product.id}`}
                >
                  <p className="text-sm font-semibold line-clamp-2">{product.name}</p>
                  <p className="text-lg font-bold text-primary mt-1">€{(parseFloat(product.price) || 0).toFixed(2)}</p>
                  {stock !== null && (
                    <p className={cn("text-[10px] font-medium mt-1", isOutOfStock ? "text-destructive" : "text-muted-foreground")}>
                      {isOutOfStock ? "Pa stok" : `Stok: ${stock}`}
                    </p>
                  )}
                </button>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Nuk u gjet asnjë produkt
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-[360px] border-l border-border bg-white flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Shporta
            </h3>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-destructive" data-testid="button-clear-cart">
                <Trash2 className="w-4 h-4 mr-1" /> Pastro
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Shporta është bosh</div>
          ) : (
            cart.map(item => (
              <div key={item.product_id} className="bg-muted/30 rounded-xl p-3 space-y-2" data-testid={`cart-item-${item.product_id}`}>
                <div className="flex justify-between items-start">
                  <p className="text-sm font-semibold flex-1">{item.name}</p>
                  <button onClick={() => removeFromCart(item.product_id)} className="text-muted-foreground hover:text-destructive" data-testid={`button-remove-${item.product_id}`}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.product_id, -1)} className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center hover:bg-muted" data-testid={`button-qty-minus-${item.product_id}`}>
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold w-8 text-center" data-testid={`text-qty-${item.product_id}`}>{item.quantity}</span>
                    <button onClick={() => updateQty(item.product_id, 1)} className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center hover:bg-muted" data-testid={`button-qty-plus-${item.product_id}`}>
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm font-bold">€{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border p-4 space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Nëntotali:</span><span>€{cartSubtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">TVSH:</span><span>€{cartTax.toFixed(2)}</span></div>
            <div className="flex justify-between text-lg font-bold"><span>Totali:</span><span className="text-primary" data-testid="text-cart-total">€{cartTotal.toFixed(2)}</span></div>
          </div>
          <Button className="w-full gap-2" size="lg" disabled={cart.length === 0} onClick={openCheckout} data-testid="button-checkout">
            <CreditCard className="w-5 h-5" /> Paguaj
          </Button>
        </div>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Pagesa — €{cartTotal.toFixed(2)}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Klienti (opsional)</label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Emri" value={customerName} onChange={e => setCustomerName(e.target.value)} className="pl-9" data-testid="input-customer-name" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Telefoni</label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Telefoni" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="pl-9" data-testid="input-customer-phone" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">Mënyra e Pagesës</label>
                <Button variant="ghost" size="sm" onClick={addPaymentEntry} className="gap-1 text-xs" data-testid="button-add-split">
                  <SplitSquareHorizontal className="w-3.5 h-3.5" /> Nda Pagesën
                </Button>
              </div>
              {paymentEntries.map((entry, idx) => {
                const methods = posConfig?.payment_methods || ["cash", "card", "bank_transfer"];
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {methods.map(m => {
                        const methodId = typeof m === 'object' ? m.id || m : m;
                        const Icon = PAYMENT_ICONS[methodId] || Banknote;
                        return (
                          <button key={methodId} onClick={() => updatePaymentEntry(idx, "method", methodId)}
                            className={cn("w-9 h-9 rounded-lg flex items-center justify-center border transition-all",
                              entry.method === methodId ? "bg-primary text-white border-primary" : "bg-white border-border hover:border-primary/50")}
                            data-testid={`button-payment-method-${methodId}-${idx}`}
                          ><Icon className="w-4 h-4" /></button>
                        );
                      })}
                    </div>
                    <Input type="number" value={entry.amount} onChange={e => updatePaymentEntry(idx, "amount", e.target.value)}
                      className="flex-1" step="0.01" data-testid={`input-payment-amount-${idx}`} />
                    {paymentEntries.length > 1 && (
                      <button onClick={() => removePaymentEntry(idx)} className="text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Totali:</span><span className="font-bold">€{cartTotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Paguar:</span><span className="font-bold">€{totalPaid.toFixed(2)}</span></div>
              {remaining > 0.01 && <div className="flex justify-between text-destructive"><span>Mbetur:</span><span className="font-bold">€{remaining.toFixed(2)}</span></div>}
              {changeAmount > 0 && <div className="flex justify-between text-emerald-600"><span>Kusur:</span><span className="font-bold">€{changeAmount.toFixed(2)}</span></div>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Anulo</Button>
            <Button onClick={handleCheckout} disabled={remaining > 0.01 || submitting} data-testid="button-confirm-payment">
              {submitting ? "Duke procesuar..." : "Konfirmo Pagesën"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-center">Porosia u Kompletua!</DialogTitle></DialogHeader>
          {lastOrder && (
            <div className="space-y-4 py-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700" data-testid="text-order-total">€{(lastOrder.total || 0).toFixed(2)}</p>
                <p className="text-xs text-emerald-600 mt-1">{lastOrder.order_number}</p>
              </div>
              {lastOrder.change_amount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <p className="text-sm font-semibold text-amber-700">Kusur: €{lastOrder.change_amount.toFixed(2)}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col gap-2">
            <Button onClick={printReceipt} className="w-full gap-2" data-testid="button-print-receipt">
              <Receipt className="w-4 h-4" /> Printo Faturën
            </Button>
            <Button variant="outline" onClick={() => setReceiptOpen(false)} className="w-full" data-testid="button-close-receipt">
              Porosi e Re
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
