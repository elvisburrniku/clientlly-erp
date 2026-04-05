import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, MoreHorizontal, Pencil, Trash2, FileText, Truck, CheckCircle, Package, ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";
import { jsPDF } from "jspdf";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600" },
  confirmed: { label: "Konfirmuar", color: "bg-blue-100 text-blue-700" },
  shipped: { label: "Dërguar", color: "bg-amber-100 text-amber-700" },
  delivered: { label: "Dorëzuar", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Anuluar", color: "bg-red-100 text-red-700" },
};

const emptyForm = () => ({
  client_name: "",
  client_email: "",
  client_phone: "",
  client_address: "",
  items: [{ name: "", quantity: 1, price: 0, tax_rate: 20, unit: "cope" }],
  payment_method: "cash",
  notes: "",
  expected_delivery: "",
  shipping_address: "",
});

export default function SalesOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [o, c, p] = await Promise.all([
        base44.entities.SalesOrder.list("-created_date", 200),
        base44.entities.Client.list("-created_date", 200),
        base44.entities.Product.list("-created_date", 500),
      ]);
      setOrders(o);
      setClients(c);
      setProducts(p);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const calcTotals = (items) => {
    const subtotal = items.reduce((s, it) => s + (parseFloat(it.price) || 0) * (parseInt(it.quantity) || 0), 0);
    const tax = items.reduce((s, it) => {
      const base = (parseFloat(it.price) || 0) * (parseInt(it.quantity) || 0);
      return s + base * ((parseFloat(it.tax_rate) || 0) / 100);
    }, 0);
    return { subtotal: parseFloat(subtotal.toFixed(2)), tax_amount: parseFloat(tax.toFixed(2)), total: parseFloat((subtotal + tax).toFixed(2)) };
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { name: "", quantity: 1, price: 0, tax_rate: 20, unit: "cope" }] });
  };

  const updateItem = (idx, field, value) => {
    setForm({ ...form, items: form.items.map((it, i) => i === idx ? { ...it, [field]: value } : it) });
  };

  const removeItem = (idx) => {
    if (form.items.length <= 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const selectProduct = (idx, productId) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    updateItem(idx, "name", prod.name);
    updateItem(idx, "price", parseFloat(prod.price) || 0);
    updateItem(idx, "tax_rate", parseFloat(prod.tax_rate) || 20);
    updateItem(idx, "unit", prod.unit || "cope");
    setForm(prev => ({
      ...prev,
      items: prev.items.map((it, i) => i === idx ? {
        ...it, name: prod.name, price: parseFloat(prod.price) || 0,
        tax_rate: parseFloat(prod.tax_rate) || 20, unit: prod.unit || "cope", product_id: prod.id
      } : it)
    }));
  };

  const fillClient = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setForm(prev => ({
        ...prev,
        client_name: client.name,
        client_email: client.email || "",
        client_phone: client.phone || "",
        client_address: client.address || "",
      }));
    }
  };

  const handleSave = async () => {
    if (!form.client_name || form.items.length === 0 || !form.items[0].name) {
      toast.error("Plotësoni klientin dhe artikujt");
      return;
    }
    setSubmitting(true);
    try {
      const { subtotal, tax_amount, total } = calcTotals(form.items);
      const data = {
        client_name: form.client_name,
        client_email: form.client_email,
        client_phone: form.client_phone,
        client_address: form.client_address,
        items: form.items,
        subtotal, tax_amount, total,
        payment_method: form.payment_method,
        notes: form.notes,
        expected_delivery: form.expected_delivery || undefined,
        shipping_address: form.shipping_address || undefined,
        created_by: user?.email,
      };
      if (editOrder) {
        await base44.entities.SalesOrder.update(editOrder.id, data);
        toast.success("Porosia u përditësua");
      } else {
        data.order_number = `SO-${Date.now().toString(36).toUpperCase()}`;
        data.status = "draft";
        await base44.entities.SalesOrder.create(data);
        toast.success("Porosia u krijua");
      }
      setDialogOpen(false);
      setEditOrder(null);
      setForm(emptyForm());
      loadData();
    } catch (err) {
      toast.error("Gabim në ruajtje");
    }
    setSubmitting(false);
  };

  const handleStatusChange = async (order, newStatus) => {
    try {
      await base44.entities.SalesOrder.update(order.id, { status: newStatus });
      toast.success(`Statusi u ndryshua në ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      loadData();
    } catch {
      toast.error("Gabim");
    }
  };

  const handleConvertToInvoice = async (order) => {
    try {
      const invNum = `INV-${Date.now().toString(36).toUpperCase()}`;
      const invoice = await base44.entities.Invoice.create({
        invoice_number: invNum,
        client_name: order.client_name,
        client_email: order.client_email,
        client_phone: order.client_phone,
        client_address: order.client_address,
        items: order.items,
        subtotal: order.subtotal,
        tax_amount: order.tax_amount,
        total: order.total,
        status: "draft",
        notes: `Konvertuar nga porosia ${order.order_number}`,
        created_by: user?.email,
      });
      await base44.entities.SalesOrder.update(order.id, {
        invoice_id: invoice.id,
        invoice_number: invNum,
      });
      toast.success(`Fatura ${invNum} u krijua nga porosia`);
      loadData();
    } catch {
      toast.error("Gabim në konvertim");
    }
  };

  const handleDelete = async (order) => {
    if (!window.confirm(`Fshi porosinë ${order.order_number}?`)) return;
    try {
      await base44.entities.SalesOrder.delete(order.id);
      toast.success("Porosia u fshi");
      loadData();
    } catch {
      toast.error("Gabim");
    }
  };

  const openEdit = (order) => {
    setEditOrder(order);
    setForm({
      client_name: order.client_name || "",
      client_email: order.client_email || "",
      client_phone: order.client_phone || "",
      client_address: order.client_address || "",
      items: order.items || [{ name: "", quantity: 1, price: 0, tax_rate: 20, unit: "cope" }],
      payment_method: order.payment_method || "cash",
      notes: order.notes || "",
      expected_delivery: order.expected_delivery || "",
      shipping_address: order.shipping_address || "",
    });
    setDialogOpen(true);
  };

  const generatePDF = (order) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210; const margin = 14;
    doc.setFillColor(67, 56, 202); doc.rect(0, 0, W, 38, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("POROSI SHITJEJE", margin, 18);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`${order.order_number}`, margin, 28);
    doc.text(`Data: ${moment(order.created_at).format("DD/MM/YYYY")}`, W - margin, 28, { align: "right" });

    let y = 50;
    doc.setTextColor(40, 40, 40); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("Klienti:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(order.client_name || "", margin + 30, y);
    if (order.client_phone) { y += 6; doc.text(`Tel: ${order.client_phone}`, margin + 30, y); }
    if (order.client_address) { y += 6; doc.text(`Adresa: ${order.client_address}`, margin + 30, y); }
    if (order.expected_delivery) { y += 6; doc.text(`Dorëzimi: ${order.expected_delivery}`, margin + 30, y); }
    y += 12;

    doc.setFillColor(243, 244, 246); doc.rect(margin, y - 4, W - margin * 2, 8, "F");
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(100);
    doc.text("Artikulli", margin + 2, y); doc.text("Sasia", margin + 90, y);
    doc.text("Cmimi", margin + 115, y); doc.text("TVSH", margin + 140, y); doc.text("Totali", margin + 160, y);
    y += 8;
    doc.setFont("helvetica", "normal"); doc.setTextColor(40);
    (order.items || []).forEach((it, ri) => {
      if (ri % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(margin, y - 4, W - margin * 2, 7, "F"); }
      doc.text((it.name || "").slice(0, 40), margin + 2, y);
      doc.text(`${it.quantity}`, margin + 90, y);
      doc.text(`€${(parseFloat(it.price) || 0).toFixed(2)}`, margin + 115, y);
      doc.text(`${it.tax_rate || 20}%`, margin + 140, y);
      const lineTotal = (parseFloat(it.price) || 0) * (parseInt(it.quantity) || 0);
      doc.text(`€${lineTotal.toFixed(2)}`, margin + 160, y);
      y += 7;
    });
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text(`Nentotali: €${(parseFloat(order.subtotal) || 0).toFixed(2)}`, W - margin, y, { align: "right" }); y += 6;
    doc.text(`TVSH: €${(parseFloat(order.tax_amount) || 0).toFixed(2)}`, W - margin, y, { align: "right" }); y += 6;
    doc.setFontSize(12);
    doc.text(`TOTALI: €${(parseFloat(order.total) || 0).toFixed(2)}`, W - margin, y, { align: "right" });

    doc.save(`${order.order_number}.pdf`);
  };

  const formTotals = calcTotals(form.items);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Shitjet</p>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-sales-orders-title">Porositë e Shitjes</h1>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setEditOrder(null); setDialogOpen(true); }} className="gap-2" data-testid="button-new-order">
          <Plus className="w-4 h-4" /> Porosi e Re
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { s: "draft",     bar: "bg-slate-400",   icon: <FileText className="w-4 h-4 text-slate-400" /> },
          { s: "confirmed", bar: "bg-blue-500",     icon: <CheckCircle className="w-4 h-4 text-blue-500" /> },
          { s: "shipped",   bar: "bg-amber-500",    icon: <Truck className="w-4 h-4 text-amber-500" /> },
          { s: "delivered", bar: "bg-emerald-500",  icon: <Package className="w-4 h-4 text-emerald-500" /> },
        ].map(({ s, bar, icon }) => (
          <div key={s} className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <div className={`h-[3px] w-full ${bar}`} />
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">{icon}<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{STATUS_CONFIG[s].label}</p></div>
              <p className="text-2xl font-bold">{orders.filter(o => o.status === s).length}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-semibold text-sm">{orders.length} porosi</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Nr.</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Klienti</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Totali</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Statusi</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Data</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Fatura</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Nuk ka porosi</td></tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className="hover:bg-muted/20 transition-colors" data-testid={`order-row-${order.id}`}>
                    <td className="px-6 py-4 text-sm font-semibold">{order.order_number}</td>
                    <td className="px-6 py-4 text-sm">{order.client_name}</td>
                    <td className="px-6 py-4 text-sm font-bold text-primary">€{(parseFloat(order.total) || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", STATUS_CONFIG[order.status]?.color || "bg-slate-100 text-slate-600")}>
                        {STATUS_CONFIG[order.status]?.label || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{moment(order.created_at).format("DD/MM/YYYY")}</td>
                    <td className="px-6 py-4 text-sm">
                      {order.invoice_number ? (
                        <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-lg">{order.invoice_number}</span>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7" data-testid={`button-actions-${order.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => openEdit(order)}>
                            <Pencil className="w-4 h-4 mr-2" /> Modifiko
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generatePDF(order)}>
                            <Download className="w-4 h-4 mr-2" /> Shkarko PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {order.status === "draft" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(order, "confirmed")}>
                              <CheckCircle className="w-4 h-4 mr-2" /> Konfirmo
                            </DropdownMenuItem>
                          )}
                          {order.status === "confirmed" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(order, "shipped")}>
                              <Truck className="w-4 h-4 mr-2" /> Shëno si Dërguar
                            </DropdownMenuItem>
                          )}
                          {order.status === "shipped" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(order, "delivered")}>
                              <Package className="w-4 h-4 mr-2" /> Shëno si Dorëzuar
                            </DropdownMenuItem>
                          )}
                          {!order.invoice_number && order.status !== "cancelled" && (
                            <DropdownMenuItem onClick={() => handleConvertToInvoice(order)}>
                              <FileText className="w-4 h-4 mr-2" /> Konverto në Faturë
                            </DropdownMenuItem>
                          )}
                          {order.status !== "cancelled" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(order, "cancelled")} className="text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Anulo
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(order)} className="text-destructive focus:text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Fshi
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={o => { if (!o) { setDialogOpen(false); setEditOrder(null); setForm(emptyForm()); } else setDialogOpen(o); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editOrder ? "Modifiko Porosinë" : "Porosi e Re"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Zgjedh Klientin</Label>
              <Select onValueChange={fillClient}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Zgjedh nga lista..." /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Emri i Klientit *</Label><Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} className="mt-1.5" data-testid="input-so-client-name" /></div>
              <div><Label>Email</Label><Input value={form.client_email} onChange={e => setForm({ ...form, client_email: e.target.value })} className="mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telefoni</Label><Input value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Adresa</Label><Input value={form.client_address} onChange={e => setForm({ ...form, client_address: e.target.value })} className="mt-1.5" /></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Artikujt</Label>
                <Button variant="ghost" size="sm" onClick={addItem} className="gap-1 text-xs" data-testid="button-add-item"><Plus className="w-3 h-3" /> Shto</Button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-end bg-muted/30 rounded-xl p-3">
                    <div className="flex-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Artikulli</label>
                      <Select onValueChange={val => selectProduct(idx, val)}>
                        <SelectTrigger className="mt-0.5 h-8 text-xs"><SelectValue placeholder={item.name || "Zgjedh..."} /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-16">
                      <label className="text-[10px] font-medium text-muted-foreground">Sasia</label>
                      <Input type="number" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 0)} className="mt-0.5 h-8 text-xs" />
                    </div>
                    <div className="w-20">
                      <label className="text-[10px] font-medium text-muted-foreground">Çmimi</label>
                      <Input type="number" value={item.price} onChange={e => updateItem(idx, "price", parseFloat(e.target.value) || 0)} className="mt-0.5 h-8 text-xs" step="0.01" />
                    </div>
                    <div className="w-14">
                      <label className="text-[10px] font-medium text-muted-foreground">TVSH%</label>
                      <Input type="number" value={item.tax_rate} onChange={e => updateItem(idx, "tax_rate", parseFloat(e.target.value) || 0)} className="mt-0.5 h-8 text-xs" />
                    </div>
                    <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive mb-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-muted/50 rounded-xl p-3 text-sm space-y-1">
              <div className="flex justify-between"><span>Nëntotali:</span><span>€{formTotals.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>TVSH:</span><span>€{formTotals.tax_amount.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg"><span>Totali:</span><span className="text-primary">€{formTotals.total.toFixed(2)}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mënyra e Pagesës</Label>
                <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Kartë</SelectItem>
                    <SelectItem value="bank_transfer">Transfer Bankar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data e Dorëzimit</Label>
                <Input type="date" value={form.expected_delivery} onChange={e => setForm({ ...form, expected_delivery: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Shënime</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1.5" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditOrder(null); setForm(emptyForm()); }}>Anulo</Button>
            <Button onClick={handleSave} disabled={submitting} data-testid="button-save-order">
              {submitting ? "Duke ruajtur..." : editOrder ? "Përditëso" : "Krijo Porosinë"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
