import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";

export default function InvoicePDFButton({ invoice }) {
  const generate = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210;
    const margin = 18;

    // ── Background header band ──
    doc.setFillColor(67, 56, 202); // indigo-700
    doc.rect(0, 0, W, 48, "F");

    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ERP Finance", margin, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("finance@company.al  |  +355 69 000 0000", margin, 28);
    doc.text("Tiranë, Shqipëri", margin, 34);

    // FATURË label top right
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("FATURË", W - margin, 22, { align: "right" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.invoice_number, W - margin, 30, { align: "right" });

    // ── Info section ──
    let y = 60;
    doc.setTextColor(30, 30, 30);

    // Left: Bill to
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(130, 130, 130);
    doc.text("FATURUAR PËR", margin, y);
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.client_name || "—", margin, y + 6);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    if (invoice.client_email) doc.text(invoice.client_email, margin, y + 12);
    if (invoice.client_phone) doc.text(invoice.client_phone, margin, y + 18);

    // Right: Invoice details
    const rx = W / 2 + 10;
    const detailRows = [
      ["Data e lëshimit:", invoice.created_date ? new Date(invoice.created_date).toLocaleDateString("sq-AL") : "—"],
      ["Afati i pagesës:", invoice.due_date || "—"],
      ["Metoda:", invoice.payment_method || "—"],
      ["Statusi:", invoice.is_open !== false ? "Hapur" : "Mbyllur"],
    ];
    doc.setFontSize(9);
    detailRows.forEach(([label, val], i) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(130, 130, 130);
      doc.text(label, rx, y + i * 7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(val, W - margin, y + i * 7, { align: "right" });
    });

    // ── Table ──
    y += 34;
    const colX = [margin, 60, 95, 118, 141, 165, W - margin];
    const headers = ["Përshkrimi", "Lloji", "Sasi", "Njësia", "Çm. pa TVSH", "TVSH%", "Total"];

    // Header row
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, W - margin * 2, 8, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    headers.forEach((h, i) => {
      const align = i >= 2 ? "right" : "left";
      doc.text(h, i < 2 ? colX[i] + 2 : colX[i + 1] - 1, y + 5.5, { align });
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
      doc.text(item.name || "—", colX[0] + 2, y + 4);
      doc.text(item.type === "product" ? "Produkt" : "Shërbim", colX[1] + 2, y + 4);
      doc.text(String(item.quantity ?? "—"), colX[3] - 1, y + 4, { align: "right" });
      doc.text(item.unit || "—", colX[3] + 2, y + 4);
      doc.text(`€${(item.price_ex_vat || 0).toFixed(2)}`, colX[5] - 1, y + 4, { align: "right" });
      doc.text(`${item.vat_rate || 0}%`, colX[5] + 2, y + 4);
      doc.text(`€${(item.line_total || 0).toFixed(2)}`, W - margin - 2, y + 4, { align: "right" });
      y += 8;
    });

    // ── Totals box ──
    y += 6;
    const boxX = W / 2 + 10;
    const boxW = W - margin - boxX;

    const totalRows = [
      ["Subtotal (pa TVSH)", `€${(invoice.subtotal || 0).toFixed(2)}`],
      ["TVSH", `€${(invoice.vat_amount || 0).toFixed(2)}`],
    ];

    doc.setFontSize(9);
    totalRows.forEach(([label, val], i) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(label, boxX, y + i * 8);
      doc.text(val, W - margin, y + i * 8, { align: "right" });
    });

    y += totalRows.length * 8 + 2;
    // Total line
    doc.setFillColor(67, 56, 202);
    doc.rect(boxX, y, boxW, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL ME TVSH", boxX + 3, y + 6.8);
    doc.text(`€${(invoice.amount || 0).toFixed(2)}`, W - margin - 2, y + 6.8, { align: "right" });

    // ── Notes ──
    if (invoice.description) {
      y += 18;
      doc.setTextColor(130, 130, 130);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("SHËNIME", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      const lines = doc.splitTextToSize(invoice.description, W - margin * 2);
      doc.text(lines, margin, y + 6);
    }

    // ── Footer ──
    doc.setFillColor(243, 244, 246);
    doc.rect(0, 282, W, 15, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130, 130, 130);
    doc.text("Faleminderit për besimin tuaj!", W / 2, 290, { align: "center" });

    doc.save(`${invoice.invoice_number}.pdf`);
  };

  return (
    <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={generate}>
      <Download className="w-3 h-3" /> PDF
    </Button>
  );
}