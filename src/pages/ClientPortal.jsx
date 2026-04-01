import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Download, FileText, Eye, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import moment from "moment";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

const safe = (str) =>
  String(str || "")
    .replace(/ë/g, "e").replace(/Ë/g, "E")
    .replace(/ç/g, "c").replace(/Ç/g, "C")
    .replace(/—/g, "-");

export default function ClientPortal() {
  const [invoices, setInvoices] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      if (!user) {
        window.location.href = "/";
        return;
      }
      setCurrentUser(user);

      const allInvoices = await base44.entities.Invoice.list("-created_date", 500);
      const clientInvoices = allInvoices.filter(inv => inv.client_email === user.email);
      setInvoices(clientInvoices);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status) => {
    const styles = {
      draft: "bg-slate-100 text-slate-600",
      sent: "bg-blue-100 text-blue-700",
      paid: "bg-emerald-100 text-emerald-700",
      overdue: "bg-red-100 text-red-700",
      cancelled: "bg-muted text-muted-foreground",
    };
    const labels = { draft: "Draft", sent: "Dërguar", paid: "Paguar", overdue: "Vonuar", cancelled: "Anuluar" };
    return (
      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", styles[status])}>
        {labels[status] || status}
      </span>
    );
  };

  const downloadPDF = async (invoice) => {
    try {
      const template = await base44.entities.InvoiceTemplate.list("-created_date", 1);
      const tmpl = template[0] || {};

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210;
      const margin = 14;

      // Header color
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#4338CA");
        return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [67, 56, 202];
      };
      const [r, g, b] = hexToRgb(tmpl.primary_color);
      doc.setFillColor(r, g, b);
      doc.rect(0, 0, W, 28, "F");

      // Company info & Invoice title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(safe(tmpl.company_name || "Kompania"), margin, 10);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Fatura: ${safe(invoice.invoice_number)}`, W - margin, 10, { align: "right" });
      doc.setFontSize(8);
      doc.text(`Data: ${moment(invoice.created_date).format("DD MMM YYYY")}`, W - margin, 16, { align: "right" });

      // Company details
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text(safe(tmpl.company_email || ""), margin, 20);
      doc.text(safe(tmpl.company_phone || ""), margin, 24);

      // Client section
      let y = 38;
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Faturuar për:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      y += 5;
      doc.text(safe(invoice.client_name), margin, y);
      y += 4;
      doc.text(safe(invoice.client_email || ""), margin, y);
      y += 4;
      if (invoice.client_phone) doc.text(safe(invoice.client_phone), margin, y);

      // Invoice details
      y += 10;
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y - 3, W - margin * 2, 6, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text("Përshkrimi", margin + 2, y);
      doc.text("Sasia", margin + 90, y);
      doc.text("Çmim", margin + 110, y);
      doc.text("Shuma", margin + 140, y);
      y += 5;

      // Line items
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      invoice.items.forEach((item, i) => {
        if (y > 240) {
          doc.addPage();
          y = 20;
        }
        if (i % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(margin, y - 3, W - margin * 2, 6, "F");
        }
        doc.text(safe(item.name).slice(0, 30), margin + 2, y);
        doc.text(String(item.quantity), margin + 90, y);
        doc.text(`€${(item.price_inc_vat || 0).toFixed(2)}`, margin + 110, y);
        doc.text(`€${(item.line_total || 0).toFixed(2)}`, margin + 140, y);
        y += 6;
      });

      // Totals
      y += 4;
      doc.setFillColor(243, 244, 246);
      doc.rect(margin + 80, y - 3, W - margin * 2 - 80, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Subtotal:", margin + 95, y);
      doc.text(`€${(invoice.subtotal || 0).toFixed(2)}`, W - margin - 2, y, { align: "right" });
      y += 6;
      doc.text("TVSH:", margin + 95, y);
      doc.text(`€${(invoice.vat_amount || 0).toFixed(2)}`, W - margin - 2, y, { align: "right" });
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Total me TVSH:", margin + 95, y);
      doc.text(`€${(invoice.amount || 0).toFixed(2)}`, W - margin - 2, y, { align: "right" });

      // Status
      y += 15;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Statusi: ${invoice.status}`, margin, y);
      if (invoice.due_date) doc.text(`Afati: ${moment(invoice.due_date).format("DD MMM YYYY")}`, margin, y + 5);

      // Footer
      doc.setFillColor(r, g, b);
      doc.rect(0, 277, W, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text(safe(tmpl.footer_text || "Faleminderit për biznesin tuaj!"), W / 2, 285, { align: "center" });

      doc.save(`fatura_${safe(invoice.invoice_number)}.pdf`);
      toast.success("Fatura u shkarkua");
    } catch (err) {
      console.error("PDF error:", err);
      toast.error("Gabim gjatë shkarkimit");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const stats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === "paid").length,
    pending: invoices.filter(i => i.status !== "paid" && i.status !== "cancelled").length,
    overdue: invoices.filter(i => i.status === "overdue").length,
  };

  const totalAmount = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const paidAmount = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-border/40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Portali i Klientit</p>
              <h1 className="text-3xl font-bold tracking-tight">Përshëndetje, {currentUser?.full_name || "Klient"}!</h1>
              <p className="text-sm text-muted-foreground mt-2">{currentUser?.email}</p>
            </div>
            <Button variant="outline" onClick={() => base44.auth.logout()}>Dilni</Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej Faturat</p>
            <p className="text-2xl font-bold mt-2">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">€{totalAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Paguar</p>
            <p className="text-2xl font-bold mt-2 text-emerald-600">{stats.paid}</p>
            <p className="text-xs text-muted-foreground mt-1">€{paidAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Në Pritje</p>
            <p className="text-2xl font-bold mt-2 text-blue-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vonuar</p>
            <p className="text-2xl font-bold mt-2 text-red-600">{stats.overdue}</p>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold">Historiku i Faturave</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Nr. Faturës</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Shuma</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Data</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Afati</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Statusi</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                          <FileText className="w-7 h-7 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">Nuk keni fatura</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-primary">{inv.invoice_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold">€{(inv.amount || 0).toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {moment(inv.created_date).format("DD MMM YYYY")}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {inv.due_date ? moment(inv.due_date).format("DD MMM YYYY") : "—"}
                      </td>
                      <td className="px-6 py-4">{statusBadge(inv.status)}</td>
                      <td className="px-6 py-4 flex justify-end gap-2">
                        <Button
                          onClick={() => setSelectedInvoice(inv)}
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                        >
                          <Eye className="w-4 h-4" /> Shiko
                        </Button>
                        <Button
                          onClick={() => downloadPDF(inv)}
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                        >
                          <Download className="w-4 h-4" /> Shkarko
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Detail Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedInvoice(null)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-border p-6 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Fatura {selectedInvoice.invoice_number}</h3>
                <button onClick={() => setSelectedInvoice(null)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Data</p>
                    <p className="text-sm font-medium">{moment(selectedInvoice.created_date).format("DD MMM YYYY")}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Statusi</p>
                    <p className="text-sm font-medium">{statusBadge(selectedInvoice.status)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Afati i Pagesës</p>
                    <p className="text-sm font-medium">{selectedInvoice.due_date ? moment(selectedInvoice.due_date).format("DD MMM YYYY") : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Metoda e Pagesës</p>
                    <p className="text-sm font-medium">{selectedInvoice.payment_method || "—"}</p>
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <p className="text-sm font-semibold mb-3">Artikujt</p>
                  <div className="space-y-2 border-t border-border pt-3">
                    {selectedInvoice.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{item.name} × {item.quantity}</span>
                        <span className="font-medium">€{(item.line_total || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-border pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>€{(selectedInvoice.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TVSH</span>
                    <span>€{(selectedInvoice.vat_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>Total</span>
                    <span>€{(selectedInvoice.amount || 0).toFixed(2)}</span>
                  </div>
                </div>

                {selectedInvoice.description && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Shënime</p>
                    <p className="text-sm">{selectedInvoice.description}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button onClick={() => downloadPDF(selectedInvoice)} className="gap-2 flex-1">
                    <Download className="w-4 h-4" /> Shkarko PDF
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedInvoice(null)} className="flex-1">
                    Mbyll
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}