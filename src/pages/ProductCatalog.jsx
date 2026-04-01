import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, Trash2, MoreHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const emptyForm = () => ({
  name: "",
  type: "service",
  price_ex_vat: 0,
  vat_rate: 20,
  unit: "cope",
  is_active: true,
});

export default function ProductCatalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const data = await base44.entities.Product.list("-created_date", 500);
    setProducts(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name || form.price_ex_vat < 0) {
      toast.error("Emri dhe çmimi janë të detyrueshëm");
      return;
    }
    setSubmitting(true);

    await base44.entities.Product.create(form);
    setDialogOpen(false);
    setForm(emptyForm());
    toast.success("Produkti u krijua");
    loadData();
    setSubmitting(false);
  };

  const handleUpdate = async () => {
    if (!editProduct || !form.name) return;
    setSubmitting(true);

    await base44.entities.Product.update(editProduct.id, form);
    setEditProduct(null);
    setForm(emptyForm());
    toast.success("Produkti u përditësua");
    loadData();
    setSubmitting(false);
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Fshi produktin "${product.name}"?`)) return;
    await base44.entities.Product.delete(product.id);
    toast.success("Produkti u fshi");
    loadData();
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setForm(product);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) && 
    (p.is_active !== false)
  );

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxhimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Katalog Produkte/Shërbime</h1>
        </div>
        <Button onClick={() => { setEditProduct(null); setForm(emptyForm()); setDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Produkti i Ri
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-4">
        <div className="flex gap-2">
          <Search className="w-4 h-4 text-muted-foreground mt-2.5" />
          <Input placeholder="Kërko sipas emrit..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-semibold text-sm">{filtered.length} produkte</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Emri</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Lloji</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Çm. pa TVSH</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">TVSH</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Njësia</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center" />
                      <p className="text-sm text-muted-foreground font-medium">Nuk ka produkte</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold">{product.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium bg-muted px-2.5 py-1 rounded-full capitalize">
                        {product.type === "product" ? "Produkt" : "Shërbim"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">€{(product.price_ex_vat || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{product.vat_rate || 0}%</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{product.unit || "cope"}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5 justify-end items-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(product)}>
                              <Edit2 className="w-4 h-4 mr-2" /> Redakto
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(product)} className="text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Fshi
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editProduct ? "Redakto Produktin" : "Produkti i Ri"}</DialogTitle>
            <DialogDescription>{editProduct ? "Përditëso të dhënat" : "Shto një produkti ose shërbim të ri"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Emri *</Label>
              <Input placeholder="p.sh. Konsultim IT" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Lloji</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Produkt</SelectItem>
                  <SelectItem value="service">Shërbim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Çmim pa TVSH *</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.price_ex_vat} onChange={(e) => setForm({ ...form, price_ex_vat: parseFloat(e.target.value) || 0 })} className="mt-1.5" />
              </div>
              <div>
                <Label>TVSH %</Label>
                <Select value={String(form.vat_rate)} onValueChange={(v) => setForm({ ...form, vat_rate: parseFloat(v) })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Njësia</Label>
              <Input placeholder="cope, kg, ore, m2..." value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="mt-1.5" />
            </div>
            {editProduct && (
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                <Label className="mb-0">Aktiv</Label>
                <input type="checkbox" checked={form.is_active !== false} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 cursor-pointer" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={editProduct ? handleUpdate : handleCreate} disabled={submitting || !form.name}>
              {submitting ? "Duke ruajtur..." : editProduct ? "Përditëso" : "Krijo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}