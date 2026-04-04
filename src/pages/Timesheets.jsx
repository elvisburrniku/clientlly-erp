import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  Plus, Trash2, Pencil, Clock, Calendar, Download, Loader2, Timer, ChevronLeft, ChevronRight
} from "lucide-react";
import moment from "moment";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function Timesheets() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [form, setForm] = useState({ project_id: "", project_name: "", task_id: "", task_title: "", user_id: "", user_name: "", date: new Date().toISOString().split("T")[0], hours: "", description: "", billable: true });
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  const [weekStart, setWeekStart] = useState(moment().startOf("isoWeek"));
  const [filterProject, setFilterProject] = useState("all");
  const [filterUser, setFilterUser] = useState("all");

  useEffect(() => {
    if (tenantId) loadData();
  }, [tenantId]);

  const loadData = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [entryData, projectData, userData] = await Promise.all([
        base44.entities.Timesheet.filter({ tenant_id: tenantId }, "-date"),
        base44.entities.Project.filter({ tenant_id: tenantId }),
        base44.entities.User.filter({ tenant_id: tenantId }),
      ]);
      setEntries(entryData);
      setProjects(projectData);
      setUsers(userData);
    } catch (e) {
      toast.error("Gabim në ngarkim");
    }
    setLoading(false);
  };

  const loadTasksForProject = async (projectId) => {
    if (!projectId) { setTasks([]); return; }
    try {
      const data = await base44.entities.Task.filter({ project_id: projectId, tenant_id: tenantId });
      setTasks(data);
    } catch (e) {
      setTasks([]);
    }
  };

  const handleSave = async () => {
    if (!form.project_id || !form.hours || !form.date) return;
    setSubmitting(true);
    try {
      const payload = { ...form, hours: parseFloat(form.hours), tenant_id: tenantId };
      if (!payload.user_id) {
        payload.user_id = user?.id;
        payload.user_name = user?.full_name || user?.email;
      }
      if (editEntry) {
        await base44.entities.Timesheet.update(editEntry.id, payload);
        toast.success("Orari u përditësua");
      } else {
        await base44.entities.Timesheet.create(payload);
        toast.success("Orari u regjistrua");
      }
      setDialogOpen(false);
      setEditEntry(null);
      resetForm();
      loadData();
    } catch (e) {
      toast.error("Gabim");
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setForm({ project_id: "", project_name: "", task_id: "", task_title: "", user_id: "", user_name: "", date: new Date().toISOString().split("T")[0], hours: "", description: "", billable: true });
    setTasks([]);
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.Timesheet.delete(id);
      toast.success("Orari u fshi");
      loadData();
    } catch (e) {
      toast.error("Gabim");
    }
  };

  const openEdit = (entry) => {
    setEditEntry(entry);
    setForm({
      project_id: entry.project_id || "",
      project_name: entry.project_name || "",
      task_id: entry.task_id || "",
      task_title: entry.task_title || "",
      user_id: entry.user_id || "",
      user_name: entry.user_name || "",
      date: entry.date ? entry.date.split("T")[0] : "",
      hours: entry.hours?.toString() || "",
      description: entry.description || "",
      billable: entry.billable !== false,
    });
    if (entry.project_id) loadTasksForProject(entry.project_id);
    setDialogOpen(true);
  };

  const filteredEntries = entries.filter((e) => {
    if (filterProject !== "all" && e.project_id !== filterProject) return false;
    if (filterUser !== "all" && e.user_id !== filterUser) return false;
    return true;
  });

  const totalHours = filteredEntries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);
  const billableHours = filteredEntries.filter((e) => e.billable).reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);

  const weekDays = Array.from({ length: 7 }, (_, i) => moment(weekStart).add(i, "days"));
  const weekEntries = entries.filter((e) => {
    const d = moment(e.date);
    return d.isSameOrAfter(weekStart, "day") && d.isBefore(moment(weekStart).add(7, "days"), "day");
  });

  const exportToExcel = () => {
    const headers = ["Data", "Projekt", "Detyrë", "Punonjës", "Orë", "Faturohet", "Përshkrim"];
    const rows = filteredEntries.map((e) => [
      moment(e.date).format("DD/MM/YYYY"),
      e.project_name || "",
      e.task_title || "",
      e.user_name || "",
      e.hours || 0,
      e.billable ? "Po" : "Jo",
      e.description || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheets-${moment().format("YYYY-MM-DD")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Eksporti u krye");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Timer className="w-6 h-6" /> Oraret e Punës
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {totalHours.toFixed(1)} orë gjithsej · {billableHours.toFixed(1)} faturohen
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel} data-testid="button-export-timesheets">
            <Download className="w-4 h-4 mr-1" /> Eksporto
          </Button>
          <Button onClick={() => { setEditEntry(null); resetForm(); setDialogOpen(true); }} data-testid="button-add-timesheet">
            <Plus className="w-4 h-4 mr-1" /> Regjistro Orë
          </Button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-project"><SelectValue placeholder="Projekti" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha projektet</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-user"><SelectValue placeholder="Punonjësi" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjithë</SelectItem>
            {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="list" data-testid="tab-list"><Clock className="w-4 h-4 mr-1" /> Listë</TabsTrigger>
          <TabsTrigger value="weekly" data-testid="tab-weekly"><Calendar className="w-4 h-4 mr-1" /> Javore</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Data</th>
                  <th className="text-left px-4 py-3 font-medium">Projekt</th>
                  <th className="text-left px-4 py-3 font-medium">Detyrë</th>
                  <th className="text-left px-4 py-3 font-medium">Punonjës</th>
                  <th className="text-right px-4 py-3 font-medium">Orë</th>
                  <th className="text-left px-4 py-3 font-medium">Përshkrim</th>
                  <th className="px-4 py-3 w-[80px]"></th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-t hover:bg-muted/30" data-testid={`row-timesheet-${entry.id}`}>
                    <td className="px-4 py-3">{moment(entry.date).format("DD/MM/YY")}</td>
                    <td className="px-4 py-3">{entry.project_name}</td>
                    <td className="px-4 py-3">{entry.task_title || "-"}</td>
                    <td className="px-4 py-3">{entry.user_name}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {entry.hours}h
                      {entry.billable && <Badge variant="outline" className="ml-1 text-[10px]">$</Badge>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{entry.description}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(entry)} data-testid={`button-edit-timesheet-${entry.id}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(entry.id)} data-testid={`button-delete-timesheet-${entry.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">Nuk ka regjistrime</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="weekly">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="outline" size="icon" onClick={() => setWeekStart(moment(weekStart).subtract(1, "week"))} data-testid="button-prev-week">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium">
              {moment(weekStart).format("DD MMM")} - {moment(weekStart).add(6, "days").format("DD MMM YYYY")}
            </span>
            <Button variant="outline" size="icon" onClick={() => setWeekStart(moment(weekStart).add(1, "week"))} data-testid="button-next-week">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekStart(moment().startOf("isoWeek"))} data-testid="button-this-week">Sot</Button>
          </div>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Projekt</th>
                  {weekDays.map((d) => (
                    <th key={d.format("YYYY-MM-DD")} className="text-center px-2 py-3 font-medium min-w-[80px]">
                      <div>{d.format("ddd")}</div>
                      <div className="text-xs text-muted-foreground">{d.format("DD/MM")}</div>
                    </th>
                  ))}
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {projects.filter((p) => weekEntries.some((e) => e.project_id === p.id)).map((project) => {
                  const projectEntries = weekEntries.filter((e) => e.project_id === project.id);
                  const projectTotal = projectEntries.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
                  return (
                    <tr key={project.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{project.name}</td>
                      {weekDays.map((d) => {
                        const dayKey = d.format("YYYY-MM-DD");
                        const dayHours = projectEntries.filter((e) => e.date?.startsWith(dayKey)).reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
                        return (
                          <td key={dayKey} className="text-center px-2 py-3">
                            {dayHours > 0 ? <span className="font-medium">{dayHours}h</span> : <span className="text-muted-foreground">-</span>}
                          </td>
                        );
                      })}
                      <td className="text-right px-4 py-3 font-semibold">{projectTotal}h</td>
                    </tr>
                  );
                })}
                {weekEntries.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-muted-foreground">Nuk ka regjistrime për këtë javë</td>
                  </tr>
                )}
                {weekEntries.length > 0 && (
                  <tr className="border-t bg-muted/30 font-semibold">
                    <td className="px-4 py-3">Total</td>
                    {weekDays.map((d) => {
                      const dayKey = d.format("YYYY-MM-DD");
                      const dayTotal = weekEntries.filter((e) => e.date?.startsWith(dayKey)).reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
                      return <td key={dayKey} className="text-center px-2 py-3">{dayTotal > 0 ? `${dayTotal}h` : "-"}</td>;
                    })}
                    <td className="text-right px-4 py-3">{weekEntries.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0)}h</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editEntry ? "Ndrysho Orarin" : "Regjistro Orë"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Projekti *</Label>
                <Select
                  value={form.project_id || "none"}
                  onValueChange={(v) => {
                    const p = projects.find((p) => p.id === v);
                    setForm({ ...form, project_id: v === "none" ? "" : v, project_name: p?.name || "", task_id: "", task_title: "" });
                    if (v !== "none") loadTasksForProject(v);
                    else setTasks([]);
                  }}
                >
                  <SelectTrigger data-testid="select-timesheet-project"><SelectValue placeholder="Zgjidh" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Zgjidh</SelectItem>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Detyrë</Label>
                <Select
                  value={form.task_id || "none"}
                  onValueChange={(v) => {
                    const t = tasks.find((t) => t.id === v);
                    setForm({ ...form, task_id: v === "none" ? "" : v, task_title: t?.title || "" });
                  }}
                >
                  <SelectTrigger data-testid="select-timesheet-task"><SelectValue placeholder="Zgjidh" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Asnjë</SelectItem>
                    {tasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Data *</Label>
                <Input data-testid="input-timesheet-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>Orë *</Label>
                <Input data-testid="input-timesheet-hours" type="number" step="0.25" min="0" max="24" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="0.0" />
              </div>
              <div>
                <Label>Faturohet</Label>
                <Select value={form.billable ? "true" : "false"} onValueChange={(v) => setForm({ ...form, billable: v === "true" })}>
                  <SelectTrigger data-testid="select-timesheet-billable"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Po</SelectItem>
                    <SelectItem value="false">Jo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Punonjësi</Label>
              <Select
                value={form.user_id || "none"}
                onValueChange={(v) => {
                  const u = users.find((u) => u.id === v);
                  setForm({ ...form, user_id: v === "none" ? "" : v, user_name: u?.full_name || u?.email || "" });
                }}
              >
                <SelectTrigger data-testid="select-timesheet-user"><SelectValue placeholder="Unë" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unë</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Përshkrimi</Label>
              <Textarea data-testid="input-timesheet-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Çfarë bëre..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button data-testid="button-save-timesheet" onClick={handleSave} disabled={submitting || !form.project_id || !form.hours || !form.date}>
              {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editEntry ? "Ruaj" : "Regjistro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
