import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Search, Download, ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";
import { jsPDF } from "jspdf";

const statusConfig = {
  present: { label: "Prezent", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  absent: { label: "Mungon", color: "bg-red-100 text-red-700", icon: XCircle },
  late: { label: "Vonuar", color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
  half_day: { label: "Gjysmë Dite", color: "bg-blue-100 text-blue-700", icon: Clock },
  holiday: { label: "Festë", color: "bg-purple-100 text-purple-700", icon: CheckCircle2 },
};

export default function Attendance() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentDate, setCurrentDate] = useState(moment().format("YYYY-MM-DD"));
  const [viewMode, setViewMode] = useState("daily");
  const [selectedMonth, setSelectedMonth] = useState(moment().month());
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    employee_id: "", employee_name: "", attendance_date: moment().format("YYYY-MM-DD"),
    check_in: "09:00", check_out: "17:00", status: "present", notes: "",
  });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [att, emps, hols] = await Promise.all([
        base44.entities.Attendance.filter({ tenant_id: tenantId }, "-attendance_date"),
        base44.entities.Employee.filter({ tenant_id: tenantId, status: "active" }),
        base44.entities.Holiday.filter({ tenant_id: tenantId }, "-holiday_date"),
      ]);
      setAttendance(att);
      setEmployees(emps);
      setHolidays(hols);
    } catch (e) { toast.error("Gabim në ngarkim"); }
    setLoading(false);
  };

  const dailyRecords = attendance.filter(a => a.attendance_date === currentDate);
  const monthlyRecords = attendance.filter(a => {
    const d = moment(a.attendance_date);
    return d.month() === selectedMonth && d.year() === selectedYear;
  });

  const filteredDaily = dailyRecords.filter(a =>
    !search || (a.employee_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const calcHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const [h1, m1] = checkIn.split(":").map(Number);
    const [h2, m2] = checkOut.split(":").map(Number);
    return Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60).toFixed(1);
  };

  const handleSave = async () => {
    if (!form.employee_id) { toast.error("Zgjidh punonjësin"); return; }
    setSubmitting(true);
    try {
      const hours = calcHours(form.check_in, form.check_out);
      await base44.entities.Attendance.create({
        ...form, tenant_id: tenantId, hours_worked: parseFloat(hours),
      });
      toast.success("Prezenca u regjistrua");
      setDialogOpen(false);
      setForm({ employee_id: "", employee_name: "", attendance_date: currentDate, check_in: "09:00", check_out: "17:00", status: "present", notes: "" });
      loadAll();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleDeleteAttendance = async (id) => {
    if (!confirm("Fshi këtë regjistrim?")) return;
    try { await base44.entities.Attendance.delete(id); toast.success("U fshi"); loadAll(); }
    catch (e) { toast.error(e.message); }
  };

  const monthlySummary = () => {
    const summary = {};
    employees.forEach(emp => {
      summary[emp.id] = { name: `${emp.first_name} ${emp.last_name}`, present: 0, absent: 0, late: 0, half_day: 0, total_hours: 0 };
    });
    monthlyRecords.forEach(r => {
      if (summary[r.employee_id]) {
        if (r.status === "present") summary[r.employee_id].present++;
        else if (r.status === "absent") summary[r.employee_id].absent++;
        else if (r.status === "late") summary[r.employee_id].late++;
        else if (r.status === "half_day") summary[r.employee_id].half_day++;
        summary[r.employee_id].total_hours += parseFloat(r.hours_worked || 0);
      }
    });
    return Object.values(summary).filter(s => s.present + s.absent + s.late + s.half_day > 0);
  };

  const exportMonthlyPDF = () => {
    const doc = new jsPDF();
    const summ = monthlySummary();
    doc.setFontSize(16);
    doc.text(`Raporti Mujor i Prezencës - ${moment().month(selectedMonth).format("MMMM")} ${selectedYear}`, 14, 20);
    doc.setFontSize(10);
    let y = 35;
    doc.setFont("helvetica", "bold");
    doc.text("Punonjësi", 14, y);
    doc.text("Prezent", 80, y);
    doc.text("Mungon", 100, y);
    doc.text("Vonuar", 120, y);
    doc.text("Orë Tot.", 145, y);
    doc.setFont("helvetica", "normal");
    y += 8;
    summ.forEach(s => {
      doc.text(s.name, 14, y);
      doc.text(String(s.present), 80, y);
      doc.text(String(s.absent), 100, y);
      doc.text(String(s.late), 120, y);
      doc.text(s.total_hours.toFixed(1), 145, y);
      y += 7;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    doc.save(`prezenca_${selectedYear}_${selectedMonth + 1}.pdf`);
    toast.success("PDF u eksportua");
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Prezenca</h1>
          <p className="text-sm text-slate-500 mt-1">Regjistro dhe monito prezencën e punonjësve</p>
        </div>
        <div className="flex gap-2">
          <Button variant={viewMode === "daily" ? "default" : "outline"} onClick={() => setViewMode("daily")} data-testid="button-view-daily">Ditore</Button>
          <Button variant={viewMode === "monthly" ? "default" : "outline"} onClick={() => setViewMode("monthly")} data-testid="button-view-monthly">Mujore</Button>
        </div>
      </div>

      {viewMode === "daily" ? (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(moment(currentDate).subtract(1, "day").format("YYYY-MM-DD"))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Input type="date" value={currentDate} onChange={e => setCurrentDate(e.target.value)} className="w-44" data-testid="input-date" />
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(moment(currentDate).add(1, "day").format("YYYY-MM-DD"))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-slate-600">{moment(currentDate).format("dddd, D MMMM YYYY")}</span>
            <div className="flex-1" />
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Kërko..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="input-search-attendance" />
            </div>
            <Button onClick={() => { setForm({...form, attendance_date: currentDate}); setDialogOpen(true); }} data-testid="button-add-attendance">
              <Plus className="w-4 h-4 mr-1" /> Regjistro Prezencën
            </Button>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Punonjësi</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Hyrje</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Dalje</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Orë</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Statusi</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Shënime</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDaily.map(r => {
                  const cfg = statusConfig[r.status] || statusConfig.present;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50" data-testid={`row-attendance-${r.id}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">{r.employee_name}</td>
                      <td className="px-4 py-3 text-slate-600">{r.check_in || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{r.check_out || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{r.hours_worked || "—"}</td>
                      <td className="px-4 py-3"><Badge className={cn("text-xs", cfg.color)}>{cfg.label}</Badge></td>
                      <td className="px-4 py-3 text-slate-500">{r.notes || "—"}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteAttendance(r.id)}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filteredDaily.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Nuk ka regjistrime për këtë datë</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {moment.months().map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button variant="outline" onClick={exportMonthlyPDF} data-testid="button-export-attendance">
              <Download className="w-4 h-4 mr-1" /> Eksporto PDF
            </Button>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Punonjësi</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Prezent</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Mungon</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Vonuar</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Gjysmë Dite</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Orë Totale</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {monthlySummary().map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-4 py-3 text-center"><Badge className="bg-green-100 text-green-700">{s.present}</Badge></td>
                    <td className="px-4 py-3 text-center"><Badge className="bg-red-100 text-red-700">{s.absent}</Badge></td>
                    <td className="px-4 py-3 text-center"><Badge className="bg-yellow-100 text-yellow-700">{s.late}</Badge></td>
                    <td className="px-4 py-3 text-center"><Badge className="bg-blue-100 text-blue-700">{s.half_day}</Badge></td>
                    <td className="px-4 py-3 text-center font-medium">{s.total_hours.toFixed(1)}</td>
                  </tr>
                ))}
                {monthlySummary().length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Nuk ka të dhëna për këtë muaj</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regjistro Prezencën</DialogTitle>
            <DialogDescription>Shto regjistrimin e prezencës për punonjësin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Punonjësi *</Label>
              <Select value={form.employee_id} onValueChange={v => {
                const emp = employees.find(e => e.id === v);
                setForm({...form, employee_id: v, employee_name: emp ? `${emp.first_name} ${emp.last_name}` : ""});
              }}>
                <SelectTrigger data-testid="select-employee"><SelectValue placeholder="Zgjidh punonjësin" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Data</Label><Input type="date" value={form.attendance_date} onChange={e => setForm({...form, attendance_date: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Ora e Hyrjes</Label><Input type="time" value={form.check_in} onChange={e => setForm({...form, check_in: e.target.value})} data-testid="input-check-in" /></div>
              <div><Label>Ora e Daljes</Label><Input type="time" value={form.check_out} onChange={e => setForm({...form, check_out: e.target.value})} data-testid="input-check-out" /></div>
            </div>
            <div>
              <Label>Statusi</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Shënime</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSave} disabled={submitting} data-testid="button-save-attendance">{submitting ? "Duke ruajtur..." : "Ruaj"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
