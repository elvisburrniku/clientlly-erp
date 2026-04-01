import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Plus, Image as ImageIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProductCatalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "product",
    description: "",
    price_ex_vat: 0,
    vat_rate: 20,
    unit: "cope",
    is_active: true,
    image_url: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await base44.entities.Product.list("-created_date", 100);
      setProducts(data.filter(p => p.is_active !== false));
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setForm({ ...form, image_url: result.file_url });
      toast.success("Fotoja u ngarkua");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Gabim gjatë ngarkimit");
    }
  };

  const handleCreate = async () => {
    if (!form.name || form.price_ex_vat < 0) {
      toast.error("Emri dhe çmimi janë të domosdoshëm");
      return;
    }

    setSubmitting(true);
    try {
      if (editProduct) {
        await base44.entities.Product.update(editProduct.id, form);
        toast.success("Produkti u ndryshua");
      } else {
        await base44.entities.Product.create(form);
        toast.success("Produkti u krijua");
      }
      setDialogOpen(false);
      setForm({ name: "", type: "product", description: "", price_ex_vat: 0, vat_rate: 20, unit: "cope", is_active: true, image_url: "" });
      setEditProduct(null);
      loadProducts();
    } catch (err) {
      console.error("Error:", err);
      toast.error("Gabim gjatë ruajjes");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (product) => {
    setForm(product);
    setEditProduct(product);
    setDialogOpen(true);
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Fshi produktin "${product.name}"?`)) return;
    try {
      await base44.entities.Product.update(product.id, { is_active: false });
      toast.success("Produkti u fshi");
      loadProducts();
    } catch (err) {
      toast.error("Gabim gjatë fshirjes");
    }
  };

  const filtered = products.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || p.type === filterType;
    return matchSearch && matchType;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxhimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Katalogu i Produkteve</h1>
        </div>
        <Button onClick={() => { setForm({ name: "", type: "product", description: "", price_ex_vat: 0, vat_rate: 20, unit: "cope", is_active: true, image_url: "" }); setEditProduct(null); setDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Shto Produkt
        </Button>
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Kërko produkte..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Të gjitha</SelectItem>
                <SelectItem value="product">Produktet</SelectItem>
                <SelectItem value="service">Shërbimet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <ImageIcon className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Nuk ka produkte</p>
          </div>
        ) : (
          filtered.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden hover:shadow-md transition-all group">
              {/* Product Image */}
              <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                )}
              </div>

              {/* Product Info */}
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    {product.type === "product" ? "Produkt" : "Shërbim"}
                  </p>
                  <h3 className="font-semibold text-foreground">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                  )}
                </div>

                <div className="border-t border-border pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Çmimi (pa TVSH)</span>
                    <span className="font-medium">€{(product.price_ex_vat || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TVSH</span>
                    <span className="font-medium">{product.vat_rate || 0}%</span>
                  </div>
                  <div className="flex justify-between font-semibold bg-muted/30 rounded-lg p-2">
                    <span>Me TVSH</span>
                    <span className="text-primary">€{((product.price_ex_vat || 0) * (1 + (product.vat_rate || 0) / 100)).toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Njësia: {product.unit || "cope"}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3">
                  <Button variant="outline" onClick={() => openEdit(product)} className="flex-1 text-xs">
                    Modifiko
                  </Button>
                  <Button variant="outline" onClick={() => handleDelete(product)} className="flex-1 text-xs text-destructive hover:text-destructive">
                    Fshi
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? "Modifiko Produktin" : "Shto Produkt të Ri"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label>Emri *</Label>
              <Input placeholder="Emri i produktit" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lloji</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Produkt</SelectItem>
                    <SelectItem value="service">Shërbim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Njësia</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cope">cope</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="ore">ore</SelectItem>
                    <SelectItem value="m2">m²</SelectItem>
                    <SelectItem value="l">l</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Çmimi (pa TVSH) *</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.price_ex_vat} onChange={(e) => setForm({ ...form, price_ex_vat: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>TVSH %</Label>
                <Select value={String(form.vat_rate)} onValueChange={(v) => setForm({ ...form, vat_rate: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="6">6%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Përshkrimi</Label>
              <Textarea placeholder="Përshkrimi i produktit..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Fotoja</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/30 transition cursor-pointer">
                <input type="file" accept="image/*" onChange={handleUploadImage} className="hidden" id="image-upload" />
                <label htmlFor="image-upload" className="cursor-pointer">
                  {form.image_url ? (
                    <div>
                      <img src={form.image_url} alt="Preview" className="w-20 h-20 object-cover rounded-lg mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Klikoni për të ndryshuar</p>
                    </div>
                  ) : (
                    <div>
                      <ImageIcon className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Ngarkoni një fotë</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleCreate} disabled={submitting || !form.name}>
              {submitting ? "Duke ruajtur..." : editProduct ? "Ruaj Ndryshimet" : "Krijo Produktin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}