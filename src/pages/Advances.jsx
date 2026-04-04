import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Search, MoreHorizontal, Trash2, Edit2, DollarSign, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  partially_repaid: "bg-orange-100 text-orange-700",
  repaid: "bg-green-100 text-green-700",
};
const statusLabels = { pending: "Në Pritje", approved: "Aprovuar", partially_repaid: "Pjesërisht Kthyer", repaid: "Kthyer" };

export default function Advances() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [advances, setAdvances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [repayDialogOpen, setRepayDialogOpen] = useState(false);
  const [repayAmount, setRepayAmount] = useState(0);
  const [repayingAdvance, setRepayingAdvance] = useState(null);

  const [form, setForm] = useState({
    employee_id: "", employee_name: "", amount: 0, advance_date: new Date().toISOString().split("T")[0],
    reason: "", status: "pending", notes: "",
  });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [advs, emps] = await Promise.all([
        base44.entities.EmployeeAdvance.filter({ tenant_id: tenantId }, "-created_at"),
        base44.entities.Employee.filter({ tenant_id: tenantId, status: "active" }),
      ]);
      setAdvances(advs);
      setEmployees(emps);
    } catch (e) { toast.error("Gabim në ngarkim"); }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.employee_id || !form.amount) { toast.error("Plotëso fushat"); return; }
    setSubmitting(true);
    try {
      const data = { ...form, tenant_id: tenantId, amount_repaid: 0 };
      if (editingId) {
        await base44.entities.EmployeeAdvance.update(editingId, data);
        toast.success("U përditësua");
      } else {
        await base44.entities.EmployeeAdvance.create(data);
        toast.success("Paradhënia u shtua");
      }
      setDialogOpen(false);
      setForm({ employee_id: "", employee_name: "", amount: 0, advance_date: new Date().toISOString().split("T")[0], reason: "", status: "pending", notes: "" });
      setEditingId(null);
      loadAll();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Fshi?")) return;
    try { await base44.entities.EmployeeAdvance.delete(id); toast.success("U fshi"); loadAll(); }
    catch (e) { toast.error(e.message); }
  };

  const handleRepay = async () => {
    if (!repayingAdvance || repayAmount <= 0) return;
    try {
      const newRepaid = parseFloat(repayingAdvance.amount_repaid || 0) + repayAmount;
      const total = parseFloat(repayingAdvance.amount || 0);
      const newStatus = newRepaid >= total ? "repaid" : "partially_repaid";
      await base44.entities.EmployeeAdvance.update(repayingAdvance.id, {
        amount_repaid: Math.min(newRepaid, total),
        status: newStatus,
        repayment_date: newStatus === "repaid" ? new Date().toISOString().split("T")[0] : null,
      });
      toast.success("Kthimi u regjistrua");
      setRepayDialogOpen(false);
      setRepayingAdvance(null);
      setRepayAmount(0);
      loadAll();
    } catch (e) { toast.error(e.message); }
  };

  const totalAdvances = advances.reduce((s, a) => s + parseFloat(a.amount || 0), 0);
  const totalRepaid = advances.reduce((s, a) => s + parseFloat(a.amount_repaid || 0), 0);
  const totalOutstanding = totalAdvances - totalRepaid;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Paradhëniet</h1>
          <p className="text-sm text-slate-500 mt-1">Menaxho paradhëniet e punonjësve</p>
        </div>
        <Button onClick={() => { setForm({ employee_id: "", employee_name: "", amount: 0, advance_date: new Date().toISOString().split("T")[0], reason: "", status: "pending", notes: "" }); setEditingId(null); setDialogOpen(true); }} data-testid="button-add-advance">
          <Plus className="w-4 h-4 mr-1" /> Shto Paradhënie
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500 uppercase font-medium">Totali i Paradhënieve</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalAdvances.toLocaleString()} ALL</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500 uppercase font-medium">Kthyer</p>
          <p className="text-xl font-bold text-green-600 mt-1">{totalRepaid.toLocaleString()} ALL</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500 uppercase font-medium">Pa Kthyer</p>
          <p className="text-xl font-bold text-orange-600 mt-1">{totalOutstanding.toLocaleString()} ALL</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Punonjësi</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Shuma</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Kthyer</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Mbetur</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Data</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Arsyeja</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Statusi</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {advances.map(a => {
              const remaining = parseFloat(a.amount || 0) - parseFloat(a.amount_repaid || 0);
              return (
                <tr key={a.id} className="hover:bg-slate-50" data-testid={`row-advance-${a.id}`}>
                  <td className="px-4 py-3 font-medium text-slate-900">{a.employee_name}</td>
                  <td className="px-4 py-3 text-right">{Number(a.amount || 0).toLocaleString()} ALL</td>
                  <td className="px-4 py-3 text-right text-green-600">{Number(a.amount_repaid || 0).toLocaleString()} ALL</td>
                  <td className="px-4 py-3 text-right font-medium text-orange-600">{remaining.toLocaleString()} ALL</td>
                  <td className="px-4 py-3 text-slate-600">{a.advance_date ? moment(a.advance_date).format("DD/MM/YYYY") : "—"}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{a.reason || "—"}</td>
                  <td className="px-4 py-3"><Badge className={cn("text-xs", statusColors[a.status])}>{statusLabels[a.status] || a.status}</Badge></td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {a.status !== "repaid" && (
                          <DropdownMenuItem onClick={() => { setRepayingAdvance(a); setRepayAmount(0); setRepayDialogOpen(true); }} data-testid={`button-repay-${a.id}`}>
                            <CheckCircle className="w-4 h-4 mr-2" /> Regjistro Kthim
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => { setForm({...a}); setEditingId(a.id); setDialogOpen(true); }}>
                          <Edit2 className="w-4 h-4 mr-2" /> Modifiko
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(a.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Fshi
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
            {advances.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Nuk ka paradhënie</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifiko Paradhënien" : "Shto Paradhënie"}</DialogTitle>
            <DialogDescription>Plotëso të dhënat</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Punonjësi *</Label>
              <Select value={form.employee_id} onValueChange={v => {
                const emp = employees.find(e => e.id === v);
                setForm({...form, employee_id: v, employee_name: emp ? `${emp.first_name} ${emp.last_name}` : ""});
              }}>
                <SelectTrigger data-testid="select-advance-employee"><SelectValue placeholder="Zgjidh" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Shuma (ALL) *</Label><Input type="number" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})} data-testid="input-advance-amount" /></div>
            <div><Label>Data</Label><Input type="date" value={form.advance_date} onChange={e => setForm({...form, advance_date: e.target.value})} /></div>
            <div><Label>Arsyeja</Label><Textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} /></div>
            <div><Label>Shënime</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSave} disabled={submitting} data-testid="button-save-advance">{submitting ? "Duke ruajtur..." : "Ruaj"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={repayDialogOpen} onOpenChange={setRepayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regjistro Kthim</DialogTitle>
            <DialogDescription>
              {repayingAdvance && `${repayingAdvance.employee_name} - Mbetur: ${(parseFloat(repayingAdvance.amount || 0) - parseFloat(repayingAdvance.amount_repaid || 0)).toLocaleString()} ALL`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Shuma e Kthimit (ALL)</Label><Input type="number" value={repayAmount} onChange={e => setRepayAmount(parseFloat(e.target.value) || 0)} data-testid="input-repay-amount" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepayDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleRepay} data-testid="button-confirm-repay">Regjistro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
