import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Wrench, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const typeLabels = { in: "Hyrje", out: "Dalje", adjustment: "Rregullim", transfer: "Transfertë" };
const typeIcons = { in: ArrowDownToLine, out: ArrowUpFromLine, adjustment: Wrench, transfer: ArrowLeftRight };
const typeColors = { in: "text-emerald-600 bg-emerald-100", out: "text-red-600 bg-red-100", adjustment: "text-amber-600 bg-amber-100", transfer: "text-blue-600 bg-blue-100" };

export default function StockMovements() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterProduct, setFilterProduct] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("");
  const [form, setForm] = useState({ product_id: "", warehouse_id: "", type: "in", quantity: 0, unit_cost: 0, notes: "" });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [mv, prod, wh] = await Promise.all([
      base44.entities.StockMovement.list("-movement_date", 500),
      base44.entities.Product.list("name", 500),
      base44.entities.Warehouse.list("name", 100),
    ]);
    setMovements(mv);
    setProducts(prod);
    setWarehouses(wh);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.product_id || !form.warehouse_id || form.quantity <= 0) {
      toast.error("Plotësoni të gjitha fushat e detyrueshme");
      return;
    }
    setSubmitting(true);
    const product = products.find(p => p.id === form.product_id);
    const warehouse = warehouses.find(w => w.id === form.warehouse_id);
    await base44.entities.StockMovement.create({
      tenant_id: tenantId,
      product_id: form.product_id,
      product_name: product?.name || "",
      warehouse_id: form.warehouse_id,
      warehouse_name: warehouse?.name || "",
      type: form.type,
      quantity: form.quantity,
      unit_cost: form.unit_cost,
      notes: form.notes,
      created_by: user?.id,
      created_by_name: user?.full_name || user?.email,
      movement_date: new Date().toISOString(),
    });
    toast.success("Lëvizja u regjistrua");
    setDialogOpen(false);
    setForm({ product_id: "", warehouse_id: "", type: "in", quantity: 0, unit_cost: 0, notes: "" });
    setSubmitting(false);
    loadData();
  };

  const filtered = movements.filter(m => {
    if (filterProduct && filterProduct !== "all" && m.product_id !== filterProduct) return false;
    if (filterType && filterType !== "all" && m.type !== filterType) return false;
    if (filterWarehouse && filterWarehouse !== "all" && m.warehouse_id !== filterWarehouse) return false;
    return true;
  });

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
          <h1 className="text-3xl font-bold tracking-tight">Lëvizjet e Stokut</h1>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 self-start sm:self-auto" data-testid="button-add-movement">
          <Plus className="w-4 h-4" /> Regjistro Lëvizje
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {["in", "out", "adjustment", "transfer"].map(t => {
          const count = movements.filter(m => m.type === t).length;
          const Icon = typeIcons[t];
          return (
            <div key={t} className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
              <div className="flex items-center gap-2">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", typeColors[t])}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{typeLabels[t]}</p>
              </div>
              <p className="text-2xl font-bold mt-2" data-testid={`text-count-${t}`}>{count}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Lloji" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha</SelectItem>
            <SelectItem value="in">Hyrje</SelectItem>
            <SelectItem value="out">Dalje</SelectItem>
            <SelectItem value="adjustment">Rregullim</SelectItem>
            <SelectItem value="transfer">Transfertë</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Magazina" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha</SelectItem>
            {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterProduct} onValueChange={setFilterProduct}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Produkti" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha</SelectItem>
            {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterType || filterWarehouse || filterProduct) && (
          <Button variant="outline" size="sm" onClick={() => { setFilterType(""); setFilterWarehouse(""); setFilterProduct(""); }}>
            Pastro
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-semibold text-sm">{filtered.length} lëvizje</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Data</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Lloji</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Produkti</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Magazina</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Sasia</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Kosto/Njësi</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Referenca</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Krijuar nga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                        <Package className="w-7 h-7 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">Nuk ka lëvizje të regjistruara</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(m => {
                  const Icon = typeIcons[m.type] || Package;
                  return (
                    <tr key={m.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-movement-${m.id}`}>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{moment(m.movement_date || m.created_at).format("DD MMM YY HH:mm")}</td>
                      <td className="px-6 py-4">
                        <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full", typeColors[m.type] || "bg-muted text-muted-foreground")}>
                          <Icon className="w-3 h-3" />
                          {typeLabels[m.type] || m.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">{m.product_name}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{m.warehouse_name || "—"}</td>
                      <td className="px-6 py-4 text-sm font-bold text-right">
                        <span className={m.type === "out" ? "text-red-600" : "text-emerald-600"}>
                          {m.type === "out" ? "-" : "+"}{m.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground text-right">€{(parseFloat(m.unit_cost) || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{m.reference_number || m.notes || "—"}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{m.created_by_name || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Regjistro Lëvizje Stoku</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Lloji *</Label>
              <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                <SelectTrigger className="mt-1.5" data-testid="select-movement-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Hyrje (In)</SelectItem>
                  <SelectItem value="out">Dalje (Out)</SelectItem>
                  <SelectItem value="adjustment">Rregullim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Produkti *</Label>
              <Select value={form.product_id} onValueChange={v => setForm({...form, product_id: v})}>
                <SelectTrigger className="mt-1.5" data-testid="select-movement-product"><SelectValue placeholder="Zgjedh produktin" /></SelectTrigger>
                <SelectContent>
                  {products.filter(p => p.is_active !== false).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Magazina *</Label>
              <Select value={form.warehouse_id} onValueChange={v => setForm({...form, warehouse_id: v})}>
                <SelectTrigger className="mt-1.5" data-testid="select-movement-warehouse"><SelectValue placeholder="Zgjedh magazinën" /></SelectTrigger>
                <SelectContent>
                  {warehouses.filter(w => w.is_active !== false).map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sasia *</Label>
                <Input type="number" min="0" step="0.01" value={form.quantity} onChange={e => setForm({...form, quantity: parseFloat(e.target.value) || 0})} className="mt-1.5" data-testid="input-movement-quantity" />
              </div>
              <div>
                <Label>Kosto për Njësi</Label>
                <Input type="number" min="0" step="0.01" value={form.unit_cost} onChange={e => setForm({...form, unit_cost: parseFloat(e.target.value) || 0})} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Shënime</Label>
              <Textarea placeholder="Shënime opsionale..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1.5" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleCreate} disabled={submitting} data-testid="button-save-movement">
              {submitting ? "Duke ruajtur..." : "Regjistro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
