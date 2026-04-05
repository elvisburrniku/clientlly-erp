import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Trash2, Eye, MoreHorizontal, FileText, Check, X, Truck, Package, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";
import CreatableEntitySelect from "@/components/shared/CreatableEntitySelect";

const statusLabels = {
  draft: "Draft", submitted: "Dërguar", approved: "Aprovuar", ordered: "Porositur", received: "Marrë", closed: "Mbyllur", cancelled: "Anulluar"
};
const statusColors = {
  draft: "bg-slate-100 text-slate-700", submitted: "bg-blue-100 text-blue-700", approved: "bg-emerald-100 text-emerald-700",
  ordered: "bg-violet-100 text-violet-700", received: "bg-teal-100 text-teal-700", closed: "bg-gray-100 text-gray-600", cancelled: "bg-red-100 text-red-700"
};
const statusFlow = {
  draft: ["submitted", "cancelled"], submitted: ["approved", "cancelled"], approved: ["ordered", "cancelled"],
  ordered: ["received", "cancelled"], received: ["closed"], closed: [], cancelled: []
};

const emptyItem = () => ({ product_id: "", product_name: "", quantity: 1, unit_price: 0, tax_rate: 20 });

export default function PurchaseOrders() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState({
    supplier_id: "", warehouse_id: "", order_date: moment().format("YYYY-MM-DD"),
    expected_date: "", notes: "", items: [emptyItem()]
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [po, sup, wh, prod] = await Promise.all([
      base44.entities.PurchaseOrder.list("-created_date", 200),
      base44.entities.Supplier.list("name", 200),
      base44.entities.Warehouse.list("name", 100),
      base44.entities.Product.list("name", 500),
    ]);
    setOrders(po);
    setSuppliers(sup);
    setWarehouses(wh);
    setProducts(prod);
    setLoading(false);
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

  const calcTotals = (items) => {
    const subtotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    const taxAmount = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0) * ((i.tax_rate || 0) / 100), 0);
    return { subtotal, tax_amount: taxAmount, total: subtotal + taxAmount };
  };

  const generatePoNumber = () => `PO-${String(orders.length + 1).padStart(4, "0")}`;

  const handleSave = async () => {
    if (!form.supplier_id || !form.warehouse_id || form.items.length === 0) {
      toast.error("Furnitori, magazina dhe artikujt janë të detyrueshëm");
      return;
    }
    setSubmitting(true);
    const supplier = suppliers.find(s => s.id === form.supplier_id);
    const warehouse = warehouses.find(w => w.id === form.warehouse_id);
    const totals = calcTotals(form.items);

    const data = {
      tenant_id: tenantId,
      po_number: editOrder?.po_number || generatePoNumber(),
      supplier_id: form.supplier_id,
      supplier_name: supplier?.name || "",
      warehouse_id: form.warehouse_id,
      warehouse_name: warehouse?.name || "",
      status: "draft",
      order_date: form.order_date,
      expected_date: form.expected_date || null,
      items: form.items,
      ...totals,
      notes: form.notes,
      created_by: user?.id,
      created_by_name: user?.full_name || user?.email,
    };

    if (editOrder) {
      await base44.entities.PurchaseOrder.update(editOrder.id, data);
      toast.success("Porosia u përditësua");
    } else {
      await base44.entities.PurchaseOrder.create(data);
      toast.success("Porosia u krijua");
    }
    setDialogOpen(false);
    setEditOrder(null);
    setForm({ supplier_id: "", warehouse_id: "", order_date: moment().format("YYYY-MM-DD"), expected_date: "", notes: "", items: [emptyItem()] });
    setSubmitting(false);
    loadData();
  };

  const handleStatusChange = async (order, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === "approved") {
      updates.approved_by = user?.id;
      updates.approved_by_name = user?.full_name || user?.email;
      updates.approved_date = new Date().toISOString();
    }
    if (newStatus === "received") {
      updates.received_date = moment().format("YYYY-MM-DD");
    }
    await base44.entities.PurchaseOrder.update(order.id, updates);
    toast.success(`Statusi u ndryshua në ${statusLabels[newStatus]}`);
    loadData();
    if (viewOrder?.id === order.id) {
      setViewOrder({ ...viewOrder, ...updates });
    }
  };

  const handleDelete = async (order) => {
    if (!window.confirm("Fshi këtë porosi?")) return;
    await base44.entities.PurchaseOrder.delete(order.id);
    toast.success("Porosia u fshi");
    loadData();
  };

  const openEdit = (order) => {
    const items = (order.items && order.items.length > 0) ? order.items.map(item => {
      const prod = products.find(p => p.id === item.product_id || p.name === item.product_name);
      return {
        ...item,
        product_id: item.product_id || prod?.id || "",
        product_name: item.product_name || prod?.name || "",
      };
    }) : [emptyItem()];
    setEditOrder(order);
    setForm({
      supplier_id: order.supplier_id || "",
      warehouse_id: order.warehouse_id || "",
      order_date: order.order_date || moment().format("YYYY-MM-DD"),
      expected_date: order.expected_date || "",
      notes: order.notes || "",
      items,
    });
    setDialogOpen(true);
  };

  const addItem = () => setForm({ ...form, items: [...form.items, emptyItem()] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx, field, value) => {
    const newItems = [...form.items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setForm({ ...form, items: newItems });
  };

  const exportPDF = (order) => {
    const doc = new jsPDF();
    doc.setFillColor(67, 56, 202);
    doc.rect(0, 0, 210, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("POROSI BLERJE", 14, 18);
    doc.setFontSize(10);
    doc.text(order.po_number || "", 14, 28);

    let y = 50;
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.text(`Furnitori: ${order.supplier_name || ""}`, 14, y); y += 7;
    doc.text(`Magazina: ${order.warehouse_name || ""}`, 14, y); y += 7;
    doc.text(`Data: ${order.order_date || ""}`, 14, y); y += 7;
    doc.text(`Statusi: ${statusLabels[order.status] || order.status}`, 14, y); y += 12;

    doc.setFillColor(67, 56, 202);
    doc.rect(14, y - 4, 182, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("Produkti", 16, y + 1);
    doc.text("Sasia", 100, y + 1);
    doc.text("Cmimi", 125, y + 1);
    doc.text("TVSH", 150, y + 1);
    doc.text("Totali", 170, y + 1);
    y += 10;

    doc.setTextColor(40, 40, 40);
    const items = order.items || [];
    items.forEach((item, i) => {
      if (i % 2 === 0) { doc.setFillColor(245, 247, 255); doc.rect(14, y - 4, 182, 7, "F"); }
      doc.text((item.product_name || "").slice(0, 40), 16, y);
      doc.text(String(item.quantity || 0), 100, y);
      doc.text(`€${(parseFloat(item.unit_price) || 0).toFixed(2)}`, 125, y);
      doc.text(`${item.tax_rate || 0}%`, 150, y);
      const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0) * (1 + (parseFloat(item.tax_rate) || 0) / 100);
      doc.text(`€${lineTotal.toFixed(2)}`, 170, y);
      y += 7;
    });

    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text(`Nëntotali: €${(parseFloat(order.subtotal) || 0).toFixed(2)}`, 140, y); y += 6;
    doc.text(`TVSH: €${(parseFloat(order.tax_amount) || 0).toFixed(2)}`, 140, y); y += 6;
    doc.setFontSize(11);
    doc.text(`TOTALI: €${(parseFloat(order.total) || 0).toFixed(2)}`, 140, y);

    doc.save(`${order.po_number || "PO"}.pdf`);
  };

  const filtered = orders.filter(o => !filterStatus || filterStatus === "" || filterStatus === "all" || o.status === filterStatus);

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
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Prokurimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Porositë e Blerjes</h1>
        </div>
        <Button onClick={() => { setEditOrder(null); setForm({ supplier_id: "", warehouse_id: "", order_date: moment().format("YYYY-MM-DD"), expected_date: "", notes: "", items: [emptyItem()] }); setDialogOpen(true); }} className="gap-2 self-start sm:self-auto" data-testid="button-add-po">
          <Plus className="w-4 h-4" /> Porosi e Re
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { s: "draft",    bar: "bg-slate-400",  icon: <FileText className="w-4 h-4 text-slate-400" /> },
          { s: "ordered",  bar: "bg-violet-500", icon: <Package className="w-4 h-4 text-violet-500" /> },
          { s: "received", bar: "bg-teal-500",   icon: <Truck className="w-4 h-4 text-teal-500" /> },
          { s: "closed",   bar: "bg-emerald-500",icon: <Check className="w-4 h-4 text-emerald-500" /> },
        ].map(({ s, bar, icon }) => (
          <div key={s} className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <div className={`h-[3px] w-full ${bar}`} />
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">{icon}<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{statusLabels[s]}</p></div>
              <p className="text-2xl font-bold">{orders.filter(o => o.status === s).length}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statusi" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-semibold text-sm">{filtered.length} porosi</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Nr. Porosie</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Furnitori</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Magazina</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Data</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Statusi</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Totali</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                        <FileText className="w-7 h-7 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">Nuk ka porosi</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(order => (
                  <tr key={order.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-po-${order.id}`}>
                    <td className="px-6 py-4 text-sm font-semibold">{order.po_number}</td>
                    <td className="px-6 py-4 text-sm">{order.supplier_name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{order.warehouse_name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{order.order_date ? moment(order.order_date).format("DD MMM YY") : "—"}</td>
                    <td className="px-6 py-4">
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", statusColors[order.status] || "bg-muted")}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right">€{(parseFloat(order.total) || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => setViewOrder(order)}>
                            <Eye className="w-4 h-4 mr-2" /> Shiko
                          </DropdownMenuItem>
                          {order.status === "draft" && (
                            <DropdownMenuItem onClick={() => openEdit(order)}>
                              <FileText className="w-4 h-4 mr-2" /> Modifiko
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => exportPDF(order)}>
                            <Download className="w-4 h-4 mr-2" /> Shkarko PDF
                          </DropdownMenuItem>
                          {(statusFlow[order.status] || []).map(ns => (
                            <DropdownMenuItem key={ns} onClick={() => handleStatusChange(order, ns)}>
                              {ns === "cancelled" ? <X className="w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                              {statusLabels[ns]}
                            </DropdownMenuItem>
                          ))}
                          {order.status === "draft" && (
                            <DropdownMenuItem onClick={() => handleDelete(order)} className="text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Fshi
                            </DropdownMenuItem>
                          )}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editOrder ? `Modifiko ${editOrder.po_number}` : "Porosi e Re Blerje"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Furnitori *</Label>
                <Select value={form.supplier_id} onValueChange={v => setForm({...form, supplier_id: v})}>
                  <SelectTrigger className="mt-1.5" data-testid="select-po-supplier"><SelectValue placeholder="Zgjedh furnitorin" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.filter(s => s.is_active !== false).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Magazina *</Label>
                <Select value={form.warehouse_id} onValueChange={v => setForm({...form, warehouse_id: v})}>
                  <SelectTrigger className="mt-1.5" data-testid="select-po-warehouse"><SelectValue placeholder="Zgjedh magazinën" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.is_active !== false).map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data e Porosisë</Label>
                <Input type="date" value={form.order_date} onChange={e => setForm({...form, order_date: e.target.value})} className="mt-1.5" />
              </div>
              <div>
                <Label>Data e Pritshme</Label>
                <Input type="date" value={form.expected_date} onChange={e => setForm({...form, expected_date: e.target.value})} className="mt-1.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Artikujt</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem} className="gap-1 text-xs" data-testid="button-add-po-item">
                  <Plus className="w-3 h-3" /> Artikull
                </Button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/30 rounded-xl">
                    <div className="col-span-4">
                      {idx === 0 && <Label className="text-xs">Produkti</Label>}
                      <CreatableEntitySelect
                        value={item.product_id || ""}
                        items={products.filter(p => p.is_active !== false)}
                        placeholder="Produkti"
                        searchPlaceholder="Kërko produktin..."
                        emptyMessage="Nuk u gjet asnjë produkt"
                        addLabel="Shto produkt të ri"
                        createTitle="Shto produkt të ri"
                        createButtonLabel="Shto"
                        initialDraft={{ name: "", type: "product", description: "", price_ex_vat: 0, vat_rate: 20, unit: "cope" }}
                        onSelect={(prod) => {
                          const newItems = [...form.items];
                          newItems[idx] = {
                            ...newItems[idx],
                            product_id: prod.id,
                            product_name: prod.name,
                            unit_price: parseFloat(prod.price_ex_vat || prod.price || 0) || 0,
                          };
                          setForm({ ...form, items: newItems });
                        }}
                        onCreate={handleProductCreate}
                        onItemsChange={(next) => setProducts(prev => {
                          const map = new Map(prev.map(p => [p.id, p]));
                          next.forEach(p => map.set(p.id, p));
                          return Array.from(map.values());
                        })}
                        findSelectedItem={(list, currentValue) => list.find(p => p.id === currentValue) || null}
                        renderSelected={(prod) => (
                          <>
                            <span className="truncate text-foreground">{prod.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">€{(prod.price_ex_vat || prod.price || 0).toFixed(2)}</span>
                          </>
                        )}
                        renderOptions={({ items, selectedItem, selectItem, emptyMessage }) => (
                          <div className="p-1.5 space-y-0.5 max-h-64 overflow-y-auto">
                            {items.length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-3">{emptyMessage}</div>
                            ) : (
                              items.map((prod) => (
                                <button
                                  key={prod.id}
                                  type="button"
                                  onClick={() => selectItem(prod)}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-muted/60 transition-colors text-left",
                                    selectedItem?.id === prod.id && "bg-primary/10 text-primary font-medium"
                                  )}
                                >
                                  <span className="font-medium">{prod.name}</span>
                                  <span className="text-xs text-muted-foreground">€{(prod.price_ex_vat || prod.price || 0).toFixed(2)}</span>
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
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">Sasia</Label>}
                      <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} className="mt-1" />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">Çmimi</Label>}
                      <Input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} className="mt-1" />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">TVSH %</Label>}
                      <Input type="number" min="0" value={item.tax_rate} onChange={e => updateItem(idx, "tax_rate", parseFloat(e.target.value) || 0)} className="mt-1" />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <span className="text-sm font-semibold">€{((item.quantity || 0) * (item.unit_price || 0) * (1 + (item.tax_rate || 0) / 100)).toFixed(2)}</span>
                      {form.items.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeItem(idx)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-right space-y-1">
                <p className="text-sm text-muted-foreground">Nëntotali: €{calcTotals(form.items).subtotal.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">TVSH: €{calcTotals(form.items).tax_amount.toFixed(2)}</p>
                <p className="text-lg font-bold">Totali: €{calcTotals(form.items).total.toFixed(2)}</p>
              </div>
            </div>

            <div>
              <Label>Shënime</Label>
              <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1.5" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSave} disabled={submitting} data-testid="button-save-po">
              {submitting ? "Duke ruajtur..." : editOrder ? "Përditëso" : "Krijo Porosi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewOrder} onOpenChange={o => { if (!o) setViewOrder(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Porosi Blerje — {viewOrder?.po_number}</DialogTitle>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Furnitori</p>
                  <p className="font-semibold text-sm">{viewOrder.supplier_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Magazina</p>
                  <p className="font-semibold text-sm">{viewOrder.warehouse_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="text-sm">{viewOrder.order_date ? moment(viewOrder.order_date).format("DD MMM YYYY") : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Statusi</p>
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", statusColors[viewOrder.status])}>
                    {statusLabels[viewOrder.status]}
                  </span>
                </div>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="text-left text-xs px-4 py-2.5">Produkti</th>
                      <th className="text-right text-xs px-4 py-2.5">Sasia</th>
                      <th className="text-right text-xs px-4 py-2.5">Çmimi</th>
                      <th className="text-right text-xs px-4 py-2.5">TVSH</th>
                      <th className="text-right text-xs px-4 py-2.5">Totali</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(viewOrder.items || []).map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 text-sm">{item.product_name}</td>
                        <td className="px-4 py-2.5 text-sm text-right">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-sm text-right">€{(parseFloat(item.unit_price) || 0).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-sm text-right">{item.tax_rate || 0}%</td>
                        <td className="px-4 py-2.5 text-sm font-semibold text-right">€{((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0) * (1 + (parseFloat(item.tax_rate) || 0) / 100)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-right space-y-1">
                <p className="text-sm">Nëntotali: €{(parseFloat(viewOrder.subtotal) || 0).toFixed(2)}</p>
                <p className="text-sm">TVSH: €{(parseFloat(viewOrder.tax_amount) || 0).toFixed(2)}</p>
                <p className="text-lg font-bold">Totali: €{(parseFloat(viewOrder.total) || 0).toFixed(2)}</p>
              </div>

              {viewOrder.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Shënime</p>
                  <p className="text-sm">{viewOrder.notes}</p>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {(statusFlow[viewOrder.status] || []).map(ns => (
                  <Button key={ns} size="sm" variant={ns === "cancelled" ? "destructive" : "default"} onClick={() => handleStatusChange(viewOrder, ns)}>
                    {statusLabels[ns]}
                  </Button>
                ))}
                <Button size="sm" variant="outline" onClick={() => exportPDF(viewOrder)} className="gap-1">
                  <Download className="w-3 h-3" /> PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
