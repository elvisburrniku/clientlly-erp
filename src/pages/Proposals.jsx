import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Download, Copy, Send, Eye, Check, X, MoreHorizontal, Trash2, Pencil, ArrowRightLeft, Palette, ExternalLink, CheckCircle, DollarSign } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

const emptyItem = () => ({ name: '', quantity: 1, unit: 'cope', price: 0, vat_rate: 20 });

const emptyForm = () => ({
  title: '',
  client_name: '',
  client_email: '',
  client_phone: '',
  client_address: '',
  client_nipt: '',
  description: '',
  items: [emptyItem()],
  discount_type: 'none',
  discount_value: 0,
  validity_days: 30,
  template: 'classic',
  color_theme: '#4338ca',
  notes: '',
  terms: '',
});

const statusColors = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  converted: 'bg-purple-100 text-purple-700',
};

const statusLabels = {
  draft: 'Draft',
  sent: 'Dërguar',
  viewed: 'Parë',
  accepted: 'Pranuar',
  rejected: 'Refuzuar',
  converted: 'Konvertuar',
};

const COLOR_THEMES = [
  { value: '#4338ca', label: 'Indigo' },
  { value: '#059669', label: 'Emerald' },
  { value: '#dc2626', label: 'Red' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#7c3aed', label: 'Violet' },
  { value: '#ea580c', label: 'Orange' },
];

export default function Proposals() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProposal, setEditProposal] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [convertDialog, setConvertDialog] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [p, c] = await Promise.all([
      base44.entities.Proposal.list('-created_at', 200),
      base44.entities.Client.list('name', 500),
    ]);
    setProposals(p);
    setClients(c);
    setLoading(false);
  };

  const calcTotals = (items, discountType, discountValue) => {
    const subtotal = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0);
    let discount_amount = 0;
    if (discountType === 'percentage') discount_amount = subtotal * ((discountValue || 0) / 100);
    else if (discountType === 'fixed') discount_amount = discountValue || 0;
    const afterDiscount = subtotal - discount_amount;
    const tax_amount = items.reduce((s, i) => {
      const lineTotal = (i.price || 0) * (i.quantity || 0);
      const lineRatio = subtotal > 0 ? lineTotal / subtotal : 0;
      return s + (lineTotal - discount_amount * lineRatio) * ((i.vat_rate || 0) / 100);
    }, 0);
    return { subtotal: parseFloat(subtotal.toFixed(2)), discount_amount: parseFloat(discount_amount.toFixed(2)), tax_amount: parseFloat(tax_amount.toFixed(2)), total: parseFloat((afterDiscount + tax_amount).toFixed(2)) };
  };

  const fillClient = (clientId) => {
    const c = clients.find(cl => cl.id === clientId);
    if (c) setForm(prev => ({ ...prev, client_name: c.name, client_email: c.email || '', client_phone: c.phone || '', client_address: c.address || '', client_nipt: c.nuis || '' }));
  };

  const handleSave = async () => {
    if (!form.title || !form.client_name) { toast.error('Titulli dhe klienti janë të detyrueshme'); return; }
    setSubmitting(true);
    const { subtotal, discount_amount, tax_amount, total } = calcTotals(form.items, form.discount_type, form.discount_value);
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (form.validity_days || 30));

    const data = {
      title: form.title,
      client_name: form.client_name,
      client_email: form.client_email,
      client_phone: form.client_phone,
      client_address: form.client_address,
      client_nipt: form.client_nipt,
      description: form.description,
      items: form.items,
      subtotal, discount_type: form.discount_type, discount_value: form.discount_value, discount_amount, tax_amount, total,
      validity_days: form.validity_days,
      valid_until: validUntil.toISOString().split('T')[0],
      template: form.template,
      color_theme: form.color_theme,
      notes: form.notes,
      terms: form.terms,
    };

    if (editProposal) {
      await base44.entities.Proposal.update(editProposal.id, data);
      toast.success('Propozimi u përditësua');
    } else {
      data.proposal_number = `PROP-${Date.now().toString(36).toUpperCase()}`;
      data.status = 'draft';
      data.token = crypto.randomUUID();
      data.created_by = user?.id;
      await base44.entities.Proposal.create(data);
      toast.success('Propozimi u krijua');
    }
    setDialogOpen(false);
    setEditProposal(null);
    setForm(emptyForm());
    setSubmitting(false);
    loadData();
  };

  const openEdit = (p) => {
    setEditProposal(p);
    setForm({
      title: p.title || '', client_name: p.client_name || '', client_email: p.client_email || '',
      client_phone: p.client_phone || '', client_address: p.client_address || '', client_nipt: p.client_nipt || '',
      description: p.description || '', items: p.items || [emptyItem()],
      discount_type: p.discount_type || 'none', discount_value: p.discount_value || 0,
      validity_days: p.validity_days || 30, template: p.template || 'classic',
      color_theme: p.color_theme || '#4338ca', notes: p.notes || '', terms: p.terms || '',
    });
    setDialogOpen(true);
  };

  const handleDuplicate = async (p) => {
    const data = {
      ...p, proposal_number: `PROP-${Date.now().toString(36).toUpperCase()}`,
      status: 'draft', token: crypto.randomUUID(),
      viewed_at: null, accepted_at: null, rejected_at: null, rejection_reason: null, converted_invoice_id: null,
    };
    delete data.id; delete data.created_at; delete data.updated_at;
    await base44.entities.Proposal.create(data);
    toast.success('Propozimi u dyfishua');
    loadData();
  };

  const handleStatusChange = async (p, newStatus) => {
    const updateData = { status: newStatus };
    if (newStatus === 'sent' && !p.token) updateData.token = crypto.randomUUID();
    await base44.entities.Proposal.update(p.id, updateData);
    toast.success(`Statusi ndryshoi në ${statusLabels[newStatus]}`);
    loadData();
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Fshi propozimin ${p.proposal_number}?`)) return;
    await base44.entities.Proposal.delete(p.id);
    toast.success('Propozimi u fshi');
    loadData();
  };

  const handleConvertToInvoice = async (p) => {
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const invoice = {
      invoice_number: invoiceNumber,
      client_name: p.client_name,
      client_email: p.client_email,
      client_phone: p.client_phone,
      client_address: p.client_address,
      items: p.items?.map(i => ({ type: 'service', name: i.name, quantity: i.quantity, unit: i.unit, price_ex_vat: i.price, vat_rate: i.vat_rate, price_inc_vat: i.price * (1 + (i.vat_rate || 0) / 100), line_total: i.price * i.quantity })),
      subtotal: p.subtotal,
      tax_amount: p.tax_amount,
      total: p.total,
      status: 'draft',
      description: p.description,
    };
    const createdInvoice = await base44.entities.Invoice.create(invoice);
    await base44.entities.Proposal.update(p.id, { status: 'converted', converted_invoice_id: createdInvoice?.id || null });
    setConvertDialog(null);
    toast.success('Propozimi u konvertua në faturë');
    loadData();
  };

  const copyClientLink = (p) => {
    const url = `${window.location.origin}/proposal/${p.token}`;
    navigator.clipboard.writeText(url);
    toast.success('Linku u kopjua');
  };

  const generatePDF = (p) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const themeColor = p.color_theme || '#4338ca';
    const r = parseInt(themeColor.slice(1, 3), 16);
    const g = parseInt(themeColor.slice(3, 5), 16);
    const b = parseInt(themeColor.slice(5, 7), 16);

    doc.setFillColor(r, g, b);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('PROPOZIM', 20, 22);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nr: ${p.proposal_number}`, 20, 32);
    doc.text(`Data: ${new Date(p.created_at).toLocaleDateString('sq-AL')}`, 100, 32);
    if (p.valid_until) doc.text(`Vlefshme deri: ${new Date(p.valid_until).toLocaleDateString('sq-AL')}`, 155, 32);

    let y = 52;
    doc.setTextColor(0, 0, 0);

    if (p.title) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(p.title, 20, y);
      y += 10;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('KLIENTI:', 20, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (p.client_name) { doc.text(p.client_name, 20, y); y += 4; }
    if (p.client_email) { doc.text(p.client_email, 20, y); y += 4; }
    if (p.client_phone) { doc.text(p.client_phone, 20, y); y += 4; }
    if (p.client_address) { doc.text(p.client_address, 20, y); y += 4; }
    y += 6;

    if (p.description) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('PËRSHKRIMI:', 20, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(p.description, 170);
      doc.text(lines, 20, y);
      y += lines.length * 4 + 5;
    }

    const items = p.items || [];
    if (items.length > 0) {
      doc.setFillColor(r, g, b);
      doc.rect(20, y - 3, 170, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Përshkrimi', 22, y);
      doc.text('Sasi', 110, y);
      doc.text('Çmimi', 130, y);
      doc.text('Total', 185, y, { align: 'right' });
      y += 6;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      items.forEach((item) => {
        if (y > 260) { doc.addPage(); y = 20; }
        const lineTotal = ((item.price || 0) * (item.quantity || 0)).toFixed(2);
        const nameLines = doc.splitTextToSize(item.name || '', 85);
        doc.text(nameLines, 22, y);
        doc.text(`${item.quantity} ${item.unit || ''}`, 110, y);
        doc.text(`€${(item.price || 0).toFixed(2)}`, 130, y);
        doc.text(`€${lineTotal}`, 185, y, { align: 'right' });
        y += nameLines.length > 1 ? nameLines.length * 4 + 2 : 5;
      });

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Subtotal: €${(p.subtotal || 0).toFixed(2)}`, 130, y); y += 5;
      if (p.discount_amount > 0) { doc.text(`Zbritje: -€${(p.discount_amount || 0).toFixed(2)}`, 130, y); y += 5; }
      doc.text(`TVSH: €${(p.tax_amount || 0).toFixed(2)}`, 130, y); y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(r, g, b);
      doc.text(`TOTALI: €${(p.total || 0).toFixed(2)}`, 130, y);
    }

    if (p.terms) {
      y += 15;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('KUSHTET:', 20, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const tLines = doc.splitTextToSize(p.terms, 170);
      doc.text(tLines, 20, y);
    }

    if (p.notes) {
      y += 15;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('SHËNIME:', 20, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const nLines = doc.splitTextToSize(p.notes, 170);
      doc.text(nLines, 20, y);
    }

    doc.save(`${p.proposal_number}.pdf`);
  };

  const filtered = proposals.filter(p => statusFilter === 'all' || p.status === statusFilter);

  const totals = {
    count: proposals.length,
    accepted: proposals.filter(p => p.status === 'accepted').length,
    value: proposals.reduce((s, p) => s + (p.total || 0), 0),
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
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxho</p>
            <h1 className="text-4xl font-bold tracking-tight" data-testid="text-page-title">Propozimet</h1>
          </div>
          <p className="text-sm text-muted-foreground pt-1">{new Date().toLocaleDateString('sq-AL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button onClick={() => { setForm(emptyForm()); setEditProposal(null); setDialogOpen(true); }} className="gap-2 rounded-xl" data-testid="button-new-proposal">
            <Plus className="w-4 h-4" /> Propozim i Ri
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-indigo-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-indigo-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej</p></div>
            <p className="text-2xl font-bold" data-testid="text-total-proposals">{totals.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Propozime</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-emerald-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-emerald-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Të Pranuara</p></div>
            <p className="text-2xl font-bold text-emerald-600" data-testid="text-accepted-proposals">{totals.accepted}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Propozime</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-violet-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-violet-500" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vlera Totale</p></div>
            <p className="text-2xl font-bold text-primary" data-testid="text-total-value">€{totals.value.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Me TVSH</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'draft', 'sent', 'viewed', 'accepted', 'rejected', 'converted'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            data-testid={`button-filter-${s}`}
            className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all",
              statusFilter === s ? "bg-primary/10 border-primary text-primary" : "border-border bg-white hover:border-primary/30"
            )}>
            {s === 'all' ? 'Të Gjitha' : statusLabels[s]} {s !== 'all' && `(${proposals.filter(p => p.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nuk ka propozime</p>
          </div>
        )}
        {filtered.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-border/60 shadow-sm p-5 flex items-center justify-between gap-4" data-testid={`card-proposal-${p.id}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="font-bold text-sm" data-testid={`text-proposal-number-${p.id}`}>{p.proposal_number}</span>
                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", statusColors[p.status] || 'bg-slate-100')}>
                  {statusLabels[p.status] || p.status}
                </span>
              </div>
              <p className="text-sm font-medium truncate" data-testid={`text-proposal-title-${p.id}`}>{p.title}</p>
              <p className="text-xs text-muted-foreground">{p.client_name} • €{(p.total || 0).toFixed(2)}</p>
              {p.valid_until && <p className="text-xs text-muted-foreground">Vlefshme deri: {new Date(p.valid_until).toLocaleDateString('sq-AL')}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => generatePDF(p)} data-testid={`button-pdf-${p.id}`}>
                <Download className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid={`button-actions-${p.id}`}><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(p)} data-testid={`action-edit-${p.id}`}><Pencil className="w-4 h-4 mr-2" /> Ndrysho</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(p)} data-testid={`action-duplicate-${p.id}`}><Copy className="w-4 h-4 mr-2" /> Dupliko</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => generatePDF(p)}><Download className="w-4 h-4 mr-2" /> Shkarko PDF</DropdownMenuItem>
                  {p.token && <DropdownMenuItem onClick={() => copyClientLink(p)}><ExternalLink className="w-4 h-4 mr-2" /> Kopjo Linkun</DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  {p.status === 'draft' && <DropdownMenuItem onClick={() => handleStatusChange(p, 'sent')}><Send className="w-4 h-4 mr-2" /> Shëno si Dërguar</DropdownMenuItem>}
                  {(p.status === 'sent' || p.status === 'viewed') && <DropdownMenuItem onClick={() => handleStatusChange(p, 'accepted')}><Check className="w-4 h-4 mr-2" /> Shëno si Pranuar</DropdownMenuItem>}
                  {(p.status === 'sent' || p.status === 'viewed') && <DropdownMenuItem onClick={() => handleStatusChange(p, 'rejected')}><X className="w-4 h-4 mr-2" /> Shëno si Refuzuar</DropdownMenuItem>}
                  {p.status === 'accepted' && (
                    <DropdownMenuItem onClick={() => setConvertDialog(p)} data-testid={`action-convert-${p.id}`}><ArrowRightLeft className="w-4 h-4 mr-2" /> Konverto në Faturë</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleDelete(p)} className="text-destructive" data-testid={`action-delete-${p.id}`}><Trash2 className="w-4 h-4 mr-2" /> Fshi</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) { setDialogOpen(false); setEditProposal(null); setForm(emptyForm()); } else setDialogOpen(v); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProposal ? 'Ndrysho Propozimin' : 'Propozim i Ri'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titulli *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Titulli i propozimit" data-testid="input-proposal-title" />
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Email</Label>
                <Input value={form.client_email} onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))} data-testid="input-client-email" />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input value={form.client_phone} onChange={e => setForm(p => ({ ...p, client_phone: e.target.value }))} data-testid="input-client-phone" />
              </div>
              <div>
                <Label>NIPT</Label>
                <Input value={form.client_nipt} onChange={e => setForm(p => ({ ...p, client_nipt: e.target.value }))} data-testid="input-client-nipt" />
              </div>
            </div>
            <div>
              <Label>Adresa</Label>
              <Input value={form.client_address} onChange={e => setForm(p => ({ ...p, client_address: e.target.value }))} data-testid="input-client-address" />
            </div>

            <div>
              <Label>Përshkrimi</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} data-testid="input-description" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="mb-0">Artikuj / Shërbime</Label>
                <Button variant="outline" size="sm" onClick={() => setForm(p => ({ ...p, items: [...p.items, emptyItem()] }))} data-testid="button-add-item">
                  <Plus className="w-3 h-3 mr-1" /> Shto
                </Button>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
                  <div className="col-span-4">
                    {idx === 0 && <Label className="text-xs">Emri</Label>}
                    <Input value={item.name} onChange={e => { const items = [...form.items]; items[idx].name = e.target.value; setForm(p => ({ ...p, items })); }} data-testid={`input-item-name-${idx}`} />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <Label className="text-xs">Sasia</Label>}
                    <Input type="number" value={item.quantity} onChange={e => { const items = [...form.items]; items[idx].quantity = parseFloat(e.target.value) || 0; setForm(p => ({ ...p, items })); }} data-testid={`input-item-qty-${idx}`} />
                  </div>
                  <div className="col-span-1">
                    {idx === 0 && <Label className="text-xs">Njësia</Label>}
                    <Input value={item.unit} onChange={e => { const items = [...form.items]; items[idx].unit = e.target.value; setForm(p => ({ ...p, items })); }} />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <Label className="text-xs">Çmimi</Label>}
                    <Input type="number" value={item.price} onChange={e => { const items = [...form.items]; items[idx].price = parseFloat(e.target.value) || 0; setForm(p => ({ ...p, items })); }} data-testid={`input-item-price-${idx}`} />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <Label className="text-xs">TVSH %</Label>}
                    <Input type="number" value={item.vat_rate} onChange={e => { const items = [...form.items]; items[idx].vat_rate = parseFloat(e.target.value) || 0; setForm(p => ({ ...p, items })); }} />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {form.items.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))} data-testid={`button-remove-item-${idx}`}>
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <div className="text-right mt-2 space-y-1 text-sm">
                <p>Subtotal: <strong>€{calcTotals(form.items, form.discount_type, form.discount_value).subtotal.toFixed(2)}</strong></p>
                {form.discount_type !== 'none' && <p>Zbritje: <strong>-€{calcTotals(form.items, form.discount_type, form.discount_value).discount_amount.toFixed(2)}</strong></p>}
                <p>TVSH: <strong>€{calcTotals(form.items, form.discount_type, form.discount_value).tax_amount.toFixed(2)}</strong></p>
                <p className="text-base font-bold">Total: €{calcTotals(form.items, form.discount_type, form.discount_value).total.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Zbritje</Label>
                <Select value={form.discount_type} onValueChange={v => setForm(p => ({ ...p, discount_type: v }))}>
                  <SelectTrigger data-testid="select-discount-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Asnjë</SelectItem>
                    <SelectItem value="percentage">Përqindje (%)</SelectItem>
                    <SelectItem value="fixed">Fixe (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.discount_type !== 'none' && (
                <div>
                  <Label>Vlera e Zbritjes</Label>
                  <Input type="number" value={form.discount_value} onChange={e => setForm(p => ({ ...p, discount_value: parseFloat(e.target.value) || 0 }))} data-testid="input-discount-value" />
                </div>
              )}
              <div>
                <Label>Vlefshëmeria (ditë)</Label>
                <Input type="number" value={form.validity_days} onChange={e => setForm(p => ({ ...p, validity_days: parseInt(e.target.value) || 30 }))} data-testid="input-validity-days" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template</Label>
                <Select value={form.template} onValueChange={v => setForm(p => ({ ...p, template: v }))}>
                  <SelectTrigger data-testid="select-template"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Klasike</SelectItem>
                    <SelectItem value="modern">Moderne</SelectItem>
                    <SelectItem value="minimal">Minimale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ngjyra e Temës</Label>
                <div className="flex gap-2 mt-1">
                  {COLOR_THEMES.map(ct => (
                    <button key={ct.value} onClick={() => setForm(p => ({ ...p, color_theme: ct.value }))}
                      className={cn("w-8 h-8 rounded-lg border-2 transition-all", form.color_theme === ct.value ? "border-foreground scale-110" : "border-transparent")}
                      style={{ backgroundColor: ct.value }}
                      data-testid={`button-color-${ct.value}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label>Kushtet</Label>
              <Textarea value={form.terms} onChange={e => setForm(p => ({ ...p, terms: e.target.value }))} rows={3} data-testid="input-terms" />
            </div>
            <div>
              <Label>Shënime</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} data-testid="input-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditProposal(null); setForm(emptyForm()); }} data-testid="button-cancel">Anulo</Button>
            <Button onClick={handleSave} disabled={submitting} data-testid="button-save-proposal">
              {submitting ? 'Duke ruajtur...' : (editProposal ? 'Ruaj Ndryshimet' : 'Krijo Propozimin')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!convertDialog} onOpenChange={(v) => { if (!v) setConvertDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konverto në Faturë</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Dëshironi të konvertoni propozimin <strong>{convertDialog?.proposal_number}</strong> në faturë? Kjo do të krijojë një faturë të re me të dhënat e propozimit.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialog(null)}>Anulo</Button>
            <Button onClick={() => handleConvertToInvoice(convertDialog)} data-testid="button-confirm-convert">Po, Konverto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
