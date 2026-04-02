import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Check, X, FileText, Send, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

export default function CashHandover() {
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(null);
  const [emailLoading, setEmailLoading] = useState(null);
  const [cashInvoices, setCashInvoices] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [detailHandover, setDetailHandover] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [user, data, invoices] = await Promise.all([
      base44.auth.me(),
      base44.entities.CashHandover.list("-created_date", 100),
      base44.entities.Invoice.filter({ payment_method: "cash", is_open: true }, "-created_date", 100),
    ]);
    setCurrentUser(user);
    setHandovers(data);
    setCashInvoices(invoices);
    setLoading(false);
  };

  const isManager = currentUser?.role === "admin" || currentUser?.role === "manager";

  const handleApproveWithInvoices = async (handover) => {
    try {
      await base44.entities.CashHandover.update(handover.id, {
        status: "approved",
        approved_by: currentUser.email,
        approved_date: new Date().toISOString(),
      });

      // Add to cashbox
      await base44.entities.CashTransaction.create({
        amount: handover.amount,
        type: "cash_in",
        note: `Dorëzim nga ${handover.user_name}`,
        reference_type: "handover",
        reference_id: handover.id,
      });

      // Mark invoices as paid
      if (handover.invoices && handover.invoices.length > 0) {
        for (const inv of handover.invoices) {
          await base44.entities.Invoice.update(inv.invoice_id, { status: "paid", is_open: false });
        }
      }

      toast.success("Dorëzimi u aprovua dhe faturat u shënuan si paguar");
      loadData();
    } catch (error) {
      toast.error("Gabim në aprovim: " + error.message);
    }
  };

  const handleReject = async (handover) => {
    const reason = prompt("Arsyeja e refuzimit:");
    if (!reason) return;
    try {
      await base44.entities.CashHandover.update(handover.id, {
        status: "rejected",
        rejection_reason: reason
      });
      toast.info("Dorëzimi u refuzua");
      loadData();
    } catch (error) {
      toast.error("Gabim në refuzim");
    }
  };

  const handleCreate = async () => {
    if (selectedInvoices.length === 0) {
      toast.error("Zgjidh të paktën një faturë");
      return;
    }
    setSubmitting(true);
    try {
      const selectedData = cashInvoices.filter(inv => selectedInvoices.includes(inv.id));
      const totalAmount = selectedData.reduce((sum, inv) => sum + inv.amount, 0);
      
      await base44.entities.CashHandover.create({
        amount: totalAmount,
        invoices: selectedData.map(inv => ({
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          client_name: inv.client_name,
          amount: inv.amount
        })),
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        note,
        status: "pending",
      });
      toast.success("Kërkesa u krijua");
      setSelectedInvoices([]);
      setNote("");
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error("Gabim në krijim: " + error.message);
    }
    setSubmitting(false);
  };

  const handleGeneratePdf = async (handover) => {
    setPdfLoading(handover.id);
    try {
      const res = await base44.functions.invoke("generateHandoverPdf", { handoverId: handover.id });
      if (res.data?.file_url) {
        const link = document.createElement('a');
        link.href = res.data.file_url;
        link.download = `handover-${handover.id}.pdf`;
        link.click();
      }
      toast.success("PDF u gjenru");
    } catch (error) {
      toast.error("Gabim gjatë gjenrimit të PDF");
    }
    setPdfLoading(null);
  };

  const handleSendEmail = async (handover) => {
    setEmailLoading(handover.id);
    try {
      await base44.functions.invoke("sendHandoverEmail", { handoverId: handover.id });
      toast.success("Email u dërgua");
    } catch (error) {
      toast.error("Gabim gjatë dërgimit të emailit: " + error.message);
    }
    setEmailLoading(null);
  };

  const statusBadge = (status) => {
    const styles = {
      pending: "bg-warning/10 text-warning",
      approved: "bg-success/10 text-success",
      rejected: "bg-destructive/10 text-destructive",
    };
    const labels = { pending: "Në pritje", approved: "Aprovuar", rejected: "Refuzuar" };
    return (
      <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", styles[status])}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dorëzimi i Parave</h1>
          <p className="text-sm text-muted-foreground mt-1">Kërkesat për dorëzim të parave në arkë</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Krijo Kërkesë
        </Button>
      </div>

      {/* Current user balance */}
      <div className="bg-card rounded-xl border border-border p-5">
        <p className="text-sm text-muted-foreground">Para juaj në dorë</p>
        <p className="text-2xl font-bold mt-1">€{(currentUser?.cash_on_hand || 0).toLocaleString()}</p>
      </div>

      {/* Handovers table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="text-base font-semibold">Kërkesat</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Data</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Përdoruesi</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Shuma</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Statusi</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Shënim</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Veprime</th>
              </tr>
            </thead>
            <tbody>
              {handovers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-sm text-muted-foreground py-12">
                    Nuk ka kërkesa
                  </td>
                </tr>
              ) : (
                handovers.map((h) => (
                  <tr key={h.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 text-sm">{moment(h.created_date).format("DD MMM YYYY")}</td>
                    <td className="px-5 py-3.5 text-sm font-medium">{h.user_name}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold">€{(h.amount || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5">{statusBadge(h.status)}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{h.note || "—"}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setDetailHandover(h)}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        {h.status === "pending" && isManager && (
                          <>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-success hover:text-success" onClick={() => handleApproveWithInvoices(h)}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleReject(h)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {h.status === "approved" && (
                          <>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleGeneratePdf(h)} disabled={pdfLoading === h.id}>
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleSendEmail(h)} disabled={emailLoading === h.id}>
                              <Send className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailHandover} onOpenChange={(o) => { if (!o) setDetailHandover(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detajet e Kërkesës</DialogTitle>
          </DialogHeader>
          {detailHandover && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Përdoruesi</p><p className="font-semibold mt-0.5">{detailHandover.user_name}</p></div>
                <div><p className="text-xs text-muted-foreground">Data</p><p className="font-semibold mt-0.5">{moment(detailHandover.created_date).format("DD MMM YYYY HH:mm")}</p></div>
                <div><p className="text-xs text-muted-foreground">Shuma</p><p className="font-bold text-lg text-primary mt-0.5">€{(detailHandover.amount || 0).toFixed(2)}</p></div>
                <div><p className="text-xs text-muted-foreground">Statusi</p><div className="mt-0.5">{statusBadge(detailHandover.status)}</div></div>
              </div>
              {detailHandover.note && <div className="bg-muted/30 rounded-lg p-3 text-sm"><p className="text-xs text-muted-foreground mb-1">Shënim</p><p>{detailHandover.note}</p></div>}
              {detailHandover.invoices?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Faturat e Përfshira</p>
                  <div className="border border-border rounded-lg divide-y divide-border">
                    {detailHandover.invoices.map((inv, i) => (
                      <div key={i} className="flex justify-between items-center px-3 py-2.5 text-sm">
                        <div><p className="font-medium">{inv.invoice_number}</p><p className="text-xs text-muted-foreground">{inv.client_name}</p></div>
                        <span className="font-bold">€{(inv.amount || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detailHandover.rejection_reason && <div className="bg-destructive/10 rounded-lg p-3 text-sm"><p className="text-xs text-destructive font-semibold mb-1">Arsyeja e Refuzimit</p><p>{detailHandover.rejection_reason}</p></div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailHandover(null)}>Mbyll</Button>
            {detailHandover?.status === 'pending' && isManager && (
              <Button onClick={() => { handleApproveWithInvoices(detailHandover); setDetailHandover(null); }} className="gap-2">
                <Check className="w-4 h-4" /> Aprovo
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Krijo Kërkesë për Dorëzim</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold mb-2 block">Zgjidh Faturat Cash</Label>
              <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
                {cashInvoices.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground text-center">Nuk ka fatura cash të hapura</p>
                ) : (
                  <div className="divide-y divide-border">
                    {cashInvoices.map(invoice => (
                      <div key={invoice.id} className="p-3 hover:bg-muted/20 transition-colors flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.includes(invoice.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedInvoices([...selectedInvoices, invoice.id]);
                            else setSelectedInvoices(selectedInvoices.filter(id => id !== invoice.id));
                          }}
                          className="w-4 h-4 mt-0.5 rounded cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="text-sm font-semibold">{invoice.invoice_number}</p>
                              <p className="text-xs text-muted-foreground">{invoice.client_name}</p>
                            </div>
                            <p className="text-sm font-bold whitespace-nowrap">€{invoice.amount.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {selectedInvoices.length > 0 && (
              <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Fatura të Zgjedhura</p>
                {cashInvoices.filter(inv => selectedInvoices.includes(inv.id)).map(inv => (
                  <div key={inv.id} className="flex justify-between text-sm">
                    <span>{inv.invoice_number} - {inv.client_name}</span>
                    <span className="font-medium">€{inv.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-border mt-2 pt-2 flex justify-between font-semibold">
                  <span>Total:</span>
                  <span className="text-success">€{cashInvoices.filter(inv => selectedInvoices.includes(inv.id)).reduce((s, i) => s + i.amount, 0).toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                </div>
              </div>
            )}
            <div>
              <Label>Shënim (opsionale)</Label>
              <Textarea
                placeholder="Shënim opsional..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1.5"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setSelectedInvoices([]); setNote(""); }}>Anulo</Button>
            <Button onClick={handleCreate} disabled={submitting || selectedInvoices.length === 0}>
              {submitting ? "Duke krijuar..." : "Dorëzo Kërkesë"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}