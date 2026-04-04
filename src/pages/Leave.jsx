import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Check, X, Calendar, Settings, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};
const statusLabels = { pending: "Në Pritje", approved: "Aprovuar", rejected: "Refuzuar" };

export default function Leave() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [activeTab, setActiveTab] = useState("requests");
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    employee_id: "", employee_name: "", leave_type_id: "", leave_type_name: "",
    start_date: "", end_date: "", reason: "",
  });

  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: "", days_allowed: 20, color: "#3b82f6" });
  const [editingTypeId, setEditingTypeId] = useState(null);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [reqs, types, bals, emps] = await Promise.all([
        base44.entities.LeaveRequest.filter({ tenant_id: tenantId }, "-created_at"),
        base44.entities.LeaveType.filter({ tenant_id: tenantId }, "name"),
        base44.entities.LeaveBalance.filter({ tenant_id: tenantId }, "-year"),
        base44.entities.Employee.filter({ tenant_id: tenantId, status: "active" }),
      ]);
      setLeaveRequests(reqs);
      setLeaveTypes(types);
      setLeaveBalances(bals);
      setEmployees(emps);
    } catch (e) { toast.error("Gabim në ngarkim"); }
    setLoading(false);
  };

  const calcDays = (start, end) => {
    if (!start || !end) return 0;
    return moment(end).diff(moment(start), "days") + 1;
  };

  const handleSubmitRequest = async () => {
    if (!requestForm.employee_id || !requestForm.leave_type_id || !requestForm.start_date || !requestForm.end_date) {
      toast.error("Plotëso fushat e detyrueshme"); return;
    }
    setSubmitting(true);
    try {
      const days = calcDays(requestForm.start_date, requestForm.end_date);
      await base44.entities.LeaveRequest.create({
        ...requestForm, tenant_id: tenantId, days_count: days, status: "pending",
      });
      toast.success("Kërkesa u dërgua");
      setRequestDialogOpen(false);
      setRequestForm({ employee_id: "", employee_name: "", leave_type_id: "", leave_type_name: "", start_date: "", end_date: "", reason: "" });
      loadAll();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleApprove = async (req) => {
    try {
      await base44.entities.LeaveRequest.update(req.id, {
        status: "approved", approved_by: user?.full_name || "Manager", approved_at: new Date().toISOString(),
      });
      const bal = leaveBalances.find(b => b.employee_id === req.employee_id && b.leave_type_id === req.leave_type_id && b.year === selectedYear);
      if (bal) {
        await base44.entities.LeaveBalance.update(bal.id, {
          used_days: (bal.used_days || 0) + req.days_count,
          remaining_days: (bal.remaining_days || bal.total_days) - req.days_count,
        });
      }
      toast.success("Kërkesa u aprovua");
      loadAll();
    } catch (e) { toast.error(e.message); }
  };

  const handleReject = async (req) => {
    try {
      await base44.entities.LeaveRequest.update(req.id, { status: "rejected", approved_by: user?.full_name || "Manager" });
      toast.success("Kërkesa u refuzua");
      loadAll();
    } catch (e) { toast.error(e.message); }
  };

  const handleSaveType = async () => {
    if (!typeForm.name) { toast.error("Emri kërkohet"); return; }
    setSubmitting(true);
    try {
      const data = { ...typeForm, tenant_id: tenantId };
      if (editingTypeId) {
        await base44.entities.LeaveType.update(editingTypeId, data);
      } else {
        await base44.entities.LeaveType.create(data);
      }
      toast.success("U ruajt");
      setTypeDialogOpen(false);
      setTypeForm({ name: "", days_allowed: 20, color: "#3b82f6" });
      setEditingTypeId(null);
      loadAll();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleDeleteType = async (id) => {
    if (!confirm("Fshi këtë lloj leje?")) return;
    try { await base44.entities.LeaveType.delete(id); toast.success("U fshi"); loadAll(); }
    catch (e) { toast.error(e.message); }
  };

  const initBalances = async () => {
    try {
      for (const emp of employees) {
        for (const lt of leaveTypes) {
          const existing = leaveBalances.find(b => b.employee_id === emp.id && b.leave_type_id === lt.id && b.year === selectedYear);
          if (!existing) {
            await base44.entities.LeaveBalance.create({
              tenant_id: tenantId, employee_id: emp.id, employee_name: `${emp.first_name} ${emp.last_name}`,
              leave_type_id: lt.id, leave_type_name: lt.name, year: selectedYear,
              total_days: lt.days_allowed, used_days: 0, remaining_days: lt.days_allowed,
            });
          }
        }
      }
      toast.success("Bilancet u inicializuan");
      loadAll();
    } catch (e) { toast.error(e.message); }
  };

  const calendarRequests = leaveRequests.filter(r => r.status === "approved");

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Lejet</h1>
          <p className="text-sm text-slate-500 mt-1">Menaxho kërkesat për leje dhe bilancet</p>
        </div>
        <Button onClick={() => setRequestDialogOpen(true)} data-testid="button-new-request">
          <Plus className="w-4 h-4 mr-1" /> Kërkesë e Re
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="requests" data-testid="tab-requests">Kërkesat ({leaveRequests.length})</TabsTrigger>
          <TabsTrigger value="balances" data-testid="tab-balances">Bilancet</TabsTrigger>
          <TabsTrigger value="calendar" data-testid="tab-calendar">Kalendari</TabsTrigger>
          <TabsTrigger value="types" data-testid="tab-types">Llojet e Lejeve</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Punonjësi</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Lloji</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Nga</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Deri</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Ditë</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Arsyeja</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Statusi</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {leaveRequests.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50" data-testid={`row-leave-request-${r.id}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.employee_name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.leave_type_name}</td>
                    <td className="px-4 py-3 text-slate-600">{moment(r.start_date).format("DD/MM/YYYY")}</td>
                    <td className="px-4 py-3 text-slate-600">{moment(r.end_date).format("DD/MM/YYYY")}</td>
                    <td className="px-4 py-3 text-center font-medium">{r.days_count}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{r.reason || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-xs", statusColors[r.status])}>{statusLabels[r.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "pending" && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="text-green-600 hover:text-green-700" onClick={() => handleApprove(r)} data-testid={`button-approve-${r.id}`}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleReject(r)} data-testid={`button-reject-${r.id}`}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {leaveRequests.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Nuk ka kërkesa</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="balances">
          <div className="flex items-center gap-3 mb-4">
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={initBalances} data-testid="button-init-balances">Inicializo Bilancet</Button>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Punonjësi</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Lloji i Lejes</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Totale</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Përdorura</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Të Mbetura</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {leaveBalances.filter(b => b.year === selectedYear).map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{b.employee_name}</td>
                    <td className="px-4 py-3 text-slate-600">{b.leave_type_name}</td>
                    <td className="px-4 py-3 text-center">{b.total_days}</td>
                    <td className="px-4 py-3 text-center text-orange-600 font-medium">{b.used_days || 0}</td>
                    <td className="px-4 py-3 text-center text-green-600 font-medium">{b.remaining_days || b.total_days}</td>
                  </tr>
                ))}
                {leaveBalances.filter(b => b.year === selectedYear).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">Nuk ka bilance. Kliko "Inicializo Bilancet" për t'i krijuar.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Mungesat e Ekipit</h3>
            {calendarRequests.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nuk ka mungesa të aprovuara</p>
            ) : (
              <div className="space-y-2">
                {calendarRequests.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs">
                      {r.employee_name?.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{r.employee_name}</p>
                      <p className="text-xs text-slate-500">{r.leave_type_name}</p>
                    </div>
                    <div className="text-sm text-slate-600">
                      {moment(r.start_date).format("D MMM")} - {moment(r.end_date).format("D MMM YYYY")}
                    </div>
                    <Badge className="bg-indigo-100 text-indigo-700 text-xs">{r.days_count} ditë</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="types">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setTypeForm({ name: "", days_allowed: 20, color: "#3b82f6" }); setEditingTypeId(null); setTypeDialogOpen(true); }} data-testid="button-add-leave-type">
              <Plus className="w-4 h-4 mr-1" /> Shto Lloj Leje
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaveTypes.map(lt => (
              <div key={lt.id} className="bg-white rounded-xl border p-5" data-testid={`card-leave-type-${lt.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: lt.color }} />
                    <div>
                      <h3 className="font-semibold text-slate-900">{lt.name}</h3>
                      <p className="text-sm text-slate-500">{lt.days_allowed} ditë/vit</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setTypeForm({...lt}); setEditingTypeId(lt.id); setTypeDialogOpen(true); }}>
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-red-500" onClick={() => handleDeleteType(lt.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {leaveTypes.length === 0 && <p className="col-span-3 text-center text-slate-400 py-12">Nuk ka lloje lejesh</p>}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kërkesë për Leje</DialogTitle>
            <DialogDescription>Dërgo një kërkesë të re për leje</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Punonjësi *</Label>
              <Select value={requestForm.employee_id} onValueChange={v => {
                const emp = employees.find(e => e.id === v);
                setRequestForm({...requestForm, employee_id: v, employee_name: emp ? `${emp.first_name} ${emp.last_name}` : ""});
              }}>
                <SelectTrigger data-testid="select-leave-employee"><SelectValue placeholder="Zgjidh" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lloji i Lejes *</Label>
              <Select value={requestForm.leave_type_id} onValueChange={v => {
                const lt = leaveTypes.find(t => t.id === v);
                setRequestForm({...requestForm, leave_type_id: v, leave_type_name: lt?.name || ""});
              }}>
                <SelectTrigger data-testid="select-leave-type"><SelectValue placeholder="Zgjidh" /></SelectTrigger>
                <SelectContent>{leaveTypes.map(lt => <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Data e Fillimit *</Label><Input type="date" value={requestForm.start_date} onChange={e => setRequestForm({...requestForm, start_date: e.target.value})} data-testid="input-start-date" /></div>
              <div><Label>Data e Mbarimit *</Label><Input type="date" value={requestForm.end_date} onChange={e => setRequestForm({...requestForm, end_date: e.target.value})} data-testid="input-end-date" /></div>
            </div>
            {requestForm.start_date && requestForm.end_date && (
              <p className="text-sm text-indigo-600 font-medium">
                {calcDays(requestForm.start_date, requestForm.end_date)} ditë
              </p>
            )}
            <div><Label>Arsyeja</Label><Textarea value={requestForm.reason} onChange={e => setRequestForm({...requestForm, reason: e.target.value})} data-testid="input-reason" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSubmitRequest} disabled={submitting} data-testid="button-submit-request">{submitting ? "Duke dërguar..." : "Dërgo Kërkesën"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTypeId ? "Modifiko Llojin" : "Shto Lloj Leje"}</DialogTitle>
            <DialogDescription>Konfiguro llojin e lejes</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Emri *</Label><Input value={typeForm.name} onChange={e => setTypeForm({...typeForm, name: e.target.value})} data-testid="input-type-name" /></div>
            <div><Label>Ditë të Lejuara/Vit</Label><Input type="number" value={typeForm.days_allowed} onChange={e => setTypeForm({...typeForm, days_allowed: parseInt(e.target.value) || 0})} /></div>
            <div><Label>Ngjyra</Label><Input type="color" value={typeForm.color} onChange={e => setTypeForm({...typeForm, color: e.target.value})} className="w-20 h-10" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSaveType} disabled={submitting} data-testid="button-save-type">{submitting ? "Duke ruajtur..." : "Ruaj"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
