import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Pin, PinOff, Pencil, Trash2, Megaphone, Eye, MessageSquare, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const emptyForm = () => ({
  title: "",
  content: "",
  priority: "normal",
});

export default function Announcements() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAnnouncement, setEditAnnouncement] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [viewAnnouncement, setViewAnnouncement] = useState(null);

  useEffect(() => { if (tenantId) loadData(); }, [tenantId]);

  const loadData = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const data = await base44.entities.Announcement.filter({ tenant_id: tenantId }, "-created_date", 200);
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error("Titulli është i detyrueshëm"); return; }
    setSubmitting(true);
    try {
      if (editAnnouncement) {
        await base44.entities.Announcement.update(editAnnouncement.id, form);
        toast.success("Njoftimi u përditësua");
      } else {
        await base44.entities.Announcement.create({
          ...form,
          tenant_id: tenantId,
          created_by: user?.id,
          read_by: [],
        });
        toast.success("Njoftimi u krijua");
      }
      setDialogOpen(false);
      setForm(emptyForm());
      setEditAnnouncement(null);
      loadData();
    } catch (err) {
      toast.error("Gabim");
    }
    setSubmitting(false);
  };

  const handleDelete = async (a) => {
    if (!window.confirm("Fshi këtë njoftim?")) return;
    await base44.entities.Announcement.delete(a.id);
    toast.success("Njoftimi u fshi");
    loadData();
  };

  const handleTogglePin = async (a) => {
    await base44.entities.Announcement.update(a.id, { is_pinned: !a.is_pinned });
    loadData();
  };

  const handleMarkRead = async (a) => {
    const readBy = Array.isArray(a.read_by) ? a.read_by : [];
    if (!readBy.includes(user?.id)) {
      await base44.entities.Announcement.update(a.id, { read_by: [...readBy, user?.id] });
      loadData();
    }
  };

  const openEdit = (a) => {
    setForm({ title: a.title || "", content: a.content || "", priority: a.priority || "normal" });
    setEditAnnouncement(a);
    setDialogOpen(true);
  };

  const openView = (a) => {
    setViewAnnouncement(a);
    handleMarkRead(a);
  };

  const isRead = (a) => {
    const readBy = Array.isArray(a.read_by) ? a.read_by : [];
    return readBy.includes(user?.id);
  };

  const sorted = [...announcements].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return 0;
  });

  const unreadCount = announcements.filter(a => !isRead(a)).length;

  const priorityBadge = (priority) => {
    const styles = {
      low: "bg-slate-100 text-slate-600",
      normal: "bg-blue-100 text-blue-700",
      high: "bg-amber-100 text-amber-700",
      urgent: "bg-red-100 text-red-700",
    };
    const labels = { low: "Ulët", normal: "Normal", high: "Lartë", urgent: "Urgjent" };
    return (
      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", styles[priority] || styles.normal)}>
        {labels[priority] || priority}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Komunikimi</p>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Njoftimet</h1>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setEditAnnouncement(null); setDialogOpen(true); }} className="gap-2" data-testid="button-add-announcement">
          <Plus className="w-4 h-4" /> Njoftim i Ri
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-indigo-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><MessageSquare className="w-4 h-4 text-indigo-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej</p></div>
            <p className="text-2xl font-bold" data-testid="text-total-announcements">{announcements.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-amber-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><Megaphone className="w-4 h-4 text-amber-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Të Palexuara</p></div>
            <p className="text-2xl font-bold text-amber-600" data-testid="text-unread-count">{unreadCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-violet-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><Bell className="w-4 h-4 text-violet-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pinned</p></div>
            <p className="text-2xl font-bold text-primary">{announcements.filter(a => a.is_pinned).length}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-16 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <Megaphone className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Nuk ka njoftime</p>
          </div>
        ) : (
          sorted.map(a => (
            <div
              key={a.id}
              className={cn(
                "bg-white rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md cursor-pointer",
                !isRead(a) ? "border-primary/30 bg-primary/[0.02]" : "border-border/60",
                a.is_pinned && "ring-1 ring-primary/20"
              )}
              onClick={() => openView(a)}
              data-testid={`card-announcement-${a.id}`}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  !isRead(a) ? "bg-primary/10" : "bg-muted"
                )}>
                  <Megaphone className={cn("w-5 h-5", !isRead(a) ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={cn("text-sm font-bold", !isRead(a) && "text-primary")}>{a.title}</h3>
                    {a.is_pinned && <Pin className="w-3.5 h-3.5 text-primary" />}
                    {priorityBadge(a.priority)}
                    {!isRead(a) && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {moment(a.created_date || a.created_at).format("DD MMM YYYY, HH:mm")}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleTogglePin(a)} className="p-1.5 hover:bg-muted rounded-lg" data-testid={`button-pin-announcement-${a.id}`}>
                    {a.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-muted rounded-lg">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(a)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editAnnouncement ? "Modifiko Njoftimin" : "Njoftim i Ri"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Titulli *</Label>
              <Input placeholder="Titulli i njoftimit" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5" data-testid="input-announcement-title" />
            </div>
            <div>
              <Label>Përmbajtja</Label>
              <Textarea placeholder="Shkruaj njoftimin..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="mt-1.5" rows={4} data-testid="input-announcement-content" />
            </div>
            <div>
              <Label>Prioriteti</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Ulët</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Lartë</SelectItem>
                  <SelectItem value="urgent">Urgjent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSave} disabled={submitting} data-testid="button-save-announcement">
              {submitting ? "Duke ruajtur..." : (editAnnouncement ? "Përditëso" : "Shto")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {viewAnnouncement && (
        <Dialog open={!!viewAnnouncement} onOpenChange={() => setViewAnnouncement(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{viewAnnouncement.title}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-2">
                {priorityBadge(viewAnnouncement.priority)}
                <span className="text-xs text-muted-foreground">
                  {moment(viewAnnouncement.created_date || viewAnnouncement.created_at).format("DD MMM YYYY, HH:mm")}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{viewAnnouncement.content}</p>
              <div className="pt-2 border-t">
                <p className="text-[10px] text-muted-foreground">
                  Lexuar nga {(Array.isArray(viewAnnouncement.read_by) ? viewAnnouncement.read_by : []).length} përdorues
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
