import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, ArrowRightLeft, Building2, Wallet, Trash2, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ACCOUNTS = ["Arka", "Raiffeisen", "BKT", "Credins", "Intesa", "OTP Bank", "Tjetër"];

const TYPE_LABELS = {
  cash_to_bank: "Arka → Bankë",
  bank_to_bank: "Bankë → Bankë",
};

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [cashBalance, setCashBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "cash_to_bank",
    from_account: "Arka",
    to_account: "",
    amount: "",
    transfer_date: new Date().toISOString().split("T")[0],
    reference: "",
    notes: "",
    status: "completed",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    const [data, txns] = await Promise.all([
      base44.entities.Transfer.list("-transfer_date", 100).catch(() => []),
      base44.entities.CashTransaction.list('-created_date', 1000).catch(() => []),
    ]);
    setTransfers(data);
    const balance = txns.reduce((sum, t) => t.type === 'cash_in' ? sum + t.amount : sum - t.amount, 0);
    setCashBalance(balance);
    setLoading(false);
  };

  const handleTypeChange = (val) => {
    setForm({
      ...form,
      type: val,
      from_account: val === "cash_to_bank" ? "Arka" : "",
      to_account: "",
    });
  };

  const handleSave = async () => {
    if (!form.from_account || !form.to_account || !form.amount || !form.transfer_date) {
      toast.error("Plotëso të gjitha fushat e detyrueshme");
      return;
    }
    if (parseFloat(form.amount) <= 0) {
      toast.error("Shuma duhet të jetë pozitive");
      return;
    }
    if (form.type === "cash_to_bank" && parseFloat(form.amount) > cashBalance) {
      toast.error(`Shuma tejkalon bilancin e arkës (${cashBalance.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €)`);
      return;
    }
    setSaving(true);

    const payload = { ...form, amount: parseFloat(form.amount) };
    await base44.entities.Transfer.create(payload);

    // If cash_to_bank (deponim nga arka), regjistroje edhe si dalje nga arka
    if (form.type === "cash_to_bank" && form.status === "completed") {
      await base44.entities.CashTransaction.create({
        amount: parseFloat(form.amount),
        type: "cash_out",
        note: `Deponim në bankë: ${form.to_account}${form.reference ? " - Ref: " + form.reference : ""}`,
        reference_type: "manual",
      });
      toast.success("Transferta u regjistrua dhe arka u përditësua");
    } else {
      toast.success("Transferta u regjistrua");
    }

    await loadTransfers();
    setShowForm(false);
    setForm({
      type: "cash_to_bank",
      from_account: "Arka",
      to_account: "",
      amount: "",
      transfer_date: new Date().toISOString().split("T")[0],
      reference: "",
      notes: "",
      status: "completed",
    });
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Fshi këtë transfertë?")) return;
    await base44.entities.Transfer.delete(id);
    setTransfers(transfers.filter(t => t.id !== id));
    toast.success("Transferta u fshi");
  };

  // Summary
  const cashToBank = transfers.filter(t => t.type === "cash_to_bank" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const bankToBank = transfers.filter(t => t.type === "bank_to_bank" && t.status === "completed").reduce((s, t) => s + t.amount, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transfertat</h1>
          <p className="text-sm text-muted-foreground mt-1">Deponime në bankë dhe transferta ndërbankare</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Transfertë e Re
        </Button>
      </div>

      {/* Cash balance banner */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
          <Wallet className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Gjendja Aktuale e Arkës</p>
          <p className={`text-lg font-bold ${cashBalance < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
            {cashBalance.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
          </p>
        </div>
        <p className="text-xs text-muted-foreground ml-auto hidden sm:block">Transferta Arka → Bankë nuk lejohen të tejkalojnë këtë shumë</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Deponime Arka → Bankë</p>
            <p className="text-xl font-bold">{cashToBank.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Transferta Bankë → Bankë</p>
            <p className="text-xl font-bold">{bankToBank.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {transfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ArrowRightLeft className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Nuk ka transferta të regjistruara</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lloji</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nga → Tek</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Referenca</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Shuma</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transfers.map(t => (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{t.transfer_date}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.type === "cash_to_bank" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"}`}>
                      {TYPE_LABELS[t.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span>{t.from_account}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span>{t.to_account}</span>
                    </div>
                    {t.notes && <p className="text-xs text-muted-foreground mt-0.5">{t.notes}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{t.reference || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">{t.amount?.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(t.id)} className="text-destructive/50 hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfertë e Re</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Lloji i Transfertës</Label>
              <Select value={form.type} onValueChange={handleTypeChange}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_to_bank">💵 Arka → Bankë (Deponim)</SelectItem>
                  <SelectItem value="bank_to_bank">🏦 Bankë → Bankë</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nga (Burimi)</Label>
                {form.type === "cash_to_bank" ? (
                  <Input value="Arka" disabled className="mt-1.5 bg-muted/50" />
                ) : (
                  <Select value={form.from_account} onValueChange={(v) => setForm({ ...form, from_account: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Zgjidh bankën" /></SelectTrigger>
                    <SelectContent>
                      {ACCOUNTS.filter(a => a !== "Arka").map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label>Tek (Destinacioni)</Label>
                <Select value={form.to_account} onValueChange={(v) => setForm({ ...form, to_account: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Zgjidh" /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNTS.filter(a => a !== "Arka" && a !== form.from_account).map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Shuma (€)</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.transfer_date} onChange={(e) => setForm({ ...form, transfer_date: e.target.value })} className="mt-1.5" />
              </div>
            </div>

            <div>
              <Label>Referenca / Dok. Nr.</Label>
              <Input placeholder="p.sh. TRF-2026-001" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="mt-1.5" />
            </div>

            <div>
              <Label>Shënime</Label>
              <Input placeholder="Shënime opsionale..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" />
            </div>

            {form.type === "cash_to_bank" && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 space-y-1">
                <div>ℹ️ Ky veprim do të <strong>minusojë arkën</strong> automatikisht me shumën e specifikuar.</div>
                <div className="font-medium">Gjendja e arkës: {cashBalance.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € — Maksimum i lejuar: {cashBalance.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? "Duke ruajtur..." : "Regjistro Transfertën"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Anulo</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}