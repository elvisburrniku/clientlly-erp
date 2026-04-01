import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Minus, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function Cashbox() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState("cash_in");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const data = await base44.entities.CashTransaction.list("-created_date", 100);
    setTransactions(data);
    setLoading(false);
  };

  const cashIn = transactions.filter((t) => t.type === "cash_in").reduce((s, t) => s + (t.amount || 0), 0);
  const cashOut = transactions.filter((t) => t.type === "cash_out").reduce((s, t) => s + (t.amount || 0), 0);
  const balance = cashIn - cashOut;

  const openDialog = (type) => {
    setDialogType(type);
    setAmount("");
    setNote("");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setSubmitting(true);
    await base44.entities.CashTransaction.create({
      amount: parseFloat(amount),
      type: dialogType,
      note,
      reference_type: "manual",
    });
    setDialogOpen(false);
    setSubmitting(false);
    loadTransactions();
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Arka</h1>
          <p className="text-sm text-muted-foreground mt-1">Menaxhimi i parave të gatshme</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openDialog("cash_in")} className="gap-2">
            <Plus className="w-4 h-4" /> Shto Para
          </Button>
          <Button onClick={() => openDialog("cash_out")} variant="outline" className="gap-2">
            <Minus className="w-4 h-4" /> Tërhiq Para
          </Button>
        </div>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bilanci</p>
              <p className="text-xl font-bold">€{balance.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hyrjet</p>
              <p className="text-xl font-bold text-success">€{cashIn.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <ArrowUpCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Daljet</p>
              <p className="text-xl font-bold text-destructive">€{cashOut.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="text-base font-semibold">Transaksionet</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Data</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Tipi</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Shuma</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Shënim</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Referenca</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-sm text-muted-foreground py-12">
                    Nuk ka transaksione
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 text-sm">{moment(t.created_date).format("DD MMM YYYY, HH:mm")}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
                        t.type === "cash_in"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      )}>
                        {t.type === "cash_in" ? "Hyrje" : "Dalje"}
                      </span>
                    </td>
                    <td className={cn(
                      "px-5 py-3.5 text-sm font-semibold",
                      t.type === "cash_in" ? "text-success" : "text-destructive"
                    )}>
                      {t.type === "cash_in" ? "+" : "-"}€{(t.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{t.note || "—"}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground capitalize">{t.reference_type || "manual"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Remove Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "cash_in" ? "Shto Para në Arkë" : "Tërhiq Para nga Arka"}
            </DialogTitle>
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
            <Button onClick={handleSubmit} disabled={submitting || !amount}>
              {submitting ? "Duke ruajtur..." : "Ruaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}