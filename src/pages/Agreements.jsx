import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Trash2, Pencil, MoreHorizontal, AlertTriangle, Download, Paperclip, X, CheckCircle, DollarSign } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

const emptyForm = () => ({
  title: '', client_name: '', description: '', start_date: '', end_date: '',
  renewal_date: '', value: 0, status: 'active', terms: '', payment_terms: '',
  auto_renew: false, notes: '',
});

const emptyAnnex = () => ({ title: '', description: '', annex_date: new Date().toISOString().split('T')[0] });

const statusColors = {
  active: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
  terminated: 'bg-slate-100 text-slate-700',
  draft: 'bg-amber-100 text-amber-700',
};

const statusLabels = {
  active: 'Aktiv',
  expired: 'Skaduar',
  terminated: 'Përfunduar',
  draft: 'Draft',
};

export default function Agreements() {
  const { user } = useAuth();
  const [agreements, setAgreements] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAgreement, setEditAgreement] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [annexDialog, setAnnexDialog] = useState(null);
  const [annexes, setAnnexes] = useState([]);
  const [annexForm, setAnnexForm] = useState(emptyAnnex());
  const [showAnnexForm, setShowAnnexForm] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [a, c] = await Promise.all([
      base44.entities.Agreement.list('-created_at', 200),
      base44.entities.Client.list('name', 500),
    ]);
    const now = new Date();
    const updated = [];
    for (const ag of a) {
      if (ag.status === 'active' && ag.end_date && new Date(ag.end_date) < now) {
        await base44.entities.Agreement.update(ag.id, { status: 'expired' });
        updated.push({ ...ag, status: 'expired' });
      } else {
        updated.push(ag);
      }
    }
    setAgreements(updated);
    setClients(c);
    setLoading(false);
  };

  const fillClient = (clientId) => {
    const c = clients.find(cl => cl.id === clientId);
    if (c) setForm(prev => ({ ...prev, client_name: c.name, client_id: c.id }));
  };

  const handleSave = async () => {
    if (!form.title || !form.client_name) { toast.error('Titulli dhe klienti janë të detyrueshme'); return; }
    setSubmitting(true);
    const data = { ...form, value: parseFloat(form.value) || 0 };
    if (editAgreement) {
      await base44.entities.Agreement.update(editAgreement.id, data);
      toast.success('Marrëveshja u përditësua');
    } else {
      data.agreement_number = `AGR-${Date.now().toString(36).toUpperCase()}`;
      data.created_by = user?.id;
      await base44.entities.Agreement.create(data);
      toast.success('Marrëveshja u krijua');
    }
    setDialogOpen(false);
    setEditAgreement(null);
    setForm(emptyForm());
    setSubmitting(false);
    loadData();
  };

  const openEdit = (a) => {
    setEditAgreement(a);
    setForm({
      title: a.title || '', client_name: a.client_name || '', description: a.description || '',
      start_date: a.start_date || '', end_date: a.end_date || '', renewal_date: a.renewal_date || '',
      value: a.value || 0, status: a.status || 'active', terms: a.terms || '',
      payment_terms: a.payment_terms || '', auto_renew: a.auto_renew || false, notes: a.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (a) => {
    if (!window.confirm(`Fshi marrëveshjen ${a.agreement_number}?`)) return;
    await base44.entities.Agreement.delete(a.id);
    toast.success('Marrëveshja u fshi');
    loadData();
  };

  const handleStatusChange = async (a, newStatus) => {
    await base44.entities.Agreement.update(a.id, { status: newStatus });
    toast.success(`Statusi ndryshoi në ${statusLabels[newStatus]}`);
    loadData();
  };

  const openAnnexes = async (a) => {
    setAnnexDialog(a);
    const ax = await base44.entities.AgreementAnnex.filter({ agreement_id: a.id });
    setAnnexes(ax);
    setShowAnnexForm(false);
    setAnnexForm(emptyAnnex());
  };

  const handleSaveAnnex = async () => {
    if (!annexForm.title) { toast.error('Titulli i aneksit është i detyrueshëm'); return; }
    const data = {
      ...annexForm,
      agreement_id: annexDialog.id,
      annex_number: `ANX-${Date.now().toString(36).toUpperCase()}`,
    };
    await base44.entities.AgreementAnnex.create(data);
    toast.success('Aneksi u shtua');
    const ax = await base44.entities.AgreementAnnex.filter({ agreement_id: annexDialog.id });
    setAnnexes(ax);
    setShowAnnexForm(false);
    setAnnexForm(emptyAnnex());
  };

  const handleDeleteAnnex = async (ax) => {
    await base44.entities.AgreementAnnex.delete(ax.id);
    toast.success('Aneksi u fshi');
    const updated = await base44.entities.AgreementAnnex.filter({ agreement_id: annexDialog.id });
    setAnnexes(updated);
  };

  const generatePDF = (a) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('MARRËVESHJE', 20, 22);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nr: ${a.agreement_number}`, 150, 22);

    let y = 48;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(a.title || '', 20, y); y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Klienti: ${a.client_name || ''}`, 20, y); y += 6;
    if (a.start_date) { doc.text(`Data e Fillimit: ${new Date(a.start_date).toLocaleDateString('sq-AL')}`, 20, y); y += 6; }
    if (a.end_date) { doc.text(`Data e Mbarimit: ${new Date(a.end_date).toLocaleDateString('sq-AL')}`, 20, y); y += 6; }
    if (a.value) { doc.text(`Vlera: €${parseFloat(a.value).toFixed(2)}`, 20, y); y += 6; }
    doc.text(`Statusi: ${statusLabels[a.status] || a.status}`, 20, y); y += 10;

    if (a.description) {
      doc.setFont('helvetica', 'bold');
      doc.text('Përshkrimi:', 20, y); y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(a.description, 170);
      doc.text(lines, 20, y); y += lines.length * 4 + 5;
    }

    if (a.terms) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Kushtet:', 20, y); y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(a.terms, 170);
      doc.text(lines, 20, y); y += lines.length * 4 + 5;
    }

    if (a.payment_terms) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Kushtet e Pagesës:', 20, y); y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(a.payment_terms, 170);
      doc.text(lines, 20, y);
    }

    doc.save(`${a.agreement_number}.pdf`);
  };

  const filtered = agreements.filter(a => statusFilter === 'all' || a.status === statusFilter);
  const renewalAlerts = agreements.filter(a => {
    if (a.status !== 'active' || !a.renewal_date) return false;
    const days = Math.ceil((new Date(a.renewal_date) - new Date()) / (1000 * 60 * 60 * 24));
    return days <= 30 && days >= 0;
  });

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
            <h1 className="text-4xl font-bold tracking-tight" data-testid="text-page-title">Marrëveshjet</h1>
          </div>
          <p className="text-sm text-muted-foreground pt-1">{new Date().toLocaleDateString('sq-AL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button onClick={() => { setForm(emptyForm()); setEditAgreement(null); setDialogOpen(true); }} className="gap-2 rounded-xl" data-testid="button-new-agreement">
            <Plus className="w-4 h-4" /> Marrëveshje e Re
          </Button>
        </div>
      </div>

      {renewalAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <p className="font-semibold text-sm text-amber-700">Marrëveshje për Rinovim</p>
          </div>
          {renewalAlerts.map(a => {
            const days = Math.ceil((new Date(a.renewal_date) - new Date()) / (1000 * 60 * 60 * 24));
            return (
              <p key={a.id} className="text-xs text-amber-600" data-testid={`text-renewal-alert-${a.id}`}>
                {a.title} ({a.client_name}) — Rinovimi në {days} ditë ({new Date(a.renewal_date).toLocaleDateString('sq-AL')})
              </p>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-indigo-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-indigo-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej</p></div>
            <p className="text-2xl font-bold" data-testid="text-total-agreements">{agreements.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Marrëveshje</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-emerald-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-emerald-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Aktive</p></div>
            <p className="text-2xl font-bold text-emerald-600">{agreements.filter(a => a.status === 'active').length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Marrëveshje</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-violet-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-violet-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vlera Totale</p></div>
            <p className="text-2xl font-bold text-primary">€{agreements.reduce((s, a) => s + parseFloat(a.value || 0), 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Kontrata aktive</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'active', 'expired', 'terminated', 'draft'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            data-testid={`button-filter-${s}`}
            className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all",
              statusFilter === s ? "bg-primary/10 border-primary text-primary" : "border-border bg-white hover:border-primary/30"
            )}>
            {s === 'all' ? 'Të Gjitha' : statusLabels[s]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nuk ka marrëveshje</p>
          </div>
        )}
        {filtered.map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-border/60 shadow-sm p-5 flex items-center justify-between gap-4" data-testid={`card-agreement-${a.id}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="font-bold text-sm">{a.agreement_number}</span>
                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", statusColors[a.status] || 'bg-slate-100')}>
                  {statusLabels[a.status] || a.status}
                </span>
              </div>
              <p className="text-sm font-medium truncate" data-testid={`text-agreement-title-${a.id}`}>{a.title}</p>
              <p className="text-xs text-muted-foreground">{a.client_name} • €{parseFloat(a.value || 0).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">
                {a.start_date && `Fillimi: ${new Date(a.start_date).toLocaleDateString('sq-AL')}`}
                {a.end_date && ` • Mbarimi: ${new Date(a.end_date).toLocaleDateString('sq-AL')}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => openAnnexes(a)} data-testid={`button-annexes-${a.id}`}>
                <Paperclip className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid={`button-actions-${a.id}`}><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(a)}><Pencil className="w-4 h-4 mr-2" /> Ndrysho</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => generatePDF(a)}><Download className="w-4 h-4 mr-2" /> Shkarko PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openAnnexes(a)}><Paperclip className="w-4 h-4 mr-2" /> Anekset</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {a.status === 'active' && <DropdownMenuItem onClick={() => handleStatusChange(a, 'terminated')}>Përfundo</DropdownMenuItem>}
                  {a.status === 'draft' && <DropdownMenuItem onClick={() => handleStatusChange(a, 'active')}>Aktivizo</DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleDelete(a)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Fshi</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) { setDialogOpen(false); setEditAgreement(null); setForm(emptyForm()); } else setDialogOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editAgreement ? 'Ndrysho Marrëveshjen' : 'Marrëveshje e Re'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titulli *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} data-testid="input-agreement-title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Klienti *</Label>
                <Select onValueChange={fillClient}>
                  <SelectTrigger data-testid="select-client"><SelectValue placeholder="Zgjidh klientin" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Emri i Klientit *</Label>
                <Input value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} data-testid="input-client-name" />
              </div>
            </div>
            <div>
              <Label>Përshkrimi</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} data-testid="input-description" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Data e Fillimit</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} data-testid="input-start-date" />
              </div>
              <div>
                <Label>Data e Mbarimit</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} data-testid="input-end-date" />
              </div>
              <div>
                <Label>Data e Rinovimit</Label>
                <Input type="date" value={form.renewal_date} onChange={e => setForm(p => ({ ...p, renewal_date: e.target.value }))} data-testid="input-renewal-date" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vlera (€)</Label>
                <Input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} data-testid="input-value" />
              </div>
              <div>
                <Label>Statusi</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="expired">Skaduar</SelectItem>
                    <SelectItem value="terminated">Përfunduar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Kushtet</Label>
              <Textarea value={form.terms} onChange={e => setForm(p => ({ ...p, terms: e.target.value }))} rows={3} data-testid="input-terms" />
            </div>
            <div>
              <Label>Kushtet e Pagesës</Label>
              <Textarea value={form.payment_terms} onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))} rows={2} data-testid="input-payment-terms" />
            </div>
            <div>
              <Label>Shënime</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} data-testid="input-notes" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.auto_renew} onChange={e => setForm(p => ({ ...p, auto_renew: e.target.checked }))} id="auto_renew" data-testid="checkbox-auto-renew" />
              <label htmlFor="auto_renew" className="text-sm">Rinovim automatik</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditAgreement(null); setForm(emptyForm()); }}>Anulo</Button>
            <Button onClick={handleSave} disabled={submitting} data-testid="button-save-agreement">
              {submitting ? 'Duke ruajtur...' : (editAgreement ? 'Ruaj Ndryshimet' : 'Krijo')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!annexDialog} onOpenChange={(v) => { if (!v) setAnnexDialog(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Anekset — {annexDialog?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {annexes.length === 0 && !showAnnexForm && (
              <p className="text-sm text-muted-foreground text-center py-4">Nuk ka anekse</p>
            )}
            {annexes.map(ax => (
              <div key={ax.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`card-annex-${ax.id}`}>
                <div>
                  <p className="text-sm font-medium">{ax.title}</p>
                  <p className="text-xs text-muted-foreground">{ax.annex_number} • {ax.annex_date && new Date(ax.annex_date).toLocaleDateString('sq-AL')}</p>
                  {ax.description && <p className="text-xs text-muted-foreground mt-1">{ax.description}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteAnnex(ax)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
            {showAnnexForm ? (
              <div className="space-y-3 border-t pt-3">
                <div>
                  <Label>Titulli *</Label>
                  <Input value={annexForm.title} onChange={e => setAnnexForm(p => ({ ...p, title: e.target.value }))} data-testid="input-annex-title" />
                </div>
                <div>
                  <Label>Përshkrimi</Label>
                  <Textarea value={annexForm.description} onChange={e => setAnnexForm(p => ({ ...p, description: e.target.value }))} rows={2} />
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={annexForm.annex_date} onChange={e => setAnnexForm(p => ({ ...p, annex_date: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveAnnex} data-testid="button-save-annex">Ruaj Aneksin</Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowAnnexForm(false); setAnnexForm(emptyAnnex()); }}>Anulo</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setShowAnnexForm(true)} className="w-full gap-2" data-testid="button-add-annex">
                <Plus className="w-4 h-4" /> Shto Aneks
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
