import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Trash2, MoreHorizontal, Archive, RotateCcw, Upload, Download, FolderOpen } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'policy', label: 'Politikë' },
  { value: 'rule', label: 'Rregullore' },
  { value: 'procedure', label: 'Procedurë' },
  { value: 'contract', label: 'Kontratë' },
  { value: 'certificate', label: 'Certifikatë' },
  { value: 'other', label: 'Tjetër' },
];

const emptyForm = () => ({
  title: '', category: 'other', description: '', file_url: '', file_name: '',
});

export default function CompanyDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const d = await base44.entities.CompanyDocument.list('-created_at', 500);
    setDocuments(d);
    setLoading(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setForm(p => ({ ...p, file_url: result.file_url, file_name: file.name }));
      toast.success('Skedari u ngarkua');
    } catch (err) {
      toast.error('Gabim gjatë ngarkimit');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('Titulli është i detyrueshëm'); return; }
    setSubmitting(true);
    const data = {
      ...form,
      status: 'active',
      uploaded_by: user?.id,
      uploaded_by_name: user?.full_name || user?.email,
    };
    await base44.entities.CompanyDocument.create(data);
    toast.success('Dokumenti u shtua');
    setDialogOpen(false);
    setForm(emptyForm());
    setSubmitting(false);
    loadData();
  };

  const handleArchive = async (d) => {
    await base44.entities.CompanyDocument.update(d.id, { status: 'archived' });
    toast.success('Dokumenti u arkivua');
    loadData();
  };

  const handleRestore = async (d) => {
    await base44.entities.CompanyDocument.update(d.id, { status: 'active' });
    toast.success('Dokumenti u rikthye');
    loadData();
  };

  const handleDelete = async (d) => {
    if (!window.confirm(`Fshi dokumentin "${d.title}"?`)) return;
    await base44.entities.CompanyDocument.delete(d.id);
    toast.success('Dokumenti u fshi');
    loadData();
  };

  const filtered = documents.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
    return true;
  });

  const categoryLabel = (cat) => CATEGORIES.find(c => c.value === cat)?.label || cat;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxho</p>
            <h1 className="text-4xl font-bold tracking-tight" data-testid="text-page-title">Dokumentet e Kompanisë</h1>
          </div>
          <p className="text-sm text-muted-foreground pt-1">{new Date().toLocaleDateString('sq-AL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button onClick={() => { setForm(emptyForm()); setDialogOpen(true); }} className="gap-2 rounded-xl" data-testid="button-new-document">
            <Plus className="w-4 h-4" /> Dokument i Ri
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej</p>
          <p className="text-2xl font-bold mt-1" data-testid="text-total-documents">{documents.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Dokumente</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Aktive</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{documents.filter(d => d.status === 'active').length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Dokumente</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Arkivuara</p>
          <p className="text-2xl font-bold mt-1 text-slate-500">{documents.filter(d => d.status === 'archived').length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Dokumente</p>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap items-center">
        <div className="flex gap-2">
          {['active', 'archived', 'all'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              data-testid={`button-filter-status-${s}`}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all",
                statusFilter === s ? "bg-primary/10 border-primary text-primary" : "border-border bg-white hover:border-primary/30"
              )}>
              {s === 'all' ? 'Të Gjitha' : s === 'active' ? 'Aktive' : 'Arkivuara'}
            </button>
          ))}
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
            <SelectValue placeholder="Kategoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha kategoritë</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nuk ka dokumente</p>
          </div>
        )}
        {filtered.map(d => (
          <div key={d.id} className="bg-white rounded-xl border border-border/60 shadow-sm p-5 flex items-center justify-between gap-4" data-testid={`card-document-${d.id}`}>
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                d.status === 'archived' ? 'bg-slate-100' : 'bg-primary/10'
              )}>
                <FileText className={cn("w-5 h-5", d.status === 'archived' ? 'text-slate-400' : 'text-primary')} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" data-testid={`text-document-title-${d.id}`}>{d.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{categoryLabel(d.category)}</span>
                  <span className="text-xs text-muted-foreground">v{d.version || 1}</span>
                  {d.file_name && <span className="text-xs text-muted-foreground truncate">{d.file_name}</span>}
                </div>
                {d.description && <p className="text-xs text-muted-foreground mt-1 truncate">{d.description}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {d.uploaded_by_name && `Ngarkuar nga: ${d.uploaded_by_name} • `}
                  {d.created_at && new Date(d.created_at).toLocaleDateString('sq-AL')}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-actions-${d.id}`}><MoreHorizontal className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {d.file_url && (
                  <DropdownMenuItem onClick={() => window.open(d.file_url, '_blank')}><Download className="w-4 h-4 mr-2" /> Shkarko</DropdownMenuItem>
                )}
                {d.status === 'active' && (
                  <DropdownMenuItem onClick={() => handleArchive(d)}><Archive className="w-4 h-4 mr-2" /> Arkivo</DropdownMenuItem>
                )}
                {d.status === 'archived' && (
                  <DropdownMenuItem onClick={() => handleRestore(d)}><RotateCcw className="w-4 h-4 mr-2" /> Rikthe</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDelete(d)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Fshi</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) { setDialogOpen(false); setForm(emptyForm()); } else setDialogOpen(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dokument i Ri</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titulli *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} data-testid="input-document-title" />
            </div>
            <div>
              <Label>Kategoria</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger data-testid="select-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Përshkrimi</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} data-testid="input-description" />
            </div>
            <div>
              <Label>Skedari</Label>
              <div className="mt-1">
                <label className={cn("flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:border-primary/50",
                  form.file_url ? "border-green-300 bg-green-50" : "border-border"
                )}>
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {uploading ? 'Duke ngarkuar...' : form.file_name || 'Zgjidh skedarin'}
                  </span>
                  <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} data-testid="input-file-upload" />
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setForm(emptyForm()); }}>Anulo</Button>
            <Button onClick={handleSave} disabled={submitting} data-testid="button-save-document">
              {submitting ? 'Duke ruajtur...' : 'Ruaj Dokumentin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
