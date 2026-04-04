import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Pin, PinOff, Pencil, Trash2, StickyNote, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const COLORS = [
  { value: "default", label: "Default", bg: "bg-white", border: "border-border/60" },
  { value: "yellow", label: "E verdhë", bg: "bg-yellow-50", border: "border-yellow-200" },
  { value: "blue", label: "Blu", bg: "bg-blue-50", border: "border-blue-200" },
  { value: "green", label: "Jeshile", bg: "bg-emerald-50", border: "border-emerald-200" },
  { value: "pink", label: "Rozë", bg: "bg-pink-50", border: "border-pink-200" },
  { value: "purple", label: "Vjollcë", bg: "bg-purple-50", border: "border-purple-200" },
];

const emptyForm = () => ({
  title: "",
  content: "",
  color: "default",
  entity_type: "",
  entity_id: "",
});

export default function Notes({ entityType, entityId, embedded = false }) {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { if (tenantId) loadNotes(); }, [tenantId]);

  const loadNotes = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const filters = { tenant_id: tenantId };
      if (entityType) filters.entity_type = entityType;
      if (entityId) filters.entity_id = entityId;
      const data = await base44.entities.Note.filter(filters, "-created_date", 500);
      setNotes(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error("Titulli është i detyrueshëm"); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        tenant_id: tenantId,
        created_by: user?.id,
        entity_type: entityType || form.entity_type || null,
        entity_id: entityId || form.entity_id || null,
      };
      if (editNote) {
        await base44.entities.Note.update(editNote.id, payload);
        toast.success("Shënimi u përditësua");
      } else {
        await base44.entities.Note.create(payload);
        toast.success("Shënimi u krijua");
      }
      setDialogOpen(false);
      setForm(emptyForm());
      setEditNote(null);
      loadNotes();
    } catch (err) {
      toast.error("Gabim");
    }
    setSubmitting(false);
  };

  const handleDelete = async (note) => {
    if (!window.confirm("Fshi këtë shënim?")) return;
    await base44.entities.Note.delete(note.id);
    toast.success("Shënimi u fshi");
    loadNotes();
  };

  const handleTogglePin = async (note) => {
    await base44.entities.Note.update(note.id, { is_pinned: !note.is_pinned });
    loadNotes();
  };

  const openEdit = (note) => {
    setForm({
      title: note.title || "",
      content: note.content || "",
      color: note.color || "default",
      entity_type: note.entity_type || "",
      entity_id: note.entity_id || "",
    });
    setEditNote(note);
    setDialogOpen(true);
  };

  const getColorClass = (color) => {
    const c = COLORS.find(cl => cl.value === color);
    return c ? { bg: c.bg, border: c.border } : { bg: "bg-white", border: "border-border/60" };
  };

  const filtered = notes
    .filter(n => n.title?.toLowerCase().includes(searchTerm.toLowerCase()) || n.content?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return 0;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const content = (
    <>
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Kërko shënime..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-notes"
          />
        </div>
        <Button onClick={() => { setForm(emptyForm()); setEditNote(null); setDialogOpen(true); }} className="gap-2" data-testid="button-add-note">
          <Plus className="w-4 h-4" /> Shënim i Ri
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <StickyNote className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Nuk ka shënime</p>
          </div>
        ) : (
          filtered.map(note => {
            const colors = getColorClass(note.color);
            return (
              <div
                key={note.id}
                className={cn("rounded-2xl border shadow-sm p-5 relative group transition-shadow hover:shadow-md", colors.bg, colors.border)}
                data-testid={`card-note-${note.id}`}
              >
                {note.is_pinned && (
                  <Pin className="w-3.5 h-3.5 text-primary absolute top-3 right-3" />
                )}
                <h3 className="text-sm font-bold mb-1 pr-6">{note.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                  <span className="text-[10px] text-muted-foreground">
                    {moment(note.created_date || note.created_at).format("DD MMM YYYY")}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleTogglePin(note)} className="p-1 hover:bg-muted rounded" data-testid={`button-pin-${note.id}`}>
                      {note.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => openEdit(note)} className="p-1 hover:bg-muted rounded">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(note)} className="p-1 hover:bg-destructive/10 rounded text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editNote ? "Modifiko Shënimin" : "Shënim i Ri"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Titulli *</Label>
              <Input placeholder="Titulli" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5" data-testid="input-note-title" />
            </div>
            <div>
              <Label>Përmbajtja</Label>
              <Textarea placeholder="Shkruaj shënimin..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="mt-1.5" rows={4} data-testid="input-note-content" />
            </div>
            <div>
              <Label>Ngjyra</Label>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setForm({ ...form, color: c.value })}
                    className={cn(
                      "w-8 h-8 rounded-lg border-2 transition-all",
                      c.bg,
                      form.color === c.value ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                    )}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSave} disabled={submitting} data-testid="button-save-note">
              {submitting ? "Duke ruajtur..." : (editNote ? "Përditëso" : "Shto")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">CRM</p>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Shënimet</h1>
      </div>
      {content}
    </div>
  );
}
