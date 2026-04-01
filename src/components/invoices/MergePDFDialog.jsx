import { useState } from "react";
import { jsPDF } from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileText, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const safe = (str) =>
  String(str || "")
    .replace(/ë/g, "e").replace(/Ë/g, "E")
    .replace(/ç/g, "c").replace(/Ç/g, "C")
    .replace(/—/g, "-");

function buildInvoicePage(doc, inv, isFirst) {
  if (!isFirst) doc.addPage();
  const W = 210;
  const margin = 18;

  doc.setFillColor(67, 56, 202);
  doc.rect(0, 0, W, 48, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("ERP Finance", margin, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("finance@company.al  |  +355 69 000 0000", margin, 28);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("FATURE", W - margin, 22, { align: "right" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(safe(inv.invoice_number), W - margin, 30, { align: "right" });

  let y = 60;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(130, 130, 130);
  doc.text("FATURUAR PER", margin, y);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(safe(inv.client_name) || "-", margin, y + 6);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  if (inv.client_email) doc.text(safe(inv.client_email), margin, y + 12);
  if (inv.client_phone) doc.text(safe(inv.client_phone), margin, y + 18);

  const rx = W / 2 + 10;
  const detailRows = [
    ["Data:", inv.created_date ? new Date(inv.created_date).toLocaleDateString("sq-AL") : "-"],
    ["Afati:", inv.due_date || "-"],
    ["Metoda:", safe(inv.payment_method) || "-"],
    ["Statusi:", inv.is_open !== false ? "Hapur" : "Mbyllur"],
  ];
  doc.setFontSize(9);
  detailRows.forEach(([label, val], i) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(130, 130, 130);
    doc.text(label, rx, y + i * 7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(safe(val), W - margin, y + i * 7, { align: "right" });
  });

  y += 34;
  const colX = [margin, 58, 90, 112, 136, 162, W - margin];
  const headers = ["Pershkrimi", "Lloji", "Sasi", "Njesia", "Cm. pa TVSH", "TVSH%", "Total"];
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, W - margin * 2, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  const hPos = [colX[0]+2, colX[1]+2, colX[2]+20, colX[3]+18, colX[4]+20, colX[5]+14, W - margin - 2];
  const hAligns = ["left","left","right","right","right","right","right"];
  headers.forEach((h, i) => doc.text(h, hPos[i], y + 5.5, { align: hAligns[i] }));

  y += 10;
  const items = inv.items || [];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  items.forEach((item, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y - 2, W - margin * 2, 8, "F");
    }
    doc.setTextColor(30, 30, 30);
    doc.text(safe(item.name) || "-", colX[0] + 2, y + 4);
    doc.text(item.type === "product" ? "Produkt" : "Sherbim", colX[1] + 2, y + 4);
    doc.text(String(item.quantity ?? 0), colX[2] + 20, y + 4, { align: "right" });
    doc.text(safe(item.unit) || "-", colX[3] + 2, y + 4);
    doc.text(`E${(item.price_ex_vat || 0).toFixed(2)}`, colX[4] + 20, y + 4, { align: "right" });
    doc.text(`${item.vat_rate || 0}%`, colX[5] + 14, y + 4, { align: "right" });
    doc.text(`E${(item.line_total || 0).toFixed(2)}`, W - margin - 2, y + 4, { align: "right" });
    y += 8;
  });

  y += 6;
  const boxX = W / 2 + 10;
  const boxW = W - margin - boxX;
  doc.setFontSize(9);
  [["Subtotal (pa TVSH)", `E${(inv.subtotal || 0).toFixed(2)}`], ["TVSH", `E${(inv.vat_amount || 0).toFixed(2)}`]].forEach(([label, val], i) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(label, boxX, y + i * 8);
    doc.text(val, W - margin, y + i * 8, { align: "right" });
  });
  y += 18;
  doc.setFillColor(67, 56, 202);
  doc.rect(boxX, y, boxW, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL ME TVSH", boxX + 3, y + 6.8);
  doc.text(`E${(inv.amount || 0).toFixed(2)}`, W - margin - 2, y + 6.8, { align: "right" });

  doc.setFillColor(243, 244, 246);
  doc.rect(0, 282, W, 15, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(130, 130, 130);
  doc.text("Faleminderit per besimin tuaj!", W / 2, 290, { align: "center" });
}

const TODAY = new Date().toISOString().slice(0, 10);

export default function MergePDFDialog({ invoices, open, onClose }) {
  const [dateFrom, setDateFrom] = useState(TODAY);
  const [dateTo, setDateTo] = useState(TODAY);
  const [generating, setGenerating] = useState(false);

  const setPreset = (days) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(to.toISOString().slice(0, 10));
  };

  const filtered = invoices.filter((inv) => {
    if (!inv.created_date) return false;
    const d = inv.created_date.slice(0, 10);
    return d >= dateFrom && d <= dateTo;
  });

  const generate = async () => {
    if (filtered.length === 0) return;
    setGenerating(true);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    filtered.forEach((inv, i) => buildInvoicePage(doc, inv, i === 0));
    doc.save(`faturat_merge_${dateFrom}_${dateTo}.pdf`);
    setGenerating(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Merge PDF — Shkarko Faturat
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Quick presets */}
          <div>
            <Label className="mb-2 block text-xs text-muted-foreground uppercase tracking-widest">Periudha e shpejtë</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Sot", days: 1 },
                { label: "7 ditë", days: 7 },
                { label: "15 ditë", days: 15 },
                { label: "30 ditë", days: 30 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => setPreset(days)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-white hover:bg-muted transition"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Nga data</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">Deri më</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          {/* Preview count */}
          <div className={cn(
            "rounded-xl p-4 text-sm border",
            filtered.length > 0 ? "bg-primary/5 border-primary/20 text-primary" : "bg-muted border-border text-muted-foreground"
          )}>
            {filtered.length > 0
              ? <><span className="font-bold">{filtered.length}</span> fatura të gjetura në këtë periudhë</>
              : "Nuk ka fatura në periudhën e zgjedhur"}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anulo</Button>
          <Button onClick={generate} disabled={filtered.length === 0 || generating} className="gap-2">
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Duke gjeneruar...</> : <><FileText className="w-4 h-4" /> Shkarko PDF ({filtered.length})</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}