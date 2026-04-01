import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import { base44 } from "@/api/base44Client";
import moment from "moment";

const safe = (str) =>
  String(str || "")
    .replace(/ë/g, "e").replace(/Ë/g, "E")
    .replace(/ç/g, "c").replace(/Ç/g, "C")
    .replace(/—/g, "-");

export default function ReportPDFExport({ dateFrom, dateTo, categoryFilter, chartData }) {
  const generatePDF = async () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210;
      const margin = 15;

      // Header
      doc.setFillColor(67, 56, 202);
      doc.rect(0, 0, W, 30, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Raporti Financiar", margin, 12);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Gjeneruar: ${new Date().toLocaleDateString("sq-AL")}`, margin, 19);
      doc.text(`Intervali: ${moment(dateFrom).format("DD MMM YYYY")} - ${moment(dateTo).format("DD MMM YYYY")}`, margin, 24);

      let y = 45;

      // Filter info
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const filterText = categoryFilter === "all" ? "Të gjitha kategoritë" : (categoryFilter === "product" ? "Produktet" : "Shërbimet");
      doc.text(`Filtri: ${filterText}`, margin, y);
      y += 8;

      // Summary section
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Përmbledhje Financiare", margin, y);
      y += 8;

      const totalRevenue = chartData.reduce((s, m) => s + m.revenue, 0);
      const totalExpenses = chartData.reduce((s, m) => s + m.expenses, 0);
      const totalProfit = totalRevenue - totalExpenses;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);

      const summaryData = [
        ["Të Ardhura Totale", `€${totalRevenue.toFixed(2)}`],
        ["Shpenzime Totale", `€${totalExpenses.toFixed(2)}`],
        ["Fitim Neto", `€${totalProfit.toFixed(2)}`],
        ["Mesatare Mujore (Të Ardhura)", `€${(totalRevenue / (chartData.length || 1)).toFixed(2)}`],
        ["Mesatare Mujore (Shpenzime)", `€${(totalExpenses / (chartData.length || 1)).toFixed(2)}`],
      ];

      summaryData.forEach(([label, value]) => {
        doc.text(label, margin, y);
        doc.text(value, W - margin, y, { align: "right" });
        y += 6;
      });

      // Details section
      y += 6;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Detajet Mujore", margin, y);
      y += 8;

      // Table headers
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y - 4, W - margin * 2, 6, "F");
      doc.text("Muaji", margin + 2, y);
      doc.text("Të Ardhura", margin + 40, y);
      doc.text("Shpenzime", margin + 80, y);
      doc.text("Fitim", margin + 120, y);
      y += 7;

      // Table rows
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);

      chartData.forEach((item, idx) => {
        if (idx % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(margin, y - 3.5, W - margin * 2, 6, "F");
        }
        doc.text(item.month, margin + 2, y);
        doc.text(`€${item.revenue.toFixed(2)}`, margin + 40, y);
        doc.text(`€${item.expenses.toFixed(2)}`, margin + 80, y);
        doc.text(`€${item.profit.toFixed(2)}`, margin + 120, y);
        y += 6;

        if (y > 250) {
          doc.addPage();
          y = 20;
        }
      });

      // Footer
      doc.setFillColor(67, 56, 202);
      doc.rect(0, 277, W, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("Ky raport është gjeneruar automatikisht nga sistemi ERP Finance", W / 2, 284, { align: "center" });

      const fileName = `raporti_financiar_${moment(dateFrom).format("DD-MM-YYYY")}_${moment(dateTo).format("DD-MM-YYYY")}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("PDF generation error:", err);
    }
  };

  return (
    <Button onClick={generatePDF} className="gap-2">
      <Download className="w-4 h-4" /> Eksporto PDF
    </Button>
  );
}