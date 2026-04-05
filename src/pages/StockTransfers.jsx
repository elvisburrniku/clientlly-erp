import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Trash2, Eye, MoreHorizontal, ArrowRightLeft, Check, X } from "lucide-react";
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

const statusLabels = { draft: "Draft", pending: "Në Pritje", approved: "Aprovuar", completed: "Përfunduar", cancelled: "Anulluar" };
const statusColors = { draft: "bg-slate-100 text-slate-700", pending: "bg-amber-100 text-amber-700", approved: "bg-emerald-100 text-emerald-700", completed: "bg-blue-100 text-blue-700", cancelled: "bg-red-100 text-red-700" };
const statusFlow = { draft: ["pending", "cancelled"], pending: ["approved", "cancelled"], approved: ["completed", "cancelled"], completed: [], cancelled: [] };

const emptyItem = () => ({ product_name: "", product_id: "", quantity: 1 });

export default function StockTransfers() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewTransfer, setViewTransfer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ from_warehouse_id: "", to_warehouse_id: "", transfer_date: moment().format("YYYY-MM-DD"), notes: "", items: [emptyItem()] });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [tr, wh, prod] = await Promise.all([
      base44.entities.StockTransfer.list("-created_date", 200),
      base44.entities.Warehouse.list("name", 100),
      base44.entities.Product.list("name", 500),
    ]);
    setTransfers(tr);
    setWarehouses(wh);
    setProducts(prod);
    setLoading(false);
  };

  const generateTransferNumber = () => `TR-${String(transfers.length + 1).padStart(4, "0")}`;

  const handleSave = async () => {
    if (!form.from_warehouse_id || !form.to_warehouse_id || form.items.length === 0) {
      toast.error("Plotësoni magazinat dhe artikujt");
      return;
    }
    if (form.from_warehouse_id === form.to_warehouse_id) {
      toast.error("Magazinat duhet të jenë të ndryshme");
      return;
    }
    setSubmitting(true);
    const fromWh = warehouses.find(w => w.id === form.from_warehouse_id);
    const toWh = warehouses.find(w => w.id === form.to_warehouse_id);
    await base44.entities.StockTransfer.create({
      tenant_id: tenantId,
      transfer_number: generateTransferNumber(),
      from_warehouse_id: form.from_warehouse_id,
      from_warehouse_name: fromWh?.name || "",
      to_warehouse_id: form.to_warehouse_id,
      to_warehouse_name: toWh?.name || "",
      status: "draft",
      items: form.items,
      notes: form.notes,
      transfer_date: form.transfer_date,
      created_by: user?.id,
      created_by_name: user?.full_name || user?.email,
    });
    toast.success("Transferta u krijua");
    setDialogOpen(false);
    setForm({ from_warehouse_id: "", to_warehouse_id: "", transfer_date: moment().format("YYYY-MM-DD"), notes: "", items: [emptyItem()] });
    setSubmitting(false);
    loadData();
  };

  const handleStatusChange = async (transfer, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === "approved") {
      updates.approved_by = user?.id;
      updates.approved_by_name = user?.full_name || user?.email;
      updates.approved_date = new Date().toISOString();
    }
    await base44.entities.StockTransfer.update(transfer.id, updates);
    toast.success(`Statusi u ndryshua në ${statusLabels[newStatus]}`);
    loadData();
    if (viewTransfer?.id === transfer.id) setViewTransfer({ ...viewTransfer, ...updates });
  };

  const handleDelete = async (transfer) => {
    if (!window.confirm("Fshi këtë transfertë?")) return;
    await base44.entities.StockTransfer.delete(transfer.id);
    toast.success("Transferta u fshi");
    loadData();
  };

  const addItem = () => setForm({ ...form, items: [...form.items, emptyItem()] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx, field, value) => {
    const newItems = [...form.items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setForm({ ...form, items: newItems });
  };

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
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Magazina</p>
          <h1 className="text-3xl font-bold tracking-tight">Transfertat e Stokut</h1>
        </div>
        <Button onClick={() => { setForm({ from_warehouse_id: "", to_warehouse_id: "", transfer_date: moment().format("YYYY-MM-DD"), notes: "", items: [emptyItem()] }); setDialogOpen(true); }} className="gap-2 self-start sm:self-auto" data-testid="button-add-transfer">
          <Plus className="w-4 h-4" /> Transfertë e Re
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {["draft", "pending", "approved", "completed"].map(s => (
          <div key={s} className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{statusLabels[s]}</p>
            <p className="text-2xl font-bold mt-1">{transfers.filter(t => t.status === s).length}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-semibold text-sm">{transfers.length} transferta</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Nr.</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Nga</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Në</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Data</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Artikuj</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Statusi</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                        <ArrowRightLeft className="w-7 h-7 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">Nuk ka transferta</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transfers.map(tr => (
                  <tr key={tr.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-transfer-${tr.id}`}>
                    <td className="px-6 py-4 text-sm font-semibold">{tr.transfer_number}</td>
                    <td className="px-6 py-4 text-sm">{tr.from_warehouse_name}</td>
                    <td className="px-6 py-4 text-sm">{tr.to_warehouse_name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{tr.transfer_date ? moment(tr.transfer_date).format("DD MMM YY") : "—"}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{(tr.items || []).length} artikuj</td>
                    <td className="px-6 py-4">
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", statusColors[tr.status] || "bg-muted")}>
                        {statusLabels[tr.status] || tr.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewTransfer(tr)}>
                            <Eye className="w-4 h-4 mr-2" /> Shiko
                          </DropdownMenuItem>
                          {(statusFlow[tr.status] || []).map(ns => (
                            <DropdownMenuItem key={ns} onClick={() => handleStatusChange(tr, ns)}>
                              {ns === "cancelled" ? <X className="w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                              {statusLabels[ns]}
                            </DropdownMenuItem>
                          ))}
                          {tr.status === "draft" && (
                            <DropdownMenuItem onClick={() => handleDelete(tr)} className="text-destructive focus:text-destructive">
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfertë e Re Stoku</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nga Magazina *</Label>
                <Select value={form.from_warehouse_id} onValueChange={v => setForm({...form, from_warehouse_id: v})}>
                  <SelectTrigger className="mt-1.5" data-testid="select-transfer-from"><SelectValue placeholder="Zgjedh" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.is_active !== false).map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Në Magazinën *</Label>
                <Select value={form.to_warehouse_id} onValueChange={v => setForm({...form, to_warehouse_id: v})}>
                  <SelectTrigger className="mt-1.5" data-testid="select-transfer-to"><SelectValue placeholder="Zgjedh" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.is_active !== false && w.id !== form.from_warehouse_id).map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.transfer_date} onChange={e => setForm({...form, transfer_date: e.target.value})} className="mt-1.5" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Artikujt</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem} className="gap-1 text-xs">
                  <Plus className="w-3 h-3" /> Artikull
                </Button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/30 rounded-xl">
                    <div className="col-span-8">
                      {idx === 0 && <Label className="text-xs">Produkti</Label>}
                      <Select value={item.product_name} onValueChange={v => {
                        const prod = products.find(p => p.name === v);
                        const newItems = [...form.items];
                        newItems[idx] = { ...newItems[idx], product_name: v, ...(prod ? { product_id: prod.id } : {}) };
                        setForm({ ...form, items: newItems });
                      }}>
                        <SelectTrigger className="mt-1" data-testid={`select-transfer-product-${idx}`}><SelectValue placeholder="Produkti" /></SelectTrigger>
                        <SelectContent>
                          {products.filter(p => p.is_active !== false).map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      {idx === 0 && <Label className="text-xs">Sasia</Label>}
                      <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} className="mt-1" />
                    </div>
                    <div className="col-span-1 flex items-center">
                      {form.items.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeItem(idx)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Shënime</Label>
              <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1.5" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSave} disabled={submitting} data-testid="button-save-transfer">
              {submitting ? "Duke ruajtur..." : "Krijo Transfertë"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewTransfer} onOpenChange={o => { if (!o) setViewTransfer(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Transferta — {viewTransfer?.transfer_number}</DialogTitle>
          </DialogHeader>
          {viewTransfer && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Nga</p>
                  <p className="font-semibold text-sm">{viewTransfer.from_warehouse_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Në</p>
                  <p className="font-semibold text-sm">{viewTransfer.to_warehouse_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="text-sm">{viewTransfer.transfer_date ? moment(viewTransfer.transfer_date).format("DD MMM YYYY") : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Statusi</p>
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", statusColors[viewTransfer.status])}>
                    {statusLabels[viewTransfer.status]}
                  </span>
                </div>
              </div>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="text-left text-xs px-4 py-2.5">Produkti</th>
                      <th className="text-right text-xs px-4 py-2.5">Sasia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(viewTransfer.items || []).map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 text-sm">{item.product_name}</td>
                        <td className="px-4 py-2.5 text-sm text-right font-semibold">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(statusFlow[viewTransfer.status] || []).map(ns => (
                  <Button key={ns} size="sm" variant={ns === "cancelled" ? "destructive" : "default"} onClick={() => handleStatusChange(viewTransfer, ns)}>
                    {statusLabels[ns]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
