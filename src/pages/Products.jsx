import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Pencil, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const emptyForm = () => ({
  name: "",
  type: "service",
  description: "",
  price_ex_vat: 0,
  vat_rate: 20,
  unit: "cope",
  is_active: true,
});

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await base44.entities.Product.list("-created_date", 100);
      setProducts(data);
    } catch (err) {
      console.error("Load error:", err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name || form.price_ex_vat < 0) {
      toast.error("Plotësoni të gjitha fushat e detyrueshme");
      return;
    }
    setSubmitting(true);
    try {
      if (editId) {
        await base44.entities.Product.update(editId, form);
        toast.success("Produkti u përditësua");
      } else {
        await base44.entities.Product.create(form);
        toast.success("Produkti u shtua");
      }
      setForm(emptyForm());
      setEditId(null);
      setDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error("Gabim në ruajtje");
    }
    setSubmitting(false);
  };

  const handleEdit = (prod) => {
    setForm(prod);
    setEditId(prod.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Fshi këtë produkt?")) return;
    try {
      await base44.entities.Product.delete(id);
      toast.success("Produkti u fshi");
      loadData();
    } catch (err) {
      toast.error("Gabim në fshirje");
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxhimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Produktet & Shërbimet</h1>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setEditId(null); setDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Shto Produkt
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej Produktesh</p>
          <p className="text-2xl font-bold mt-1">{products.filter(p => p.is_active).length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">aktivë</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Shërbime vs Produkte</p>
          <p className="text-2xl font-bold mt-1">
            {products.filter(p => p.type === "service" && p.is_active).length} / {products.filter(p => p.type === "product" && p.is_active).length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">shërbime / produkte</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-semibold text-sm">{products.length} produktesh</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Emri</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Lloji</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Çmim pa TVSH</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">TVSH</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Njësia</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Statusi</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Nuk ka produktesh të regjistruar</p>
                  </td>
                </tr>
              ) : (
                products.map(prod => (
                  <tr key={prod.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4"><span className="text-sm font-semibold">{prod.name}</span></td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium bg-muted px-2.5 py-1 rounded-full capitalize">
                        {prod.type === "product" ? "Produkt" : "Shërbim"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">€{(prod.price_ex_vat || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{prod.vat_rate || 20}%</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{prod.unit || "cope"}</td>
                    <td className="px-6 py-4">
                      <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", prod.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                        {prod.is_active ? "Aktiv" : "Joaktiv"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(prod)}>
                            <Pencil className="w-4 h-4 mr-2" /> Modifiko
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(prod.id)} className="text-destructive focus:text-destructive">
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setForm(emptyForm()); setEditId(null); } setDialogOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifiko Produktin" : "Shto Produkt të Ri"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Emri *</Label>
              <Input placeholder="P.sh. Dizajn Web" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Lloji *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Produkt</SelectItem>
                  <SelectItem value="service">Shërbim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Përshkrimi</Label>
              <Textarea placeholder="Përshkrimi detajuar..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Çmim pa TVSH (EUR) *</Label>
                <Input type="number" placeholder="0.00" value={form.price_ex_vat} onChange={(e) => setForm({ ...form, price_ex_vat: parseFloat(e.target.value) || 0 })} className="mt-1.5" step="0.01" />
              </div>
              <div>
                <Label>TVSH %</Label>
                <Input type="number" placeholder="20" value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: parseFloat(e.target.value) || 20 })} className="mt-1.5" step="1" />
              </div>
            </div>
            <div>
              <Label>Njësia Matëse</Label>
              <Input placeholder="cope, kg, ore, m2..." value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setForm(emptyForm()); setEditId(null); setDialogOpen(false); }}>Anulo</Button>
            <Button onClick={handleSave} disabled={submitting}>{submitting ? "Duke ruajtur..." : editId ? "Përditëso" : "Shto"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}