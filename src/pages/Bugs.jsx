import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  Plus, Trash2, Pencil, Bug as BugIcon, Search, Download, Loader2,
  LayoutGrid, List, Flag, AlertTriangle, Calendar
} from "lucide-react";
import moment from "moment";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const SEVERITY_OPTIONS = [
  { value: "low", label: "Ulët", color: "bg-slate-100 text-slate-700" },
  { value: "medium", label: "Mesatar", color: "bg-yellow-100 text-yellow-700" },
  { value: "high", label: "Lartë", color: "bg-orange-100 text-orange-700" },
  { value: "critical", label: "Kritik", color: "bg-red-100 text-red-700" },
];

const STATUS_OPTIONS = [
  { value: "open", label: "Hapur", color: "bg-red-100 text-red-700" },
  { value: "in_progress", label: "Në progres", color: "bg-blue-100 text-blue-700" },
  { value: "resolved", label: "Zgjidhur", color: "bg-green-100 text-green-700" },
  { value: "closed", label: "Mbyllur", color: "bg-slate-100 text-slate-700" },
  { value: "wont_fix", label: "Nuk ndreqet", color: "bg-gray-100 text-gray-700" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Ulët" },
  { value: "medium", label: "Mesatar" },
  { value: "high", label: "Lartë" },
  { value: "critical", label: "Kritik" },
];

const emptyForm = () => ({
  title: "",
  description: "",
  project_id: "",
  project_name: "",
  severity: "medium",
  priority: "medium",
  status: "open",
  assignee_id: "",
  assignee_name: "",
  due_date: "",
});

export default function Bugs() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [bugs, setBugs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBug, setEditBug] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState("kanban");
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");

  const [draggedBug, setDraggedBug] = useState(null);

  useEffect(() => {
    if (tenantId) loadData();
  }, [tenantId]);

  const loadData = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [bugData, projectData, userData] = await Promise.all([
        base44.entities.Bug.filter({ tenant_id: tenantId }, "-created_at"),
        base44.entities.Project.filter({ tenant_id: tenantId }),
        base44.entities.User.filter({ tenant_id: tenantId }),
      ]);
      setBugs(bugData);
      setProjects(projectData);
      setUsers(userData);
    } catch (e) {
      toast.error("Gabim në ngarkim");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.title) return;
    setSubmitting(true);
    try {
      if (editBug) {
        await base44.entities.Bug.update(editBug.id, form);
        toast.success("Bug-u u përditësua");
      } else {
        await base44.entities.Bug.create({
          ...form,
          tenant_id: tenantId,
          reported_by: user?.id,
          reported_by_name: user?.full_name || user?.email,
        });
        toast.success("Bug-u u raportua");
      }
      setDialogOpen(false);
      setEditBug(null);
      setForm(emptyForm());
      loadData();
    } catch (e) {
      toast.error("Gabim");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Jeni i sigurt?")) return;
    try {
      await base44.entities.Bug.delete(id);
      toast.success("Bug-u u fshi");
      loadData();
    } catch (e) {
      toast.error("Gabim");
    }
  };

  const openEdit = (bug) => {
    setEditBug(bug);
    setForm({
      title: bug.title || "",
      description: bug.description || "",
      project_id: bug.project_id || "",
      project_name: bug.project_name || "",
      severity: bug.severity || "medium",
      priority: bug.priority || "medium",
      status: bug.status || "open",
      assignee_id: bug.assignee_id || "",
      assignee_name: bug.assignee_name || "",
      due_date: bug.due_date ? bug.due_date.split("T")[0] : "",
    });
    setDialogOpen(true);
  };

  const handleDragStart = (e, bug) => {
    setDraggedBug(bug);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, status) => {
    e.preventDefault();
    if (!draggedBug || draggedBug.status === status) {
      setDraggedBug(null);
      return;
    }
    try {
      await base44.entities.Bug.update(draggedBug.id, { status });
      setBugs((prev) => prev.map((b) => (b.id === draggedBug.id ? { ...b, status } : b)));
    } catch (e) {
      toast.error("Gabim");
    }
    setDraggedBug(null);
  };

  const filtered = bugs.filter((b) => {
    if (search && !b.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSeverity !== "all" && b.severity !== filterSeverity) return false;
    return true;
  });

  const getSeverityBadge = (severity) => {
    const s = SEVERITY_OPTIONS.find((o) => o.value === severity);
    return s ? <Badge className={s.color}>{s.label}</Badge> : <Badge>{severity}</Badge>;
  };

  const getStatusBadge = (status) => {
    const s = STATUS_OPTIONS.find((o) => o.value === status);
    return s ? <Badge className={s.color}>{s.label}</Badge> : <Badge>{status}</Badge>;
  };

  const exportToExcel = () => {
    const headers = ["Titulli", "Projekt", "Serioziteti", "Prioriteti", "Statusi", "Caktuar", "Raportuar nga", "Data"];
    const rows = filtered.map((b) => [
      b.title,
      b.project_name || "",
      b.severity,
      b.priority,
      b.status,
      b.assignee_name || "",
      b.reported_by_name || "",
      moment(b.created_at).format("DD/MM/YYYY"),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bugs-${moment().format("YYYY-MM-DD")}.csv`;
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
            <BugIcon className="w-6 h-6" /> Bug Tracking
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{bugs.length} bug-e gjithsej</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel} data-testid="button-export-bugs">
            <Download className="w-4 h-4 mr-1" /> Eksporto
          </Button>
          <Button onClick={() => { setEditBug(null); setForm(emptyForm()); setDialogOpen(true); }} data-testid="button-create-bug">
            <Plus className="w-4 h-4 mr-1" /> Raporto Bug
          </Button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-bugs"
            placeholder="Kërko bug-e..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[160px]" data-testid="select-severity-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha</SelectItem>
            {SEVERITY_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex border rounded-lg">
          <Button
            variant={viewMode === "kanban" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("kanban")}
            data-testid="button-view-kanban"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            data-testid="button-view-list"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {viewMode === "kanban" ? (
        <div className="grid grid-cols-4 gap-4 min-h-[400px]">
          {STATUS_OPTIONS.filter((s) => s.value !== "wont_fix").map((status) => {
            const statusBugs = filtered.filter((b) => b.status === status.value);
            return (
              <div
                key={status.value}
                className="bg-muted/50 rounded-xl p-3 flex flex-col"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status.value)}
                data-testid={`column-bug-${status.value}`}
              >
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-sm font-semibold">{status.label}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">{statusBugs.length}</Badge>
                </div>
                <div className="flex-1 space-y-2 min-h-[100px]">
                  {statusBugs.map((bug) => (
                    <div
                      key={bug.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, bug)}
                      onClick={() => openEdit(bug)}
                      className="bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
                      data-testid={`card-bug-${bug.id}`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${bug.severity === "critical" ? "text-red-500" : bug.severity === "high" ? "text-orange-500" : "text-yellow-500"}`} />
                        <span className="text-sm font-medium leading-tight">{bug.title}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getSeverityBadge(bug.severity)}
                        {bug.assignee_name && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">
                              {bug.assignee_name.charAt(0).toUpperCase()}
                            </div>
                            {bug.assignee_name.split(" ")[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Titulli</th>
                <th className="text-left px-4 py-3 font-medium">Projekt</th>
                <th className="text-left px-4 py-3 font-medium">Serioziteti</th>
                <th className="text-left px-4 py-3 font-medium">Statusi</th>
                <th className="text-left px-4 py-3 font-medium">Caktuar</th>
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 w-[80px]"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((bug) => (
                <tr key={bug.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => openEdit(bug)} data-testid={`row-bug-${bug.id}`}>
                  <td className="px-4 py-3 font-medium">{bug.title}</td>
                  <td className="px-4 py-3">{bug.project_name || "-"}</td>
                  <td className="px-4 py-3">{getSeverityBadge(bug.severity)}</td>
                  <td className="px-4 py-3">{getStatusBadge(bug.status)}</td>
                  <td className="px-4 py-3">{bug.assignee_name || "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{moment(bug.created_at).format("DD/MM/YY")}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(bug.id)} data-testid={`button-delete-bug-${bug.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">Nuk ka bug-e</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editBug ? "Ndrysho Bug" : "Raporto Bug"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Titulli *</Label>
              <Input data-testid="input-bug-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Përshkruaj bug-un" />
            </div>
            <div>
              <Label>Përshkrimi</Label>
              <Textarea data-testid="input-bug-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Projekti</Label>
                <Select
                  value={form.project_id || "none"}
                  onValueChange={(v) => {
                    const p = projects.find((p) => p.id === v);
                    setForm({ ...form, project_id: v === "none" ? "" : v, project_name: p?.name || "" });
                  }}
                >
                  <SelectTrigger data-testid="select-bug-project"><SelectValue placeholder="Zgjidh" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Asnjë</SelectItem>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Serioziteti</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger data-testid="select-bug-severity"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prioriteti</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger data-testid="select-bug-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Statusi</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="select-bug-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Caktuar</Label>
                <Select
                  value={form.assignee_id || "none"}
                  onValueChange={(v) => {
                    const u = users.find((u) => u.id === v);
                    setForm({ ...form, assignee_id: v === "none" ? "" : v, assignee_name: u?.full_name || "" });
                  }}
                >
                  <SelectTrigger data-testid="select-bug-assignee"><SelectValue placeholder="Zgjidh" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Asnjë</SelectItem>
                    {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Afati</Label>
                <Input data-testid="input-bug-due-date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button data-testid="button-save-bug" onClick={handleSave} disabled={submitting || !form.title}>
              {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editBug ? "Ruaj" : "Raporto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
