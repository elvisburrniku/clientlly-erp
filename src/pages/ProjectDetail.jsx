import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  ArrowLeft, Plus, Trash2, Pencil, GripVertical, CheckCircle2, Circle,
  Calendar, Users, Clock, MessageSquare, CheckSquare, Square, Loader2,
  MoreHorizontal, Flag, Target, ListTodo, Timer, UserPlus, X
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

const DEFAULT_STAGES = [
  { key: "to_do", label: "Për të bërë", color: "#94a3b8" },
  { key: "in_progress", label: "Në progres", color: "#3b82f6" },
  { key: "review", label: "Rishikim", color: "#f59e0b" },
  { key: "done", label: "Përfunduar", color: "#22c55e" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Ulët" },
  { value: "medium", label: "Mesatar" },
  { value: "high", label: "Lartë" },
  { value: "critical", label: "Kritik" },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("board");

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", stage: "to_do", assignee_id: "", assignee_name: "", priority: "medium", due_date: "", milestone_id: "" });

  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [editMilestone, setEditMilestone] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({ name: "", description: "", due_date: "", status: "pending" });

  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({ user_id: "", role: "member" });

  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [newCheckItem, setNewCheckItem] = useState("");

  const [draggedTask, setDraggedTask] = useState(null);

  useEffect(() => {
    if (id && tenantId) loadAll();
  }, [id, tenantId]);

  const loadAll = async () => {
    if (!id || !tenantId) return;
    setLoading(true);
    try {
      const [proj, memberData, milestoneData, taskData, userData] = await Promise.all([
        base44.entities.Project.get(id),
        base44.entities.ProjectMember.filter({ project_id: id, tenant_id: tenantId }),
        base44.entities.Milestone.filter({ project_id: id, tenant_id: tenantId }, "sort_order"),
        base44.entities.Task.filter({ project_id: id, tenant_id: tenantId }, "sort_order"),
        base44.entities.User.filter({ tenant_id: tenantId }),
      ]);
      setProject(proj);
      setMembers(memberData);
      setMilestones(milestoneData);
      setTasks(taskData);
      setUsers(userData);
    } catch (e) {
      toast.error("Gabim në ngarkim");
    }
    setLoading(false);
  };

  const loadTasks = async () => {
    const taskData = await base44.entities.Task.filter({ project_id: id, tenant_id: tenantId }, "sort_order");
    setTasks(taskData);
  };

  const loadComments = async (taskId) => {
    const data = await base44.entities.TaskComment.filter({ task_id: taskId, tenant_id: tenantId }, "created_at");
    setComments(data);
  };

  const handleSaveTask = async () => {
    if (!taskForm.title) return;
    try {
      if (editTask) {
        await base44.entities.Task.update(editTask.id, taskForm);
        toast.success("Detyra u përditësua");
      } else {
        await base44.entities.Task.create({ ...taskForm, project_id: id, tenant_id: tenantId, created_by: user?.id });
        toast.success("Detyra u krijua");
      }
      setTaskDialogOpen(false);
      setEditTask(null);
      setTaskForm({ title: "", description: "", stage: "to_do", assignee_id: "", assignee_name: "", priority: "medium", due_date: "", milestone_id: "" });
      loadTasks();
    } catch (e) {
      toast.error("Gabim");
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await base44.entities.Task.delete(taskId);
      toast.success("Detyra u fshi");
      loadTasks();
      setTaskDetailOpen(false);
    } catch (e) {
      toast.error("Gabim");
    }
  };

  const handleSaveMilestone = async () => {
    if (!milestoneForm.name) return;
    try {
      if (editMilestone) {
        await base44.entities.Milestone.update(editMilestone.id, milestoneForm);
        toast.success("Milestone u përditësua");
      } else {
        await base44.entities.Milestone.create({ ...milestoneForm, project_id: id, tenant_id: tenantId });
        toast.success("Milestone u krijua");
      }
      setMilestoneDialogOpen(false);
      setEditMilestone(null);
      setMilestoneForm({ name: "", description: "", due_date: "", status: "pending" });
      const milestoneData = await base44.entities.Milestone.filter({ project_id: id, tenant_id: tenantId }, "sort_order");
      setMilestones(milestoneData);
    } catch (e) {
      toast.error("Gabim");
    }
  };

  const handleDeleteMilestone = async (milestoneId) => {
    try {
      await base44.entities.Milestone.delete(milestoneId);
      toast.success("Milestone u fshi");
      const milestoneData = await base44.entities.Milestone.filter({ project_id: id, tenant_id: tenantId }, "sort_order");
      setMilestones(milestoneData);
    } catch (e) {
      toast.error("Gabim");
    }
  };

  const toggleMilestone = async (milestone) => {
    const newStatus = milestone.status === "completed" ? "pending" : "completed";
    await base44.entities.Milestone.update(milestone.id, {
      status: newStatus,
      completed_at: newStatus === "completed" ? new Date().toISOString() : null,
    });
    const milestoneData = await base44.entities.Milestone.filter({ project_id: id, tenant_id: tenantId }, "sort_order");
    setMilestones(milestoneData);
  };

  const handleAddMember = async () => {
    if (!memberForm.user_id) return;
    const u = users.find((u) => u.id === memberForm.user_id);
    if (!u) return;
    const existing = members.find((m) => m.user_id === memberForm.user_id);
    if (existing) { toast.error("Anëtari ekziston"); return; }
    try {
      await base44.entities.ProjectMember.create({
        project_id: id,
        tenant_id: tenantId,
        user_id: u.id,
        user_name: u.full_name,
        user_email: u.email,
        role: memberForm.role,
      });
      toast.success("Anëtari u shtua");
      setMemberDialogOpen(false);
      setMemberForm({ user_id: "", role: "member" });
      const memberData = await base44.entities.ProjectMember.filter({ project_id: id, tenant_id: tenantId });
      setMembers(memberData);
    } catch (e) {
      toast.error("Gabim");
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await base44.entities.ProjectMember.delete(memberId);
      const memberData = await base44.entities.ProjectMember.filter({ project_id: id, tenant_id: tenantId });
      setMembers(memberData);
      toast.success("Anëtari u hoq");
    } catch (e) {
      toast.error("Gabim");
    }
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, stageKey) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.stage === stageKey) {
      setDraggedTask(null);
      return;
    }
    try {
      await base44.entities.Task.update(draggedTask.id, { stage: stageKey });
      setTasks((prev) =>
        prev.map((t) => (t.id === draggedTask.id ? { ...t, stage: stageKey } : t))
      );
    } catch (e) {
      toast.error("Gabim");
    }
    setDraggedTask(null);
  };

  const openTaskDetail = async (task) => {
    setSelectedTask(task);
    setTaskDetailOpen(true);
    await loadComments(task.id);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTask) return;
    try {
      await base44.entities.TaskComment.create({
        task_id: selectedTask.id,
        tenant_id: tenantId,
        user_id: user?.id,
        user_name: user?.full_name || user?.email,
        content: newComment,
      });
      setNewComment("");
      await loadComments(selectedTask.id);
    } catch (e) {
      toast.error("Gabim");
    }
  };

  const toggleChecklistItem = async (task, index) => {
    const checklist = Array.isArray(task.checklist) ? [...task.checklist] : [];
    if (checklist[index]) {
      checklist[index] = { ...checklist[index], done: !checklist[index].done };
      await base44.entities.Task.update(task.id, { checklist });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, checklist } : t)));
      if (selectedTask?.id === task.id) setSelectedTask({ ...task, checklist });
    }
  };

  const addChecklistItem = async () => {
    if (!newCheckItem.trim() || !selectedTask) return;
    const checklist = Array.isArray(selectedTask.checklist) ? [...selectedTask.checklist] : [];
    checklist.push({ text: newCheckItem, done: false });
    await base44.entities.Task.update(selectedTask.id, { checklist });
    setSelectedTask({ ...selectedTask, checklist });
    setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? { ...t, checklist } : t)));
    setNewCheckItem("");
  };

  const getPriorityColor = (p) => {
    const map = { low: "text-slate-400", medium: "text-blue-500", high: "text-orange-500", critical: "text-red-500" };
    return map[p] || "text-slate-400";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center text-muted-foreground">Projekti nuk u gjet</div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")} data-testid="button-back-projects">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-project-detail-name">{project.name}</h1>
          {project.description && <p className="text-sm text-muted-foreground mt-0.5">{project.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge className="capitalize">{project.status}</Badge>
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((m) => (
              <div key={m.id} className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium border-2 border-background" title={m.user_name}>
                {m.user_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setMemberDialogOpen(true)} data-testid="button-add-member">
            <UserPlus className="w-4 h-4 mr-1" /> Anëtar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="board" data-testid="tab-board"><ListTodo className="w-4 h-4 mr-1" /> Tabela</TabsTrigger>
          <TabsTrigger value="milestones" data-testid="tab-milestones"><Target className="w-4 h-4 mr-1" /> Milestones</TabsTrigger>
          <TabsTrigger value="members" data-testid="tab-members"><Users className="w-4 h-4 mr-1" /> Ekipi</TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Tabela e Detyrave</h2>
            <Button size="sm" onClick={() => { setEditTask(null); setTaskForm({ title: "", description: "", stage: "to_do", assignee_id: "", assignee_name: "", priority: "medium", due_date: "", milestone_id: "" }); setTaskDialogOpen(true); }} data-testid="button-add-task">
              <Plus className="w-4 h-4 mr-1" /> Detyrë e Re
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-4 min-h-[400px]">
            {DEFAULT_STAGES.map((stage) => {
              const stageTasks = tasks.filter((t) => t.stage === stage.key);
              return (
                <div
                  key={stage.key}
                  className="bg-muted/50 rounded-xl p-3 flex flex-col"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.key)}
                  data-testid={`column-${stage.key}`}
                >
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-sm font-semibold">{stage.label}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">{stageTasks.length}</Badge>
                  </div>
                  <div className="flex-1 space-y-2 min-h-[100px]">
                    {stageTasks.map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onClick={() => openTaskDetail(task)}
                        className="bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
                        data-testid={`card-task-${task.id}`}
                      >
                        <div className="flex items-start gap-2 mb-1">
                          <Flag className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${getPriorityColor(task.priority)}`} />
                          <span className="text-sm font-medium leading-tight">{task.title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          {task.assignee_name && (
                            <span className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">
                                {task.assignee_name.charAt(0).toUpperCase()}
                              </div>
                              {task.assignee_name.split(" ")[0]}
                            </span>
                          )}
                          {task.due_date && (
                            <span className="flex items-center gap-0.5">
                              <Calendar className="w-3 h-3" /> {moment(task.due_date).format("DD/MM")}
                            </span>
                          )}
                          {Array.isArray(task.checklist) && task.checklist.length > 0 && (
                            <span className="flex items-center gap-0.5">
                              <CheckSquare className="w-3 h-3" />
                              {task.checklist.filter((c) => c.done).length}/{task.checklist.length}
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
        </TabsContent>

        <TabsContent value="milestones">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Milestones</h2>
            <Button size="sm" onClick={() => { setEditMilestone(null); setMilestoneForm({ name: "", description: "", due_date: "", status: "pending" }); setMilestoneDialogOpen(true); }} data-testid="button-add-milestone">
              <Plus className="w-4 h-4 mr-1" /> Milestone e Re
            </Button>
          </div>
          <div className="space-y-3">
            {milestones.map((ms) => (
              <div key={ms.id} className="border rounded-lg p-4 flex items-center gap-4" data-testid={`card-milestone-${ms.id}`}>
                <button onClick={() => toggleMilestone(ms)} className="shrink-0" data-testid={`button-toggle-milestone-${ms.id}`}>
                  {ms.status === "completed" ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-muted-foreground" />
                  )}
                </button>
                <div className="flex-1">
                  <h3 className={`font-medium ${ms.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{ms.name}</h3>
                  {ms.description && <p className="text-sm text-muted-foreground">{ms.description}</p>}
                </div>
                {ms.due_date && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> {moment(ms.due_date).format("DD/MM/YYYY")}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    setEditMilestone(ms);
                    setMilestoneForm({ name: ms.name, description: ms.description || "", due_date: ms.due_date ? ms.due_date.split("T")[0] : "", status: ms.status });
                    setMilestoneDialogOpen(true);
                  }} data-testid={`button-edit-milestone-${ms.id}`}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeleteMilestone(ms.id)} data-testid={`button-delete-milestone-${ms.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {milestones.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Nuk ka milestones</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="members">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Anëtarët e Ekipit</h2>
            <Button size="sm" onClick={() => setMemberDialogOpen(true)} data-testid="button-add-member-tab">
              <UserPlus className="w-4 h-4 mr-1" /> Shto Anëtar
            </Button>
          </div>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="border rounded-lg p-3 flex items-center gap-3" data-testid={`card-member-${m.id}`}>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium">
                  {m.user_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{m.user_name}</p>
                  <p className="text-sm text-muted-foreground">{m.user_email}</p>
                </div>
                <Badge variant="outline" className="capitalize">{m.role}</Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemoveMember(m.id)} data-testid={`button-remove-member-${m.id}`}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {members.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Nuk ka anëtarë</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Create/Edit Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTask ? "Ndrysho Detyrën" : "Detyrë e Re"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Titulli *</Label>
              <Input data-testid="input-task-title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
            </div>
            <div>
              <Label>Përshkrimi</Label>
              <Textarea data-testid="input-task-description" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Faza</Label>
                <Select value={taskForm.stage} onValueChange={(v) => setTaskForm({ ...taskForm, stage: v })}>
                  <SelectTrigger data-testid="select-task-stage"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEFAULT_STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioriteti</Label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                  <SelectTrigger data-testid="select-task-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Caktuar</Label>
                <Select
                  value={taskForm.assignee_id || "none"}
                  onValueChange={(v) => {
                    const u = users.find((u) => u.id === v);
                    setTaskForm({ ...taskForm, assignee_id: v === "none" ? "" : v, assignee_name: u?.full_name || "" });
                  }}
                >
                  <SelectTrigger data-testid="select-task-assignee"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Asnjë</SelectItem>
                    {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Afati</Label>
                <Input data-testid="input-task-due-date" type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
              </div>
            </div>
            {milestones.length > 0 && (
              <div>
                <Label>Milestone</Label>
                <Select value={taskForm.milestone_id || "none"} onValueChange={(v) => setTaskForm({ ...taskForm, milestone_id: v === "none" ? "" : v })}>
                  <SelectTrigger data-testid="select-task-milestone"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Asnjë</SelectItem>
                    {milestones.map((ms) => <SelectItem key={ms.id} value={ms.id}>{ms.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Anulo</Button>
            <Button data-testid="button-save-task" onClick={handleSaveTask} disabled={!taskForm.title}>{editTask ? "Ruaj" : "Krijo"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Milestone Dialog */}
      <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editMilestone ? "Ndrysho Milestone" : "Milestone e Re"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Emri *</Label>
              <Input data-testid="input-milestone-name" value={milestoneForm.name} onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Përshkrimi</Label>
              <Textarea data-testid="input-milestone-description" value={milestoneForm.description} onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Afati</Label>
              <Input data-testid="input-milestone-due-date" type="date" value={milestoneForm.due_date} onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMilestoneDialogOpen(false)}>Anulo</Button>
            <Button data-testid="button-save-milestone" onClick={handleSaveMilestone} disabled={!milestoneForm.name}>{editMilestone ? "Ruaj" : "Krijo"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Shto Anëtar</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Përdoruesi</Label>
              <Select value={memberForm.user_id || "none"} onValueChange={(v) => setMemberForm({ ...memberForm, user_id: v === "none" ? "" : v })}>
                <SelectTrigger data-testid="select-member-user"><SelectValue placeholder="Zgjidh" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Zgjidh</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Roli</Label>
              <Select value={memberForm.role} onValueChange={(v) => setMemberForm({ ...memberForm, role: v })}>
                <SelectTrigger data-testid="select-member-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Anëtar</SelectItem>
                  <SelectItem value="lead">Drejtues</SelectItem>
                  <SelectItem value="viewer">Vëzhgues</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberDialogOpen(false)}>Anulo</Button>
            <Button data-testid="button-save-member" onClick={handleAddMember} disabled={!memberForm.user_id}>Shto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={taskDetailOpen} onOpenChange={setTaskDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <DialogTitle className="text-lg">{selectedTask.title}</DialogTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      setEditTask(selectedTask);
                      setTaskForm({
                        title: selectedTask.title || "",
                        description: selectedTask.description || "",
                        stage: selectedTask.stage || "to_do",
                        assignee_id: selectedTask.assignee_id || "",
                        assignee_name: selectedTask.assignee_name || "",
                        priority: selectedTask.priority || "medium",
                        due_date: selectedTask.due_date ? selectedTask.due_date.split("T")[0] : "",
                        milestone_id: selectedTask.milestone_id || "",
                      });
                      setTaskDetailOpen(false);
                      setTaskDialogOpen(true);
                    }} data-testid="button-edit-task-detail">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeleteTask(selectedTask.id)} data-testid="button-delete-task-detail">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-5 mt-2">
                <div className="flex gap-3 flex-wrap">
                  <Badge className="capitalize">{DEFAULT_STAGES.find((s) => s.key === selectedTask.stage)?.label || selectedTask.stage}</Badge>
                  <Badge variant="outline" className="capitalize">{selectedTask.priority}</Badge>
                  {selectedTask.assignee_name && <Badge variant="secondary">{selectedTask.assignee_name}</Badge>}
                  {selectedTask.due_date && <Badge variant="outline"><Calendar className="w-3 h-3 mr-1" />{moment(selectedTask.due_date).format("DD/MM/YYYY")}</Badge>}
                </div>

                {selectedTask.description && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Përshkrimi</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedTask.description}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><CheckSquare className="w-4 h-4" /> Checklist</h4>
                  <div className="space-y-1.5">
                    {(Array.isArray(selectedTask.checklist) ? selectedTask.checklist : []).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <button onClick={() => toggleChecklistItem(selectedTask, idx)} data-testid={`button-toggle-check-${idx}`}>
                          {item.done ? <CheckSquare className="w-4 h-4 text-green-500" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        <span className={`text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input
                      data-testid="input-new-check-item"
                      placeholder="Shto element..."
                      value={newCheckItem}
                      onChange={(e) => setNewCheckItem(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
                      className="h-8 text-sm"
                    />
                    <Button size="sm" variant="outline" onClick={addChecklistItem} data-testid="button-add-check-item">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><MessageSquare className="w-4 h-4" /> Komente</h4>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto mb-3">
                    {comments.map((c) => (
                      <div key={c.id} className="border rounded-lg p-3" data-testid={`card-comment-${c.id}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{c.user_name}</span>
                          <span className="text-xs text-muted-foreground">{moment(c.created_at).format("DD/MM/YY HH:mm")}</span>
                        </div>
                        <p className="text-sm">{c.content}</p>
                      </div>
                    ))}
                    {comments.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka komente</p>}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      data-testid="input-new-comment"
                      placeholder="Shkruaj një koment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                    />
                    <Button onClick={handleAddComment} disabled={!newComment.trim()} data-testid="button-add-comment">Dërgo</Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
