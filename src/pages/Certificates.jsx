import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Award, Trash2, Pencil, MoreHorizontal, Download, Send, Mail } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

const emptyForm = () => ({
  title: '', client_name: '', client_email: '', description: '',
  issue_date: new Date().toISOString().split('T')[0], expiry_date: '',
  template: 'standard', notes: '',
});

const statusColors = {
  active: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
  revoked: 'bg-slate-100 text-slate-700',
};

const statusLabels = {
  active: 'Aktiv',
  expired: 'Skaduar',
  revoked: 'Revokuar',
};

export default function Certificates() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCertificate, setEditCertificate] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [c, cl] = await Promise.all([
      base44.entities.Certificate.list('-created_at', 200),
      base44.entities.Client.list('name', 500),
    ]);
    setCertificates(c);
    setClients(cl);
    setLoading(false);
  };

  const fillClient = (clientId) => {
    const c = clients.find(cl => cl.id === clientId);
    if (c) setForm(prev => ({ ...prev, client_name: c.name, client_email: c.email || '' }));
  };

  const handleSave = async () => {
    if (!form.title || !form.client_name) { toast.error('Titulli dhe klienti janë të detyrueshme'); return; }
    setSubmitting(true);
    const data = { ...form };
    if (editCertificate) {
      await base44.entities.Certificate.update(editCertificate.id, data);
      toast.success('Certifikata u përditësua');
    } else {
      data.certificate_number = `CERT-${Date.now().toString(36).toUpperCase()}`;
      data.status = 'active';
      data.created_by = user?.id;
      await base44.entities.Certificate.create(data);
      toast.success('Certifikata u krijua');
    }
    setDialogOpen(false);
    setEditCertificate(null);
    setForm(emptyForm());
    setSubmitting(false);
    loadData();
  };

  const openEdit = (c) => {
    setEditCertificate(c);
    setForm({
      title: c.title || '', client_name: c.client_name || '', client_email: c.client_email || '',
      description: c.description || '', issue_date: c.issue_date || '',
      expiry_date: c.expiry_date || '', template: c.template || 'standard', notes: c.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Fshi certifikatën ${c.certificate_number}?`)) return;
    await base44.entities.Certificate.delete(c.id);
    toast.success('Certifikata u fshi');
    loadData();
  };

  const handleStatusChange = async (c, newStatus) => {
    await base44.entities.Certificate.update(c.id, { status: newStatus });
    toast.success(`Statusi ndryshoi në ${statusLabels[newStatus]}`);
    loadData();
  };

  const generatePDF = (c) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = 297;
    const H = 210;

    doc.setFillColor(67, 56, 202);
    doc.rect(0, 0, W, H, 'F');

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, 15, W - 30, H - 30, 5, 5, 'F');

    doc.setDrawColor(67, 56, 202);
    doc.setLineWidth(2);
    doc.roundedRect(20, 20, W - 40, H - 40, 3, 3, 'S');
    doc.setLineWidth(0.5);
    doc.roundedRect(25, 25, W - 50, H - 50, 2, 2, 'S');

    doc.setTextColor(67, 56, 202);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.text('CERTIFIKATË', W / 2, 55, { align: 'center' });

    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Nr: ${c.certificate_number}`, W / 2, 65, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('Kjo certifikatë i lëshohet:', W / 2, 82, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(30, 41, 59);
    doc.text(c.client_name || '', W / 2, 95, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    if (c.title) {
      doc.text('për', W / 2, 108, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(c.title, W / 2, 118, { align: 'center' });
    }

    if (c.description) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(c.description, 200);
      doc.text(lines, W / 2, 130, { align: 'center' });
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);

    const dateY = 160;
    if (c.issue_date) {
      doc.text(`Lëshuar: ${new Date(c.issue_date).toLocaleDateString('sq-AL')}`, 60, dateY);
    }
    if (c.expiry_date) {
      doc.text(`Skadon: ${new Date(c.expiry_date).toLocaleDateString('sq-AL')}`, W - 60, dateY, { align: 'right' });
    }

    doc.setDrawColor(67, 56, 202);
    doc.setLineWidth(0.5);
    doc.line(W / 2 - 40, 172, W / 2 + 40, 172);
    doc.setFontSize(9);
    doc.text('Nënshkrimi', W / 2, 178, { align: 'center' });

    doc.save(`${c.certificate_number}.pdf`);
  };

  const handleSendEmail = async (c) => {
    if (!c.client_email) { toast.error('Klienti nuk ka email'); return; }
    await base44.integrations.Core.SendEmail({
      to: c.client_email,
      subject: `Certifikata ${c.certificate_number} — ${c.title}`,
      body: `<p>Përshëndetje ${c.client_name},</p><p>Certifikata juaj <b>${c.certificate_number}</b> për <b>${c.title}</b> është gati.</p><p>Data e lëshimit: ${c.issue_date ? new Date(c.issue_date).toLocaleDateString('sq-AL') : 'N/A'}</p>${c.expiry_date ? `<p>Data e skadimit: ${new Date(c.expiry_date).toLocaleDateString('sq-AL')}</p>` : ''}<p>Faleminderit!</p>`,
    });
    await base44.entities.Certificate.update(c.id, { sent_at: new Date().toISOString() });
    toast.success('Email-i u dërgua');
    loadData();
  };

  const filtered = certificates.filter(c => statusFilter === 'all' || c.status === statusFilter);

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
            <h1 className="text-4xl font-bold tracking-tight" data-testid="text-page-title">Certifikatat</h1>
          </div>
          <p className="text-sm text-muted-foreground pt-1">{new Date().toLocaleDateString('sq-AL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button onClick={() => { setForm(emptyForm()); setEditCertificate(null); setDialogOpen(true); }} className="gap-2 rounded-xl" data-testid="button-new-certificate">
            <Plus className="w-4 h-4" /> Certifikatë e Re
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-indigo-500" />
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej</p>
            <p className="text-2xl font-bold mt-1" data-testid="text-total-certificates">{certificates.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Certifikata</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-emerald-500" />
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Aktive</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{certificates.filter(c => c.status === 'active').length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Certifikata</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-blue-500" />
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dërguar</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{certificates.filter(c => c.sent_at).length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Me email</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'active', 'expired', 'revoked'].map(s => (
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
            <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nuk ka certifikata</p>
          </div>
        )}
        {filtered.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-border/60 shadow-sm p-5 flex items-center justify-between gap-4" data-testid={`card-certificate-${c.id}`}>
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-0.5">
                  <span className="font-bold text-sm">{c.certificate_number}</span>
                  <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", statusColors[c.status] || 'bg-slate-100')}>
                    {statusLabels[c.status] || c.status}
                  </span>
                  {c.sent_at && <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full"><Mail className="w-3 h-3 inline mr-1" />Dërguar</span>}
                </div>
                <p className="text-sm font-medium truncate" data-testid={`text-certificate-title-${c.id}`}>{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.client_name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.issue_date && `Lëshuar: ${new Date(c.issue_date).toLocaleDateString('sq-AL')}`}
                  {c.expiry_date && ` • Skadon: ${new Date(c.expiry_date).toLocaleDateString('sq-AL')}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => generatePDF(c)} data-testid={`button-pdf-${c.id}`}>
                <Download className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid={`button-actions-${c.id}`}><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="w-4 h-4 mr-2" /> Ndrysho</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => generatePDF(c)}><Download className="w-4 h-4 mr-2" /> Shkarko PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSendEmail(c)}><Send className="w-4 h-4 mr-2" /> Dërgo me Email</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {c.status === 'active' && <DropdownMenuItem onClick={() => handleStatusChange(c, 'revoked')}>Revokim</DropdownMenuItem>}
                  {c.status === 'active' && <DropdownMenuItem onClick={() => handleStatusChange(c, 'expired')}>Shëno si Skaduar</DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleDelete(c)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Fshi</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) { setDialogOpen(false); setEditCertificate(null); setForm(emptyForm()); } else setDialogOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCertificate ? 'Ndrysho Certifikatën' : 'Certifikatë e Re'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titulli *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="p.sh. Certifikatë Trajnimi" data-testid="input-certificate-title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Klienti</Label>
                <Select onValueChange={fillClient}>
                  <SelectTrigger data-testid="select-client"><SelectValue placeholder="Zgjidh klientin" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(cl => <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Emri i Klientit *</Label>
                <Input value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} data-testid="input-client-name" />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.client_email} onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))} data-testid="input-client-email" />
            </div>
            <div>
              <Label>Përshkrimi</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} data-testid="input-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data e Lëshimit</Label>
                <Input type="date" value={form.issue_date} onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))} data-testid="input-issue-date" />
              </div>
              <div>
                <Label>Data e Skadimit</Label>
                <Input type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} data-testid="input-expiry-date" />
              </div>
            </div>
            <div>
              <Label>Template</Label>
              <Select value={form.template} onValueChange={v => setForm(p => ({ ...p, template: v }))}>
                <SelectTrigger data-testid="select-template"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standarde</SelectItem>
                  <SelectItem value="elegant">Elegante</SelectItem>
                  <SelectItem value="modern">Moderne</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shënime</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} data-testid="input-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditCertificate(null); setForm(emptyForm()); }}>Anulo</Button>
            <Button onClick={handleSave} disabled={submitting} data-testid="button-save-certificate">
              {submitting ? 'Duke ruajtur...' : (editCertificate ? 'Ruaj Ndryshimet' : 'Krijo')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
