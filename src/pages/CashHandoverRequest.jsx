import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function CashHandoverRequest() {
  const [user, setUser] = useState(null);
  const [cashInvoices, setCashInvoices] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [u, invoices, handers] = await Promise.all([
        base44.auth.me(),
        base44.entities.Invoice.filter({ payment_method: "cash", is_open: true }, "-created_date", 100),
        base44.entities.CashHandover.filter({ user_email: (await base44.auth.me()).email }, "-created_date", 100)
      ]);
      setUser(u);
      setCashInvoices(invoices);
      setHandovers(handers);
    } catch (err) {
      console.error("Load error:", err);
    }
    setLoading(false);
  };

  const handleSubmitHandover = async () => {
    if (selectedInvoices.length === 0) {
      toast.error("Zgjidh të paktën një faturë");
      return;
    }
    setSubmitting(true);
    try {
      const selectedData = cashInvoices.filter(inv => selectedInvoices.includes(inv.id));
      const totalAmount = selectedData.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);
      
      await base44.entities.CashHandover.create({
        amount: totalAmount,
        invoices: selectedData.map(inv => ({
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          client_name: inv.client_name,
          amount: inv.amount
        })),
        user_email: user.email,
        user_name: user.full_name,
        note: note,
        status: "pending"
      });

      toast.success("Kërkesa e dorëzimit u dërgua për aprovim");
      setSelectedInvoices([]);
      setNote("");
      setDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error("Gabim në dërgim");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const totalCashAmount = cashInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);
  const selectedTotal = cashInvoices.filter(inv => selectedInvoices.includes(inv.id)).reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Operacioni</p>
          <h1 className="text-3xl font-bold tracking-tight">Dorëzim Parash</h1>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2" disabled={cashInvoices.length === 0}>
          <Plus className="w-4 h-4" /> Dorëzo Këtu
        </Button>
      </div>

      {/* Available Cash */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Para në Arke (Cash)</p>
          <p className="text-3xl font-bold text-destructive">€{totalCashAmount.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
          <p className="text-xs text-muted-foreground mt-2">{cashInvoices.length} fatura të papaguar</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Kërkesa të Pezulluara</p>
          <p className="text-3xl font-bold">{handovers.filter(h => h.status === "pending").length}</p>
          <p className="text-xs text-muted-foreground mt-2">në pritje të aprovimit</p>
        </div>
      </div>

      {/* Pending Requests */}
      {handovers.filter(h => h.status === "pending").length > 0 && (
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/20">
            <p className="font-semibold text-sm">Kërkesa Në Pritje</p>
          </div>
          <div className="divide-y divide-border">
            {handovers.filter(h => h.status === "pending").map(req => (
              <div key={req.id} className="p-6 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold">€{parseFloat(req.amount || 0).toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                    <p className="text-xs text-muted-foreground mt-1">{req.invoices?.length || 0} fatura</p>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-medium">Në pritje</span>
                </div>
                {req.note && <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">{req.note}</p>}
                <div className="text-xs text-muted-foreground space-y-1">
                  {req.invoices?.slice(0, 3).map((inv, idx) => (
                    <div key={idx}>• {inv.invoice_number} - {inv.client_name} (€{parseFloat(inv.amount || 0).toFixed(2)})</div>
                  ))}
                  {req.invoices?.length > 3 && <div>... dhe {req.invoices.length - 3} të tjera</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved & Rejected */}
      {handovers.filter(h => h.status !== "pending").length > 0 && (
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/20">
            <p className="font-semibold text-sm">Historik</p>
          </div>
          <div className="divide-y divide-border">
            {handovers.filter(h => h.status !== "pending").map(req => (
              <div key={req.id} className="p-6 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-semibold">€{parseFloat(req.amount || 0).toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${req.status === 'approved' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {req.status === 'approved' ? 'Aprovuar' : 'Refuzuar'}
                  </span>
                </div>
                {req.status === 'approved' && req.approved_by && (
                  <p className="text-xs text-muted-foreground">Aprovuar nga {req.approved_by}</p>
                )}
                {req.status === 'rejected' && req.rejection_reason && (
                  <p className="text-xs text-destructive bg-destructive/5 p-2 rounded">{req.rejection_reason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Invoices */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <p className="font-semibold text-sm">{cashInvoices.length} Fatura Cash të Hapura</p>
        </div>
        {cashInvoices.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Nuk ka fatura cash të papaguar</div>
        ) : (
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {cashInvoices.map(invoice => (
              <div key={invoice.id} className="p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={selectedInvoices.includes(invoice.id)} onChange={(e) => {
                    if (e.target.checked) setSelectedInvoices([...selectedInvoices, invoice.id]);
                    else setSelectedInvoices(selectedInvoices.filter(id => id !== invoice.id));
                  }} className="w-4 h-4 mt-1 rounded cursor-pointer" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-sm font-semibold">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">{invoice.client_name}</p>
                      </div>
                      <p className="text-sm font-bold whitespace-nowrap">€{parseFloat(invoice.amount || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dorëzo Këto Fatura</DialogTitle>
            <DialogDescription>Zgjidh faturat dhe dorëzo në zyre</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Asnjë faturë e zgjedhur</p>
            ) : (
              <>
                <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Fatura të Zgjedhura</p>
                  {cashInvoices.filter(inv => selectedInvoices.includes(inv.id)).map(inv => (
                    <div key={inv.id} className="flex justify-between text-sm">
                      <span>{inv.invoice_number} - {inv.client_name}</span>
                      <span className="font-medium">€{parseFloat(inv.amount || 0).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-border mt-2 pt-2 flex justify-between font-semibold">
                    <span>Total:</span>
                    <span className="text-success">€{selectedTotal.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-2 block">Shënime (opsionale)</label>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="P.sh. Dorëzim i dytë për sot..." className="w-full p-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring" rows={2} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSubmitHandover} disabled={selectedInvoices.length === 0 || submitting}>
              {submitting ? "Duke dërguar..." : "Dorëzo Kërkesë"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}