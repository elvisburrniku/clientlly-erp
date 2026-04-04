import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FileText, Users, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import moment from "moment";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

const safe = (str) =>
  String(str || "")
    .replace(/ë/g, "e").replace(/Ë/g, "E")
    .replace(/ç/g, "c").replace(/Ç/g, "C")
    .replace(/—/g, "-");

export default function ClientPortalPublic() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    loadPortalData();
  }, [token]);

  const loadPortalData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/client/${token}`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Invalid token");
        setLoading(false);
        return;
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError("Gabim gjatë ngarkimit");
    }
    setLoading(false);
  };

  const downloadPDF = (invoice) => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210;
      const margin = 14;
      doc.setFillColor(67, 56, 202);
      doc.rect(0, 0, W, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Fatura", margin, 10);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Nr: ${safe(invoice.invoice_number || '')}`, W - margin, 10, { align: "right" });
      doc.setFontSize(8);
      doc.text(`Data: ${moment(invoice.issue_date || invoice.created_at).format("DD MMM YYYY")}`, W - margin, 16, { align: "right" });
      let y = 38;
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Klient:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      y += 5;
      doc.text(safe(invoice.client_name || data?.client?.name || ''), margin, y);
      y += 10;
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y - 3, W - margin * 2, 6, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("Pershkrimi", margin + 2, y);
      doc.text("Shuma", margin + 140, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const items = Array.isArray(invoice.items) ? invoice.items : [];
      items.forEach(item => {
        doc.text(safe(item.name || '').slice(0, 40), margin + 2, y);
        doc.text(`€${(item.line_total || 0).toFixed(2)}`, margin + 140, y);
        y += 6;
      });
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Total:", margin + 100, y);
      doc.text(`€${parseFloat(invoice.total || 0).toFixed(2)}`, W - margin, y, { align: "right" });
      doc.save(`fatura_${safe(invoice.invoice_number || 'export')}.pdf`);
      toast.success("PDF u shkarkua");
    } catch (err) {
      toast.error("Gabim gjatë shkarkimit");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-10 text-center max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold mb-2">Link i Pavlefshëm</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const { client, invoices, payments } = data;
  const totalAmount = invoices.reduce((s, i) => s + parseFloat(i.total || 0), 0);
  const paidAmount = invoices.filter(i => i.status === "paid").reduce((s, i) => s + parseFloat(i.total || 0), 0);
  const totalPayments = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);

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
      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", styles[status] || "bg-muted text-muted-foreground")}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b border-border/40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Portali i Klientit</p>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-client-name">{client.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{client.email}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10 space-y-8">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Informacioni</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Emri</p>
              <p className="font-semibold">{client.name}</p>
            </div>
            {client.email && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="font-semibold">{client.email}</p>
              </div>
            )}
            {client.phone && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Telefon</p>
                <p className="font-semibold">{client.phone}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej Faturat</p>
            <p className="text-2xl font-bold mt-2" data-testid="text-invoice-count">{invoices.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Totali</p>
            <p className="text-2xl font-bold mt-2">€{totalAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Paguar</p>
            <p className="text-2xl font-bold mt-2 text-emerald-600">€{paidAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bilanci</p>
            <p className={cn("text-2xl font-bold mt-2", (totalAmount - paidAmount) > 0 ? "text-red-600" : "text-emerald-600")}>
              €{(totalAmount - paidAmount).toFixed(2)}
            </p>
          </div>
        </div>

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
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Statusi</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                          <FileText className="w-7 h-7 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">Nuk ka fatura</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-invoice-${inv.id}`}>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-primary">{inv.invoice_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold">€{parseFloat(inv.total || 0).toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {moment(inv.issue_date || inv.created_at).format("DD MMM YYYY")}
                      </td>
                      <td className="px-6 py-4">{statusBadge(inv.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => downloadPDF(inv)}>
                          <Download className="w-4 h-4" /> PDF
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {payments.length > 0 && (
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Historiku i Pagesave</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Referenca</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Shuma</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Data</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Metoda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 text-sm">{p.reference || p.invoice_number || "—"}</td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-600">€{parseFloat(p.amount || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {moment(p.payment_date || p.created_at).format("DD MMM YYYY")}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{p.payment_method || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
