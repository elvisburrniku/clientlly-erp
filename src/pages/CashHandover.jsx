import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Check, X, FileText, Send } from "lucide-react";
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [user, data] = await Promise.all([
      base44.auth.me(),
      base44.entities.CashHandover.list("-created_date", 100),
    ]);
    setCurrentUser(user);
    setHandovers(data);
    setLoading(false);
  };

  const isManager = currentUser?.role === "admin" || currentUser?.role === "manager";

  const handleApproveWithInvoices = async (handover) => {
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
  };

  const handleReject = async (handover) => {
    const reason = prompt("Arsyeja e refuzimit:");
    if (!reason) return;
    await base44.entities.CashHandover.update(handover.id, {
      status: "rejected",
      rejection_reason: reason
    });
    toast.info("Dorëzimi u refuzua");
    loadData();
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
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleGeneratePdf(h)}
                              disabled={pdfLoading === h.id}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleSendEmail(h)}
                              disabled={emailLoading === h.id}
                            >
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

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Krijo Kërkesë për Dorëzim</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Shuma (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Shënim</Label>
              <Textarea
                placeholder="Shënim opsional..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleCreate} disabled={submitting || !amount}>
              {submitting ? "Duke krijuar..." : "Krijo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}