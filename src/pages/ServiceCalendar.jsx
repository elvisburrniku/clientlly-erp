import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, Clock, MapPin, User, Trash2, Edit2 } from "lucide-react";
import moment from "moment";

const STATUS_COLORS = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_LABELS = {
  scheduled: "Planifikuar",
  confirmed: "Konfirmuar",
  in_progress: "Në Progres",
  completed: "Përfunduar",
  cancelled: "Anuluar",
};

const PRIORITY_LABELS = { low: "Ulët", medium: "Mesatar", high: "Lartë" };

const emptyForm = () => ({
  title: "",
  description: "",
  client_name: "",
  assigned_to: "",
  start_time: moment().format("YYYY-MM-DDTHH:mm"),
  end_time: moment().add(1, "hour").format("YYYY-MM-DDTHH:mm"),
  status: "scheduled",
  priority: "medium",
  service_type: "",
  location: "",
  notes: "",
  color: "#3b82f6",
});

export default function ServiceCalendar() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState("month");
  const [currentDate, setCurrentDate] = useState(moment());
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [appts, usrs, cls] = await Promise.all([
      base44.entities.ServiceAppointment.list("-start_time", 500),
      base44.entities.User.list("-created_date", 100).catch(() => []),
      base44.entities.Client.list("-created_date", 200).catch(() => []),
    ]);
    setAppointments(appts);
    setUsers(usrs);
    setClients(cls);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.title || !form.start_time) { toast.error("Titulli dhe ora e fillimit janë të detyrueshme"); return; }
    setSubmitting(true);
    try {
      if (editingId) {
        await base44.entities.ServiceAppointment.update(editingId, form);
        toast.success("Takimi u përditësua");
      } else {
        await base44.entities.ServiceAppointment.create(form);
        toast.success("Takimi u krijua");
      }
      setDialogOpen(false);
      setForm(emptyForm());
      setEditingId(null);
      loadData();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Fshi këtë takim?")) return;
    await base44.entities.ServiceAppointment.delete(id);
    toast.success("Takimi u fshi");
    loadData();
  };

  const openEdit = (appt) => {
    setForm({
      ...appt,
      start_time: moment(appt.start_time).format("YYYY-MM-DDTHH:mm"),
      end_time: appt.end_time ? moment(appt.end_time).format("YYYY-MM-DDTHH:mm") : "",
    });
    setEditingId(appt.id);
    setDialogOpen(true);
  };

  const navigate = (dir) => {
    setCurrentDate(moment(currentDate).add(dir, view === "month" ? "months" : view === "week" ? "weeks" : "days"));
  };

  const daysInMonth = useMemo(() => {
    const start = moment(currentDate).startOf("month").startOf("week");
    const end = moment(currentDate).endOf("month").endOf("week");
    const days = [];
    let d = start.clone();
    while (d.isSameOrBefore(end, "day")) { days.push(d.clone()); d.add(1, "day"); }
    return days;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const start = moment(currentDate).startOf("week");
    return Array.from({ length: 7 }, (_, i) => start.clone().add(i, "days"));
  }, [currentDate]);

  const getAppointmentsForDay = (day) => {
    return appointments.filter(a => moment(a.start_time).isSame(day, "day"));
  };

  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Kalendari i Shërbimeve</h1>
          <p className="text-sm text-muted-foreground mt-1">Menaxho takimet dhe orarin e shërbimeve</p>
        </div>
        <Button data-testid="button-add-appointment" onClick={() => { setForm(emptyForm()); setEditingId(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Takim i Ri
        </Button>
      </div>

      <div className="flex items-center justify-between bg-card rounded-xl border p-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} data-testid="button-prev"><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(moment())} data-testid="button-today">Sot</Button>
          <Button variant="outline" size="sm" onClick={() => navigate(1)} data-testid="button-next"><ChevronRight className="w-4 h-4" /></Button>
          <span className="text-sm font-semibold ml-2" data-testid="text-current-date">
            {view === "day" ? currentDate.format("DD MMMM YYYY") : view === "week" ? `${moment(currentDate).startOf("week").format("DD MMM")} - ${moment(currentDate).endOf("week").format("DD MMM YYYY")}` : currentDate.format("MMMM YYYY")}
          </span>
        </div>
        <div className="flex gap-1">
          {["month", "week", "day"].map(v => (
            <Button key={v} variant={view === v ? "default" : "outline"} size="sm" onClick={() => setView(v)} data-testid={`button-view-${v}`}>
              {v === "month" ? "Muaj" : v === "week" ? "Javë" : "Ditë"}
            </Button>
          ))}
        </div>
      </div>

      {view === "month" && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="grid grid-cols-7 border-b">
            {["Hën", "Mar", "Mër", "Enj", "Pre", "Sht", "Diel"].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {daysInMonth.map((day, i) => {
              const dayAppts = getAppointmentsForDay(day);
              const isToday = day.isSame(moment(), "day");
              const isCurrentMonth = day.isSame(currentDate, "month");
              return (
                <div key={i} className={cn("min-h-[100px] border-b border-r p-1", !isCurrentMonth && "bg-muted/30")}
                  onClick={() => { setCurrentDate(day); setView("day"); }} data-testid={`cell-day-${day.format("YYYY-MM-DD")}`}>
                  <span className={cn("text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full",
                    isToday && "bg-primary text-primary-foreground", !isCurrentMonth && "text-muted-foreground")}>
                    {day.format("D")}
                  </span>
                  <div className="space-y-0.5 mt-0.5">
                    {dayAppts.slice(0, 3).map(a => (
                      <div key={a.id} className={cn("text-[10px] px-1 py-0.5 rounded truncate cursor-pointer border", STATUS_COLORS[a.status] || STATUS_COLORS.scheduled)}
                        onClick={(e) => { e.stopPropagation(); openEdit(a); }} data-testid={`appointment-${a.id}`}>
                        {moment(a.start_time).format("HH:mm")} {a.title}
                      </div>
                    ))}
                    {dayAppts.length > 3 && <div className="text-[10px] text-muted-foreground px-1">+{dayAppts.length - 3} më shumë</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="grid grid-cols-8 border-b">
            <div className="text-xs text-muted-foreground p-2"></div>
            {weekDays.map(d => (
              <div key={d.format("ddd")} className={cn("text-center py-2", d.isSame(moment(), "day") && "bg-primary/5")}>
                <div className="text-xs text-muted-foreground">{d.format("ddd")}</div>
                <div className={cn("text-sm font-semibold", d.isSame(moment(), "day") && "text-primary")}>{d.format("D")}</div>
              </div>
            ))}
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {hours.map(h => (
              <div key={h} className="grid grid-cols-8 border-b min-h-[60px]">
                <div className="text-xs text-muted-foreground p-1 text-right pr-2 pt-1">{`${h}:00`}</div>
                {weekDays.map(d => {
                  const dayAppts = appointments.filter(a => {
                    const st = moment(a.start_time);
                    return st.isSame(d, "day") && st.hour() === h;
                  });
                  return (
                    <div key={d.format("YYYY-MM-DD")} className="border-l p-0.5">
                      {dayAppts.map(a => (
                        <div key={a.id} className={cn("text-[10px] px-1 py-0.5 rounded truncate cursor-pointer border mb-0.5", STATUS_COLORS[a.status] || STATUS_COLORS.scheduled)}
                          onClick={() => openEdit(a)} data-testid={`appointment-week-${a.id}`}>
                          {a.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "day" && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            {hours.map(h => {
              const hourAppts = appointments.filter(a => {
                const st = moment(a.start_time);
                return st.isSame(currentDate, "day") && st.hour() === h;
              });
              return (
                <div key={h} className="flex border-b min-h-[60px]">
                  <div className="w-16 text-xs text-muted-foreground p-2 text-right shrink-0">{`${h}:00`}</div>
                  <div className="flex-1 border-l p-1 space-y-1">
                    {hourAppts.map(a => (
                      <div key={a.id} className={cn("p-2 rounded-lg border cursor-pointer", STATUS_COLORS[a.status] || STATUS_COLORS.scheduled)}
                        onClick={() => openEdit(a)} data-testid={`appointment-day-${a.id}`}>
                        <div className="font-medium text-sm">{a.title}</div>
                        <div className="flex items-center gap-3 text-xs mt-1">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{moment(a.start_time).format("HH:mm")} - {a.end_time ? moment(a.end_time).format("HH:mm") : ""}</span>
                          {a.assigned_to && <span className="flex items-center gap-1"><User className="w-3 h-3" />{a.assigned_to}</span>}
                          {a.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{a.location}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Ndrysho Takimin" : "Takim i Ri"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Titulli *</Label><Input data-testid="input-title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Fillimi *</Label><Input data-testid="input-start" type="datetime-local" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Mbarimi</Label><Input data-testid="input-end" type="datetime-local" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} className="mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Statusi</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger className="mt-1.5" data-testid="select-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioriteti</Label>
                <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                  <SelectTrigger className="mt-1.5" data-testid="select-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Klienti</Label>
              <Select value={form.client_name || ""} onValueChange={v => setForm({...form, client_name: v})}>
                <SelectTrigger className="mt-1.5" data-testid="select-client"><SelectValue placeholder="Zgjidh klientin" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Caktuar Për</Label>
              <Select value={form.assigned_to || ""} onValueChange={v => setForm({...form, assigned_to: v})}>
                <SelectTrigger className="mt-1.5" data-testid="select-assigned"><SelectValue placeholder="Zgjidh personin" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={u.full_name || u.email}>{u.full_name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Lloji i Shërbimit</Label><Input data-testid="input-service-type" value={form.service_type || ""} onChange={e => setForm({...form, service_type: e.target.value})} className="mt-1.5" /></div>
            <div><Label>Vendndodhja</Label><Input data-testid="input-location" value={form.location || ""} onChange={e => setForm({...form, location: e.target.value})} className="mt-1.5" /></div>
            <div><Label>Përshkrim</Label><Textarea data-testid="input-description" value={form.description || ""} onChange={e => setForm({...form, description: e.target.value})} className="mt-1.5" rows={2} /></div>
            <div><Label>Shënime</Label><Textarea data-testid="input-notes" value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1.5" rows={2} /></div>
          </div>
          <DialogFooter className="gap-2">
            {editingId && <Button variant="destructive" size="sm" onClick={() => { handleDelete(editingId); setDialogOpen(false); }} data-testid="button-delete"><Trash2 className="w-4 h-4 mr-1" /> Fshi</Button>}
            <Button onClick={handleSave} disabled={submitting} data-testid="button-save">{submitting ? "Duke ruajtur..." : editingId ? "Përditëso" : "Ruaj"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
