import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, AlertTriangle, Edit2, Trash2, MoreHorizontal, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const emptyForm = () => ({
  product_name: "",
  quantity: 0,
  min_quantity: 10,
  unit: "cope",
  notes: "",
});

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [inv, prod] = await Promise.all([
      base44.entities.Inventory.list("-created_date", 100),
      base44.entities.Product.list("-created_date", 100),
    ]);
    setInventory(inv);
    setProducts(prod);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.product_name || !selectedProduct) return;
    setSubmitting(true);
    
    const existingItem = inventory.find(i => i.product_id === selectedProduct.id);
    if (existingItem) {
      toast.error("Ky produkt është tashmë në inventar");
      setSubmitting(false);
      return;
    }

    await base44.entities.Inventory.create({
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity: form.quantity,
      min_quantity: form.min_quantity,
      unit: selectedProduct.unit || "cope",
      notes: form.notes,
      last_restocked: moment().format("YYYY-MM-DD"),
    });
    
    setDialogOpen(false);
    setForm(emptyForm());
    setSelectedProduct(null);
    setSubmitting(false);
    toast.success("Produkti u shtua në inventar");
    loadData();
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    setSubmitting(true);
    await base44.entities.Inventory.update(editItem.id, {
      quantity: form.quantity,
      min_quantity: form.min_quantity,
      notes: form.notes,
      last_restocked: moment().format("YYYY-MM-DD"),
    });
    setEditItem(null);
    setForm(emptyForm());
    setSubmitting(false);
    toast.success("Inventari u ndryshua");
    loadData();
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Fshi ${item.product_name} nga inventari?`)) return;
    await base44.entities.Inventory.delete(item.id);
    toast.success("Produkti u fshi");
    loadData();
  };

  const openEdit = (item) => {
    setForm({
      product_name: item.product_name,
      quantity: item.quantity,
      min_quantity: item.min_quantity,
      unit: item.unit,
      notes: item.notes || "",
    });
    setEditItem(item);
  };

  const openCreate = () => {
    setForm(emptyForm());
    setSelectedProduct(null);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const lowStockItems = inventory.filter(i => i.quantity <= i.min_quantity);
  const totalItems = inventory.length;

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxhimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Inventari</h1>
        </div>
        <Button onClick={openCreate} className="gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Shto Produkt
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej Produktet</p>
          <p className="text-2xl font-bold mt-1">{totalItems}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Stok i Ulët</p>
          <p className={cn("text-2xl font-bold mt-1", lowStockItems.length > 0 ? "text-destructive" : "text-emerald-600")}>
            {lowStockItems.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Totali në Magazinë</p>
          <p className="text-2xl font-bold mt-1">{inventory.reduce((s, i) => s + i.quantity, 0)}</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 mb-1">Produktet me Stok të Ulët</p>
            <p className="text-sm text-amber-800">
              {lowStockItems.map(i => `${i.product_name} (${i.quantity} ${i.unit})`).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-semibold text-sm">{inventory.length} produkte në inventar</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Produkti</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Sasia</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Min Sasia</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Statusi</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Ristokuar</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                        <Package className="w-7 h-7 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">Inventari është bosh</p>
                    </div>
                  </td>
                </tr>
              ) : (
                inventory.map((item) => {
                  const isLowStock = item.quantity <= item.min_quantity;
                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold">{item.product_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold">{item.quantity} {item.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{item.min_quantity} {item.unit}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-xs font-semibold px-2.5 py-1 rounded-full",
                          isLowStock ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {isLowStock ? "Stok i Ulët" : "OK"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {item.last_restocked ? moment(item.last_restocked).format("DD MMM YY") : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => openEdit(item)}>
                              <Edit2 className="w-4 h-4 mr-2" /> Modifiko
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(item)} className="text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Fshi
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shto Produkt në Inventar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Zgjedh Produktin *</Label>
              <div className="mt-1.5 space-y-2 max-h-40 overflow-y-auto border border-border rounded-lg">
                {products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm transition-colors",
                      selectedProduct?.id === p.id ? "bg-primary text-white" : "hover:bg-muted"
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              {selectedProduct && (
                <p className="text-xs text-muted-foreground mt-2">Zgjedhur: <span className="font-semibold">{selectedProduct.name}</span></p>
              )}
            </div>
            <div>
              <Label>Sasia Fillestare *</Label>
              <Input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} className="mt-1.5" />
            </div>
            <div>
              <Label>Sasia Minimale</Label>
              <Input type="number" min="0" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: parseFloat(e.target.value) || 10 })} className="mt-1.5" />
            </div>
            <div>
              <Label>Shënime</Label>
              <Textarea placeholder="Shënime opsionale..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleCreate} disabled={submitting || !selectedProduct || form.quantity < 0}>
              {submitting ? "Duke krijuar..." : "Shto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) { setEditItem(null); setForm(emptyForm()); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifiko Inventarin — {editItem?.product_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Sasia</Label>
              <Input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} className="mt-1.5" />
            </div>
            <div>
              <Label>Sasia Minimale</Label>
              <Input type="number" min="0" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: parseFloat(e.target.value) || 10 })} className="mt-1.5" />
            </div>
            <div>
              <Label>Shënime</Label>
              <Textarea placeholder="Shënime opsionale..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditItem(null); setForm(emptyForm()); }}>Anulo</Button>
            <Button onClick={handleUpdate} disabled={submitting || form.quantity < 0}>
              {submitting ? "Duke ruajtur..." : "Ruaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}