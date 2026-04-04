import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  Plus, Trash2, Pencil, MoreHorizontal, FolderKanban, Search, Calendar,
  Users, Clock, CheckCircle2, AlertCircle, Loader2
} from "lucide-react";
import moment from "moment";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "planning", label: "Planifikim", color: "bg-slate-100 text-slate-700" },
  { value: "active", label: "Aktiv", color: "bg-blue-100 text-blue-700" },
  { value: "on_hold", label: "Në pritje", color: "bg-yellow-100 text-yellow-700" },
  { value: "completed", label: "Përfunduar", color: "bg-green-100 text-green-700" },
  { value: "cancelled", label: "Anuluar", color: "bg-red-100 text-red-700" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Ulët", color: "bg-slate-100 text-slate-600" },
  { value: "medium", label: "Mesatar", color: "bg-blue-100 text-blue-600" },
  { value: "high", label: "Lartë", color: "bg-orange-100 text-orange-600" },
  { value: "critical", label: "Kritik", color: "bg-red-100 text-red-600" },
];

const emptyForm = () => ({
  name: "",
  description: "",
  client_id: "",
  client_name: "",
  status: "planning",
  priority: "medium",
  start_date: new Date().toISOString().split("T")[0],
  end_date: "",
});

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (tenantId) loadData();
  }, [tenantId]);

  const loadData = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [projectData, clientData] = await Promise.all([
        base44.entities.Project.filter({ tenant_id: tenantId }, "-created_at"),
        base44.entities.Client.filter({ tenant_id: tenantId }),
      ]);
      setProjects(projectData);
      setClients(clientData);
    } catch (e) {
      toast.error("Gabim në ngarkim");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSubmitting(true);
    try {
      if (editProject) {
        await base44.entities.Project.update(editProject.id, form);
        toast.success("Projekti u përditësua");
      } else {
        await base44.entities.Project.create({ ...form, tenant_id: tenantId, created_by: user?.id });
        toast.success("Projekti u krijua");
      }
      setDialogOpen(false);
      setEditProject(null);
      setForm(emptyForm());
      loadData();
    } catch (e) {
      toast.error("Gabim në ruajtje");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Jeni i sigurt?")) return;
    try {
      await base44.entities.Project.delete(id);
      toast.success("Projekti u fshi");
      loadData();
    } catch (e) {
      toast.error("Gabim në fshirje");
    }
  };

  const openEdit = (project) => {
    setEditProject(project);
    setForm({
      name: project.name || "",
      description: project.description || "",
      client_id: project.client_id || "",
      client_name: project.client_name || "",
      status: project.status || "planning",
      priority: project.priority || "medium",
      start_date: project.start_date ? project.start_date.split("T")[0] : "",
      end_date: project.end_date ? project.end_date.split("T")[0] : "",
    });
    setDialogOpen(true);
  };

  const filtered = projects.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status) => {
    const s = STATUS_OPTIONS.find((o) => o.value === status);
    return s ? <Badge className={s.color}>{s.label}</Badge> : <Badge>{status}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const p = PRIORITY_OPTIONS.find((o) => o.value === priority);
    return p ? <Badge variant="outline" className={p.color}>{p.label}</Badge> : null;
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
            <FolderKanban className="w-6 h-6" /> Projektet
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{projects.length} projekte gjithsej</p>
        </div>
        <Button
          data-testid="button-create-project"
          onClick={() => { setEditProject(null); setForm(emptyForm()); setDialogOpen(true); }}
        >
          <Plus className="w-4 h-4 mr-1" /> Projekt i Ri
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-projects"
            placeholder="Kërko projekte..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Statusi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((project) => (
          <div
            key={project.id}
            data-testid={`card-project-${project.id}`}
            className="border rounded-xl p-5 bg-card hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-base" data-testid={`text-project-name-${project.id}`}>{project.name}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-project-menu-${project.id}`}>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => openEdit(project)} data-testid={`button-edit-project-${project.id}`}>
                    <Pencil className="w-4 h-4 mr-2" /> Ndrysho
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(project.id)} className="text-red-600" data-testid={`button-delete-project-${project.id}`}>
                    <Trash2 className="w-4 h-4 mr-2" /> Fshi
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {getStatusBadge(project.status)}
              {getPriorityBadge(project.priority)}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {project.client_name && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {project.client_name}
                </span>
              )}
              {project.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {moment(project.start_date).format("DD/MM/YY")}
                </span>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nuk ka projekte</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editProject ? "Ndrysho Projektin" : "Projekt i Ri"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Emri *</Label>
              <Input
                data-testid="input-project-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Emri i projektit"
              />
            </div>
            <div>
              <Label>Përshkrimi</Label>
              <Textarea
                data-testid="input-project-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Klienti</Label>
                <Select
                  value={form.client_id || "none"}
                  onValueChange={(v) => {
                    const cl = clients.find((c) => c.id === v);
                    setForm({ ...form, client_id: v === "none" ? "" : v, client_name: cl?.name || "" });
                  }}
                >
                  <SelectTrigger data-testid="select-project-client">
                    <SelectValue placeholder="Zgjidh klientin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Asnjë</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioriteti</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger data-testid="select-project-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Statusi</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="select-project-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data e Fillimit</Label>
                <Input
                  data-testid="input-project-start-date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Data e Përfundimit</Label>
              <Input
                data-testid="input-project-end-date"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button data-testid="button-save-project" onClick={handleSave} disabled={submitting || !form.name}>
              {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editProject ? "Ruaj" : "Krijo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
