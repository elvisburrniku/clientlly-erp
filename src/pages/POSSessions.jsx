import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Lock, Unlock, DollarSign, ArrowDownCircle, ArrowUpCircle, MoreHorizontal, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

export default function POSSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closeDialog, setCloseDialog] = useState(null);
  const [closingBalance, setClosingBalance] = useState(0);
  const [closeNotes, setCloseNotes] = useState("");
  const [cashDialog, setCashDialog] = useState(null);
  const [cashType, setCashType] = useState("in");
  const [cashAmount, setCashAmount] = useState(0);
  const [cashReason, setCashReason] = useState("");
  const [detailDialog, setDetailDialog] = useState(null);
  const [sessionOrders, setSessionOrders] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await base44.entities.PosSession.list("-created_date", 100);
      setSessions(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleCloseSession = async () => {
    if (!closeDialog) return;
    setSubmitting(true);
    try {
      await base44.entities.PosSession.update(closeDialog.id, {
        status: "closed",
        closed_at: new Date().toISOString(),
        closing_balance: closingBalance,
        notes: closeNotes || undefined,
      });
      setCloseDialog(null);
      toast.success("Sesioni u mbyll me sukses");
      loadData();
    } catch (err) {
      toast.error("Gabim në mbylljen e sesionit");
    }
    setSubmitting(false);
  };

  const handleCashMovement = async () => {
    if (!cashDialog || cashAmount <= 0) return;
    setSubmitting(true);
    try {
      const movements = cashDialog.cash_movements || [];
      movements.push({
        type: cashType,
        amount: cashAmount,
        reason: cashReason,
        timestamp: new Date().toISOString(),
        user: user?.email,
      });
      const updates = {
        cash_movements: movements,
      };
      if (cashType === "in") {
        updates.cash_in = (parseFloat(cashDialog.cash_in) || 0) + cashAmount;
      } else {
        updates.cash_out = (parseFloat(cashDialog.cash_out) || 0) + cashAmount;
      }
      await base44.entities.PosSession.update(cashDialog.id, updates);
      setCashDialog(null);
      setCashAmount(0);
      setCashReason("");
      toast.success(cashType === "in" ? "Cash In u regjistrua" : "Cash Out u regjistrua");
      loadData();
    } catch (err) {
      toast.error("Gabim");
    }
    setSubmitting(false);
  };

  const viewSessionDetail = async (session) => {
    setDetailDialog(session);
    try {
      const orders = await base44.entities.PosOrder.filter({ session_id: session.id });
      setSessionOrders(orders);
    } catch {
      setSessionOrders([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const openSessions = sessions.filter(s => s.status === "open");
  const closedSessions = sessions.filter(s => s.status === "closed");

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">POS</p>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-sessions-title">Sesionet POS</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sesione Aktive</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600" data-testid="text-active-sessions">{openSessions.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej Sesione</p>
          <p className="text-2xl font-bold mt-1">{sessions.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Shitjet Sot</p>
          <p className="text-2xl font-bold mt-1 text-primary">
            €{sessions.filter(s => moment(s.created_at).isSame(moment(), 'day'))
              .reduce((sum, s) => sum + (parseFloat(s.total_sales) || 0), 0).toFixed(2)}
          </p>
        </div>
      </div>

      {openSessions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Unlock className="w-5 h-5 text-emerald-600" /> Sesione Aktive</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openSessions.map(session => (
              <div key={session.id} className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm p-5 space-y-3" data-testid={`session-active-${session.id}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg">{session.session_number}</p>
                    <p className="text-xs text-muted-foreground">{session.opened_by} — {moment(session.opened_at || session.created_at).format("DD/MM/YYYY HH:mm")}</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">Aktiv</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Bilanci</p><p className="font-bold">€{(parseFloat(session.opening_balance) || 0).toFixed(2)}</p></div>
                  <div><p className="text-muted-foreground text-xs">Shitjet</p><p className="font-bold text-primary">€{(parseFloat(session.total_sales) || 0).toFixed(2)}</p></div>
                  <div><p className="text-muted-foreground text-xs">Porosi</p><p className="font-bold">{session.total_orders || 0}</p></div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={() => { setCashDialog(session); setCashType("in"); }} data-testid={`button-cash-in-${session.id}`}>
                    <ArrowDownCircle className="w-4 h-4 text-emerald-600" /> Cash In
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={() => { setCashDialog(session); setCashType("out"); }} data-testid={`button-cash-out-${session.id}`}>
                    <ArrowUpCircle className="w-4 h-4 text-destructive" /> Cash Out
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-1 flex-1" onClick={() => { setCloseDialog(session); setClosingBalance(0); setCloseNotes(""); }} data-testid={`button-close-session-${session.id}`}>
                    <Lock className="w-4 h-4" /> Mbyll
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-semibold text-sm">Historiku i Sesioneve ({closedSessions.length})</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Sesioni</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Operatori</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Hapje / Mbyllje</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Shitjet</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Porosi</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Statusi</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {closedSessions.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Nuk ka sesione të mbyllura</td></tr>
              ) : (
                closedSessions.map(session => (
                  <tr key={session.id} className="hover:bg-muted/20 transition-colors" data-testid={`session-row-${session.id}`}>
                    <td className="px-6 py-4 text-sm font-semibold">{session.session_number}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{session.opened_by}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {moment(session.opened_at || session.created_at).format("DD/MM HH:mm")} — {session.closed_at ? moment(session.closed_at).format("DD/MM HH:mm") : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-primary">€{(parseFloat(session.total_sales) || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">{session.total_orders || 0}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">Mbyllur</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => viewSessionDetail(session)} data-testid={`button-view-session-${session.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!closeDialog} onOpenChange={o => { if (!o) setCloseDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Mbyll Sesionin — {closeDialog?.session_number}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Bilanci Fillestar:</span><span className="font-bold">€{(parseFloat(closeDialog?.opening_balance) || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Shitjet:</span><span className="font-bold text-primary">€{(parseFloat(closeDialog?.total_sales) || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Cash In:</span><span className="font-bold text-emerald-600">€{(parseFloat(closeDialog?.cash_in) || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Cash Out:</span><span className="font-bold text-destructive">€{(parseFloat(closeDialog?.cash_out) || 0).toFixed(2)}</span></div>
              <div className="border-t border-border pt-1 flex justify-between font-bold">
                <span>Pritshme:</span>
                <span>€{(
                  (parseFloat(closeDialog?.opening_balance) || 0) +
                  (parseFloat(closeDialog?.total_sales) || 0) +
                  (parseFloat(closeDialog?.cash_in) || 0) -
                  (parseFloat(closeDialog?.cash_out) || 0)
                ).toFixed(2)}</span>
              </div>
            </div>
            <div>
              <Label>Bilanci Mbyllës (€)</Label>
              <Input type="number" value={closingBalance} onChange={e => setClosingBalance(parseFloat(e.target.value) || 0)} className="mt-1.5" data-testid="input-closing-balance" />
            </div>
            <div>
              <Label>Shënime</Label>
              <Textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} className="mt-1.5" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(null)}>Anulo</Button>
            <Button variant="destructive" onClick={handleCloseSession} disabled={submitting} data-testid="button-confirm-close">
              {submitting ? "Duke mbyllur..." : "Mbyll Sesionin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cashDialog} onOpenChange={o => { if (!o) { setCashDialog(null); setCashAmount(0); setCashReason(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {cashType === "in" ? <ArrowDownCircle className="w-5 h-5 text-emerald-600" /> : <ArrowUpCircle className="w-5 h-5 text-destructive" />}
              {cashType === "in" ? "Cash In" : "Cash Out"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Shuma (€)</Label>
              <Input type="number" value={cashAmount} onChange={e => setCashAmount(parseFloat(e.target.value) || 0)} className="mt-1.5" data-testid="input-cash-amount" />
            </div>
            <div>
              <Label>Arsyeja</Label>
              <Input value={cashReason} onChange={e => setCashReason(e.target.value)} className="mt-1.5" placeholder="P.sh. Kushur, Blerje..." data-testid="input-cash-reason" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCashDialog(null)}>Anulo</Button>
            <Button onClick={handleCashMovement} disabled={cashAmount <= 0 || submitting} data-testid="button-confirm-cash">
              {submitting ? "Duke regjistruar..." : "Regjistro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailDialog} onOpenChange={o => { if (!o) setDetailDialog(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Detajet e Sesionit — {detailDialog?.session_number}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">Bilanci Fillestar</p>
                <p className="font-bold">€{(parseFloat(detailDialog?.opening_balance) || 0).toFixed(2)}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">Bilanci Mbyllës</p>
                <p className="font-bold">€{(parseFloat(detailDialog?.closing_balance) || 0).toFixed(2)}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">Shitjet</p>
                <p className="font-bold text-primary">€{(parseFloat(detailDialog?.total_sales) || 0).toFixed(2)}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">Porosi</p>
                <p className="font-bold">{detailDialog?.total_orders || 0}</p>
              </div>
            </div>

            {(detailDialog?.cash_movements || []).length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Lëvizjet e Cash-it</p>
                <div className="space-y-1">
                  {(detailDialog.cash_movements).map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        {m.type === "in" ? <ArrowDownCircle className="w-4 h-4 text-emerald-600" /> : <ArrowUpCircle className="w-4 h-4 text-destructive" />}
                        <span>{m.reason || (m.type === "in" ? "Cash In" : "Cash Out")}</span>
                      </div>
                      <span className={cn("font-bold", m.type === "in" ? "text-emerald-600" : "text-destructive")}>
                        {m.type === "in" ? "+" : "-"}€{(m.amount || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold mb-2">Porositë ({sessionOrders.length})</p>
              {sessionOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nuk ka porosi</p>
              ) : (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {sessionOrders.map(order => (
                    <div key={order.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
                      <div>
                        <span className="font-semibold">{order.order_number}</span>
                        <span className="text-muted-foreground ml-2">{moment(order.created_at).format("HH:mm")}</span>
                        {order.customer_name && <span className="text-muted-foreground ml-2">— {order.customer_name}</span>}
                      </div>
                      <span className="font-bold">€{(parseFloat(order.total) || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog(null)}>Mbyll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
