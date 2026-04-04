import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Barcode, Printer, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function generateBarcode128(text) {
  const CODE128_START_B = 104;
  const patterns = {
    " ": "11011001100", "!": "11001101100", '"': "11001100110", "#": "10010011000",
    "$": "10010001100", "%": "10001001100", "&": "10011001000", "'": "10011000100",
    "(": "10001100100", ")": "11001001000", "*": "11001000100", "+": "11000100100",
    ",": "10110011100", "-": "10011011100", ".": "10011001110", "/": "10111001100",
    "0": "10011101100", "1": "11001110010", "2": "11001011100", "3": "11110010010",
    "4": "11110010100", "5": "10100110000", "6": "10100001100", "7": "10010110000",
    "8": "10010000110", "9": "10000101100", ":": "10000100110", ";": "10110010000",
    "<": "10110000100", "=": "10011010000", ">": "10011000010", "?": "10000110100",
    "@": "10000110010", "A": "11000010010", "B": "11001010000", "C": "11110111010",
    "D": "11000010100", "E": "10001111010", "F": "10100111100", "G": "10010111100",
    "H": "10010011110", "I": "10111100100", "J": "10011110100", "K": "10011110010",
    "L": "11110100100", "M": "11110010010", "N": "11110010100", "O": "11010111100",
    "P": "11010011110", "Q": "11110101100", "R": "11110100110", "S": "10101111000",
    "T": "10100011110", "U": "10001011110", "V": "10111101000", "W": "10111100010",
    "X": "11110101000", "Y": "11110100010", "Z": "10111011110", "[": "10111101110",
    "\\": "11101011110", "]": "11110101110", "^": "11010000100", "_": "11010010000",
    "`": "11010011100"
  };
  for (let i = 97; i <= 122; i++) {
    const lower = String.fromCharCode(i);
    const upper = String.fromCharCode(i - 32);
    if (patterns[upper]) patterns[lower] = patterns[upper];
  }

  let binary = "11010010000";
  let checksum = CODE128_START_B;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const val = ch.charCodeAt(0) - 32;
    checksum += val * (i + 1);
    binary += patterns[ch] || "11011001100";
  }
  const checkChar = String.fromCharCode((checksum % 103) + 32);
  binary += patterns[checkChar] || "11011001100";
  binary += "1100011101011";

  return binary;
}

function BarcodeCanvas({ value, width = 200, height = 60 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const binary = generateBarcode128(value);
    const barWidth = width / binary.length;

    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#000000";

    for (let i = 0; i < binary.length; i++) {
      if (binary[i] === "1") {
        ctx.fillRect(i * barWidth, 0, barWidth, height);
      }
    }
  }, [value, width, height]);

  if (!value) return null;
  return <canvas ref={canvasRef} style={{ width, height }} />;
}

function LabelPreview({ product, size = "medium" }) {
  const sizes = {
    small: { w: "w-48", h: "h-28", textSize: "text-[10px]", barcodeW: 140, barcodeH: 35 },
    medium: { w: "w-64", h: "h-36", textSize: "text-xs", barcodeW: 180, barcodeH: 45 },
    large: { w: "w-80", h: "h-44", textSize: "text-sm", barcodeW: 240, barcodeH: 55 },
  };
  const s = sizes[size] || sizes.medium;

  return (
    <div className={cn("bg-white border-2 border-dashed border-border rounded-lg p-3 flex flex-col items-center justify-center gap-1", s.w, s.h)}>
      <p className={cn("font-bold text-center", s.textSize)}>{product.name}</p>
      {product.sku && <p className="text-[9px] text-muted-foreground">SKU: {product.sku}</p>}
      {product.barcode ? (
        <>
          <BarcodeCanvas value={product.barcode} width={s.barcodeW} height={s.barcodeH} />
          <p className="text-[9px] font-mono tracking-wider">{product.barcode}</p>
        </>
      ) : (
        <p className="text-[9px] text-muted-foreground italic">Pa barkod</p>
      )}
      {product.price > 0 && <p className={cn("font-bold", s.textSize)}>€{(product.price || 0).toFixed(2)}</p>}
    </div>
  );
}

export default function BarcodeLabels() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [editBarcode, setEditBarcode] = useState(null);
  const [barcodeValue, setBarcodeValue] = useState("");
  const [labelSize, setLabelSize] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.Product.list("name", 500);
    setProducts(data);
    setLoading(false);
  };

  const handleSaveBarcode = async () => {
    if (!editBarcode) return;
    setSubmitting(true);
    await base44.entities.Product.update(editBarcode.id, { barcode: barcodeValue });
    toast.success("Barkodi u ruajt");
    setEditBarcode(null);
    setBarcodeValue("");
    setSubmitting(false);
    loadData();
  };

  const generateAutoBarcode = (product) => {
    const prefix = "ERP";
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const id = product.id.slice(0, 4).toUpperCase();
    return `${prefix}${id}${timestamp}`;
  };

  const toggleSelect = (product) => {
    setSelectedProducts(prev =>
      prev.find(p => p.id === product.id)
        ? prev.filter(p => p.id !== product.id)
        : [...prev, product]
    );
  };

  const printLabels = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("Lejo popup-et për printim"); return; }

    const labelsHtml = selectedProducts.map(product => `
      <div style="display:inline-block;border:1px dashed #ccc;padding:12px;margin:8px;text-align:center;page-break-inside:avoid;">
        <div style="font-weight:bold;font-size:14px;margin-bottom:4px;">${product.name}</div>
        ${product.sku ? `<div style="font-size:10px;color:#666;">SKU: ${product.sku}</div>` : ""}
        ${product.barcode ? `<div style="font-family:monospace;font-size:18px;letter-spacing:3px;margin:8px 0;">${product.barcode}</div>` : ""}
        ${product.price > 0 ? `<div style="font-weight:bold;font-size:16px;">€${(product.price || 0).toFixed(2)}</div>` : ""}
      </div>
    `).join("");

    printWindow.document.write(`
      <html><head><title>Etiketat</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;}@media print{body{padding:0;}}</style>
      </head><body>${labelsHtml}
      <script>window.onload=function(){window.print();}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold tracking-tight">Barkode & Etiketa</h1>
        </div>
        {selectedProducts.length > 0 && (
          <Button onClick={printLabels} className="gap-2 self-start sm:self-auto" data-testid="button-print-labels">
            <Printer className="w-4 h-4" /> Printo {selectedProducts.length} Etiketa
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Produktet me Barkod</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600" data-testid="text-products-with-barcode">{products.filter(p => p.barcode).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pa Barkod</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{products.filter(p => !p.barcode).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Zgjedhur për Printim</p>
          <p className="text-2xl font-bold mt-1 text-primary">{selectedProducts.length}</p>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Kërko produkte..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" data-testid="input-search-barcode" />
        </div>
        <div className="flex bg-white rounded-xl border border-border/60 p-1 gap-1">
          {["small", "medium", "large"].map(s => (
            <button key={s} onClick={() => setLabelSize(s)} className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg transition-all", labelSize === s ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted")} data-testid={`button-size-${s}`}>
              {s === "small" ? "Vogël" : s === "medium" ? "Mesatare" : "Madhe"}
            </button>
          ))}
        </div>
      </div>

      {selectedProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-sm">Parapamje Etiketash ({selectedProducts.length})</p>
            <Button variant="outline" size="sm" onClick={() => setSelectedProducts([])}>Pastro Zgjedhjen</Button>
          </div>
          <div className="flex flex-wrap gap-4">
            {selectedProducts.map(p => (
              <LabelPreview key={p.id} product={p} size={labelSize} />
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-semibold text-sm">{filtered.length} produkte</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5 w-10">
                  <input type="checkbox" checked={selectedProducts.length === filtered.length && filtered.length > 0} onChange={e => setSelectedProducts(e.target.checked ? [...filtered] : [])} className="w-4 h-4 rounded" />
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Produkti</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">SKU</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Barkodi</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Çmimi</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                        <Package className="w-7 h-7 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">Nuk ka produkte</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(product => {
                  const isSelected = selectedProducts.find(p => p.id === product.id);
                  return (
                    <tr key={product.id} className={cn("hover:bg-muted/20 transition-colors", isSelected && "bg-primary/5")} data-testid={`row-product-barcode-${product.id}`}>
                      <td className="px-6 py-4">
                        <input type="checkbox" checked={!!isSelected} onChange={() => toggleSelect(product)} className="w-4 h-4 rounded" />
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">{product.name}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{product.sku || "—"}</td>
                      <td className="px-6 py-4">
                        {product.barcode ? (
                          <div className="flex items-center gap-2">
                            <Barcode className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-mono">{product.barcode}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Pa barkod</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">€{(product.price || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-1.5 justify-end">
                          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { setEditBarcode(product); setBarcodeValue(product.barcode || ""); }} data-testid={`button-edit-barcode-${product.id}`}>
                            <Barcode className="w-3 h-3" /> Barkod
                          </Button>
                          {!product.barcode && (
                            <Button size="sm" variant="outline" className="text-xs" onClick={async () => {
                              const code = generateAutoBarcode(product);
                              await base44.entities.Product.update(product.id, { barcode: code });
                              toast.success("Barkodi u gjenerua");
                              loadData();
                            }} data-testid={`button-auto-barcode-${product.id}`}>
                              Auto
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!editBarcode} onOpenChange={o => { if (!o) { setEditBarcode(null); setBarcodeValue(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Barkodi — {editBarcode?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Vlera e Barkodit</Label>
              <Input placeholder="P.sh. 5901234123457" value={barcodeValue} onChange={e => setBarcodeValue(e.target.value)} className="mt-1.5 font-mono" data-testid="input-barcode-value" />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setBarcodeValue(generateAutoBarcode(editBarcode))}>
                Gjenero Automatikisht
              </Button>
              {barcodeValue && (
                <Button type="button" variant="outline" size="sm" onClick={() => setBarcodeValue("")}>
                  Pastro
                </Button>
              )}
            </div>
            {barcodeValue && (
              <div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground">Parapamje</p>
                <BarcodeCanvas value={barcodeValue} width={250} height={60} />
                <p className="text-sm font-mono tracking-wider">{barcodeValue}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditBarcode(null); setBarcodeValue(""); }}>Anulo</Button>
            <Button onClick={handleSaveBarcode} disabled={submitting} data-testid="button-save-barcode">
              {submitting ? "Duke ruajtur..." : "Ruaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
