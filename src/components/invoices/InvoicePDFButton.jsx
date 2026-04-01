import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";

// jsPDF built-in fonts don't support Albanian chars - use ASCII-safe versions
const safe = (str) =>
  String(str || "")
    .replace(/ë/g, "e").replace(/Ë/g, "E")
    .replace(/ç/g, "c").replace(/Ç/g, "C")
    .replace(/—/g, "-");

export default function InvoicePDFButton({ invoice }) {
  const generate = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210;
    const margin = 18;

    // Header band
    doc.setFillColor(67, 56, 202);
    doc.rect(0, 0, W, 48, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ERP Finance", margin, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("finance@company.al  |  +355 69 000 0000", margin, 28);
    doc.text("Tirane, Shqiperi", margin, 34);

    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("FATURE", W - margin, 22, { align: "right" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(safe(invoice.invoice_number), W - margin, 30, { align: "right" });

    // Info section
    let y = 60;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(130, 130, 130);
    doc.text("FATURUAR PER", margin, y);
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(safe(invoice.client_name) || "-", margin, y + 6);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    if (invoice.client_email) doc.text(safe(invoice.client_email), margin, y + 12);
    if (invoice.client_phone) doc.text(safe(invoice.client_phone), margin, y + 18);

    const rx = W / 2 + 10;
    const detailRows = [
      ["Data e leshimit:", invoice.created_date ? new Date(invoice.created_date).toLocaleDateString("sq-AL") : "-"],
      ["Afati i pages.:", invoice.due_date || "-"],
      ["Metoda:", safe(invoice.payment_method) || "-"],
      ["Statusi:", invoice.is_open !== false ? "Hapur" : "Mbyllur"],
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

    // Table
    y += 34;
    const colX = [margin, 58, 90, 112, 136, 162, W - margin];
    const headers = ["Pershkrimi", "Lloji", "Sasi", "Njesia", "Cm. pa TVSH", "TVSH%", "Total"];

    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, W - margin * 2, 8, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    // left-aligned: 0,1 | right-aligned: 2,3,4,5,6
    const hAligns = ["left","left","right","right","right","right","right"];
    const hPositions = [colX[0]+2, colX[1]+2, colX[2]+20, colX[3]+18, colX[4]+20, colX[5]+14, W - margin - 2];
    headers.forEach((h, i) => {
      doc.text(h, hPositions[i], y + 5.5, { align: hAligns[i] });
    });

    y += 10;
    const items = invoice.items || [];
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

    // Totals
    y += 6;
    const boxX = W / 2 + 10;
    const boxW = W - margin - boxX;

    doc.setFontSize(9);
    [
      ["Subtotal (pa TVSH)", `E${(invoice.subtotal || 0).toFixed(2)}`],
      ["TVSH", `E${(invoice.vat_amount || 0).toFixed(2)}`],
    ].forEach(([label, val], i) => {
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
    doc.text(`E${(invoice.amount || 0).toFixed(2)}`, W - margin - 2, y + 6.8, { align: "right" });

    if (invoice.description) {
      y += 18;
      doc.setTextColor(130, 130, 130);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("SHENIME", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      const lines = doc.splitTextToSize(safe(invoice.description), W - margin * 2);
      doc.text(lines, margin, y + 6);
    }

    doc.setFillColor(243, 244, 246);
    doc.rect(0, 282, W, 15, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130, 130, 130);
    doc.text("Faleminderit per besimin tuaj!", W / 2, 290, { align: "center" });

    doc.save(`${invoice.invoice_number}.pdf`);
  };

  return (
    <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={generate}>
      <Download className="w-3 h-3" /> PDF
    </Button>
  );
}