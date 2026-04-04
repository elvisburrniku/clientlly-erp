import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, ChevronLeft, ChevronRight, Trash2, Edit2, Clock, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

export default function Shifts() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [shifts, setShifts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("schedule");

  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState({ name: "", start_time: "08:00", end_time: "16:00", color: "#3b82f6" });
  const [editingShiftId, setEditingShiftId] = useState(null);

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ employee_id: "", employee_name: "", shift_id: "", shift_name: "", schedule_date: "", notes: "" });

  const [weekStart, setWeekStart] = useState(moment().startOf("isoWeek"));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sh, sc, emps] = await Promise.all([
        base44.entities.Shift.filter({ tenant_id: tenantId }, "name"),
        base44.entities.Schedule.filter({ tenant_id: tenantId }, "-schedule_date"),
        base44.entities.Employee.filter({ tenant_id: tenantId, status: "active" }),
      ]);
      setShifts(sh);
      setSchedules(sc);
      setEmployees(emps);
    } catch (e) { toast.error("Gabim në ngarkim"); }
    setLoading(false);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => moment(weekStart).add(i, "days"));

  const getScheduleForDay = (empId, date) => {
    const dateStr = date.format("YYYY-MM-DD");
    return schedules.find(s => s.employee_id === empId && s.schedule_date === dateStr);
  };

  const handleSaveShift = async () => {
    if (!shiftForm.name) { toast.error("Emri kërkohet"); return; }
    setSubmitting(true);
    try {
      const data = { ...shiftForm, tenant_id: tenantId };
      if (editingShiftId) {
        await base44.entities.Shift.update(editingShiftId, data);
        toast.success("Turni u përditësua");
      } else {
        await base44.entities.Shift.create(data);
        toast.success("Turni u shtua");
      }
      setShiftDialogOpen(false);
      setShiftForm({ name: "", start_time: "08:00", end_time: "16:00", color: "#3b82f6" });
      setEditingShiftId(null);
      loadAll();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleDeleteShift = async (id) => {
    if (!confirm("Fshi këtë turn?")) return;
    try { await base44.entities.Shift.delete(id); toast.success("U fshi"); loadAll(); }
    catch (e) { toast.error(e.message); }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm.employee_id || !scheduleForm.shift_id || !scheduleForm.schedule_date) {
      toast.error("Plotëso fushat e detyrueshme"); return;
    }
    setSubmitting(true);
    try {
      await base44.entities.Schedule.create({ ...scheduleForm, tenant_id: tenantId });
      toast.success("Orari u shtua");
      setScheduleDialogOpen(false);
      loadAll();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleDeleteSchedule = async (id) => {
    try { await base44.entities.Schedule.delete(id); toast.success("U fshi"); loadAll(); }
    catch (e) { toast.error(e.message); }
  };

  const handleCellClick = (empId, date) => {
    const existing = getScheduleForDay(empId, date);
    if (existing) {
      if (!confirm("Fshi orarin për këtë ditë?")) return;
      handleDeleteSchedule(existing.id);
    } else {
      const emp = employees.find(e => e.id === empId);
      setScheduleForm({
        employee_id: empId,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : "",
        shift_id: "", shift_name: "",
        schedule_date: date.format("YYYY-MM-DD"),
        notes: "",
      });
      setScheduleDialogOpen(true);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Turnet & Orari</h1>
          <p className="text-sm text-slate-500 mt-1">Menaxho turnet e punës dhe orarin javor</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="schedule" data-testid="tab-schedule">Orari Javor</TabsTrigger>
          <TabsTrigger value="shifts" data-testid="tab-shifts">Turnet</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="outline" size="icon" onClick={() => setWeekStart(moment(weekStart).subtract(1, "week"))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700">
              {weekStart.format("D MMM")} - {moment(weekStart).add(6, "days").format("D MMM YYYY")}
            </span>
            <Button variant="outline" size="icon" onClick={() => setWeekStart(moment(weekStart).add(1, "week"))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => setWeekStart(moment().startOf("isoWeek"))}>Sot</Button>
          </div>

          <div className="bg-white rounded-xl border overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 sticky left-0 bg-slate-50 min-w-[180px]">Punonjësi</th>
                  {weekDays.map(d => (
                    <th key={d.format("YYYY-MM-DD")} className={cn("text-center px-2 py-3 font-medium min-w-[120px]", d.isSame(moment(), "day") ? "text-indigo-600 bg-indigo-50" : "text-slate-600")}>
                      <div>{d.format("ddd")}</div>
                      <div className="text-xs">{d.format("D MMM")}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td className="px-4 py-3 font-medium text-slate-900 sticky left-0 bg-white">{emp.first_name} {emp.last_name}</td>
                    {weekDays.map(d => {
                      const sched = getScheduleForDay(emp.id, d);
                      const shift = sched ? shifts.find(s => s.id === sched.shift_id) : null;
                      return (
                        <td key={d.format("YYYY-MM-DD")} className={cn("px-2 py-2 text-center cursor-pointer hover:bg-slate-50", d.isSame(moment(), "day") && "bg-indigo-50/30")}
                          onClick={() => handleCellClick(emp.id, d)}>
                          {shift ? (
                            <div className="rounded-lg px-2 py-1 text-xs font-medium text-white" style={{ backgroundColor: shift.color || "#3b82f6" }}>
                              {shift.name}
                              <div className="text-[10px] opacity-80">{shift.start_time}-{shift.end_time}</div>
                            </div>
                          ) : (
                            <div className="text-slate-300 text-xs">+</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {employees.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Nuk ka punonjës aktiv</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 mt-3 flex-wrap">
            {shifts.map(s => (
              <div key={s.id} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: s.color }} />
                <span>{s.name} ({s.start_time}-{s.end_time})</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="shifts">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setShiftForm({ name: "", start_time: "08:00", end_time: "16:00", color: "#3b82f6" }); setEditingShiftId(null); setShiftDialogOpen(true); }} data-testid="button-add-shift">
              <Plus className="w-4 h-4 mr-1" /> Shto Turn
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map(s => (
              <div key={s.id} className="bg-white rounded-xl border p-5" data-testid={`card-shift-${s.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.color + "20" }}>
                      <Clock className="w-5 h-5" style={{ color: s.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{s.name}</h3>
                      <p className="text-sm text-slate-500">{s.start_time} - {s.end_time}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setShiftForm({...s}); setEditingShiftId(s.id); setShiftDialogOpen(true); }}><Edit2 className="w-4 h-4 mr-2" /> Modifiko</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteShift(s.id)}><Trash2 className="w-4 h-4 mr-2" /> Fshi</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {shifts.length === 0 && <p className="col-span-3 text-center text-slate-400 py-12">Nuk ka turne të krijuara</p>}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingShiftId ? "Modifiko Turnin" : "Shto Turn"}</DialogTitle>
            <DialogDescription>Konfiguro orarin e turnit</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Emri *</Label><Input value={shiftForm.name} onChange={e => setShiftForm({...shiftForm, name: e.target.value})} data-testid="input-shift-name" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Ora e Fillimit</Label><Input type="time" value={shiftForm.start_time} onChange={e => setShiftForm({...shiftForm, start_time: e.target.value})} /></div>
              <div><Label>Ora e Mbarimit</Label><Input type="time" value={shiftForm.end_time} onChange={e => setShiftForm({...shiftForm, end_time: e.target.value})} /></div>
            </div>
            <div><Label>Ngjyra</Label><Input type="color" value={shiftForm.color} onChange={e => setShiftForm({...shiftForm, color: e.target.value})} className="w-20 h-10" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShiftDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSaveShift} disabled={submitting} data-testid="button-save-shift">{submitting ? "Duke ruajtur..." : "Ruaj"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cakto Turn</DialogTitle>
            <DialogDescription>Cakto turnin për {scheduleForm.employee_name} në {moment(scheduleForm.schedule_date).format("D MMM YYYY")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Turni *</Label>
              <Select value={scheduleForm.shift_id} onValueChange={v => {
                const shift = shifts.find(s => s.id === v);
                setScheduleForm({...scheduleForm, shift_id: v, shift_name: shift?.name || ""});
              }}>
                <SelectTrigger data-testid="select-shift"><SelectValue placeholder="Zgjidh turnin" /></SelectTrigger>
                <SelectContent>
                  {shifts.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.start_time}-{s.end_time})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSaveSchedule} disabled={submitting} data-testid="button-save-schedule">{submitting ? "Duke ruajtur..." : "Ruaj"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
