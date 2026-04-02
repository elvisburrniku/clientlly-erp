import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Download, Filter, X, SlidersHorizontal, Search, Calendar, User, Upload, Bold, Type, PenTool } from 'lucide-react';
import { useLanguage } from '@/lib/useLanguage';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import SignatureDialog from '@/components/quotes/SignatureDialog';
import QuoteApprovalDialog from '@/components/quotes/QuoteApprovalDialog';
import QuoteHistory from '@/components/quotes/QuoteHistory';
import { cn } from '@/lib/utils';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import 'jspdf/dist/jspdf.umd.min.js';

export default function Quotes() {
  const { t } = useLanguage();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertingQuote, setConvertingQuote] = useState(null);
  const [filterSearchType, setFilterSearchType] = useState('client');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);

  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    client_nipt: '',
    client_address: '',
    items: [{ type: 'product', name: '', quantity: 1, unit: 'cope', price_ex_vat: 0, vat_rate: 20 }],
    description: '',
    work_description: '',
    logo_url: '',
    validity_days: 30,
    template: 'classic',
    font_family: 'helvetica',
    signature_image: null,
    discount_type: 'none',
    discount_value: 0,
    personalization_message: '',
  });

  const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    expired: 'bg-yellow-100 text-yellow-700',
    converted: 'bg-purple-100 text-purple-700',
  };

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    const data = await base44.entities.Quote.list('-created_date', 100);
    setQuotes(data);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      client_email: '',
      client_phone: '',
      client_nipt: '',
      client_address: '',
      items: [{ type: 'product', name: '', quantity: 1, unit: 'cope', price_ex_vat: 0, vat_rate: 20 }],
      description: '',
      work_description: '',
      logo_url: '',
      validity_days: 30,
      template: 'classic',
      font_family: 'helvetica',
      signature_image: null,
      discount_type: 'none',
      discount_value: 0,
      personalization_message: '',
    });
  };

  const handleAddQuote = async () => {
    const subtotal = formData.items.reduce((s, i) => s + i.price_ex_vat * i.quantity, 0);
    let discount_amount = 0;
    if (formData.discount_type === 'percentage') {
      discount_amount = subtotal * (formData.discount_value / 100);
    } else if (formData.discount_type === 'fixed') {
      discount_amount = formData.discount_value;
    }
    const subtotalAfterDiscount = subtotal - discount_amount;
    const vat_amount = subtotalAfterDiscount * 0.2;
    const amount = subtotalAfterDiscount + vat_amount;
    const valid_until = new Date();
    valid_until.setDate(valid_until.getDate() + formData.validity_days);

    const quote = {
      quote_number: `OFF-${Date.now().toString(36).toUpperCase()}`,
      client_name: formData.client_name,
      client_email: formData.client_email,
      client_phone: formData.client_phone,
      client_nipt: formData.client_nipt,
      client_address: formData.client_address,
      items: formData.items,
      subtotal,
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      discount_amount,
      vat_amount,
      amount,
      description: formData.description,
      work_description: formData.work_description,
      personalization_message: formData.personalization_message,
      logo_url: formData.logo_url,
      validity_days: formData.validity_days,
      valid_until: valid_until.toISOString().split('T')[0],
      status: 'draft',
      template: formData.template,
      font_family: formData.font_family,
      signature_image: formData.signature_image,
      signed_date: formData.signature_image ? new Date().toISOString() : null,
    };

    await base44.entities.Quote.create(quote);
    resetForm();
    setShowForm(false);
    loadQuotes();
  };

  const handleDownloadPDF = async (quote) => {
    const pageWidth = 210;
    const pageHeight = 297;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    let y = 15;

    // Logo
    if (quote.logo_url) {
      try {
        doc.addImage(quote.logo_url, 'PNG', 20, y, 40, 20);
        y += 25;
      } catch (e) {
        console.error('Error adding logo:', e);
      }
    }

    // Title
    const font = quote.font_family || 'helvetica';
    doc.setFont(font, 'bold');
    doc.setFontSize(22);
    doc.text('OFERTA PROFESIONALE', 20, y);
    y += 12;

    doc.setFont(font, 'normal');
    doc.setFontSize(10);

    doc.text(`Nr. Ofertës: ${quote.quote_number}`, 20, y);
    y += 5;
    doc.text(`Data: ${format(new Date(quote.created_date), 'dd.MM.yyyy')}`, 20, y);
    y += 5;
    doc.text(`Vlefshme deri: ${format(new Date(quote.valid_until), 'dd.MM.yyyy')}`, 20, y);
    y += 12;

    // Client Info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('KLIENTE:', 20, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${quote.client_name}`, 20, y);
    y += 4;
    doc.text(`${quote.client_email || ''}`, 20, y);
    y += 4;
    doc.text(`${quote.client_phone || ''}`, 20, y);
    y += 4;
    doc.text(`${quote.client_address || ''}`, 20, y);
    y += 10;

    // Work Description
    if (quote.work_description && quote.work_description !== '<p><br></p>') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('PËRSHKRIM I PUNËS:', 20, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const plainText = quote.work_description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
      const splitText = doc.splitTextToSize(plainText, 170);
      doc.text(splitText, 20, y);
      y += splitText.length * 4 + 5;
    }

    // Items header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ARTIKUJ / SHËRBIMET:', 20, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const items = quote.items || [];
    
    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y - 3, 170, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Pershkrim', 25, y);
    doc.text('Sasi', 110, y);
    doc.text('Çmim', 130, y);
    doc.text('Total', 165, y, { align: 'right' });
    y += 6;
    
    doc.setFont('helvetica', 'normal');
    items.forEach((item, idx) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }
      const lineTotal = (item.quantity * item.price_ex_vat).toFixed(2);
      const itemName = doc.splitTextToSize(item.name, 85);
      doc.text(itemName, 25, y);
      doc.text(`${item.quantity} ${item.unit}`, 110, y);
      doc.text(`€${item.price_ex_vat.toFixed(2)}`, 130, y);
      doc.text(`€${lineTotal}`, 165, y, { align: 'right' });
      y += itemName.length > 1 ? itemName.length * 3 + 2 : 5;
    });

    y += 8;
    // Totals
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Subtotal (pa TVSH): €${(quote.subtotal || 0).toFixed(2)}`, 120, y);
    y += 5;
    if (quote.discount_amount > 0) {
      const discountLabel = quote.discount_type === 'percentage' ? `${quote.discount_value}%` : '€';
      doc.text(`Zbritje (${discountLabel}): -€${(quote.discount_amount || 0).toFixed(2)}`, 120, y);
      y += 5;
    }
    doc.text(`TVSH (20%): €${(quote.vat_amount || 0).toFixed(2)}`, 120, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`SHUMA TOTALE: €${(quote.amount || 0).toFixed(2)}`, 120, y);
    
    // Notes
    if (quote.description) {
      y += 15;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('SHËNIME:', 20, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const noteText = doc.splitTextToSize(quote.description, 170);
      doc.text(noteText, 20, y);
    }

    // Signature
    if (quote.signature_image) {
      y += 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('NËNSHKRIMI I KLIENTIT:', 20, y);
      y += 8;
      try {
        doc.addImage(quote.signature_image, 'PNG', 20, y, 60, 30);
      } catch (e) {
        console.error('Error adding signature:', e);
      }
    }

    doc.save(`${quote.quote_number}.pdf`);
  };

  const handleExportExcel = () => {
    const filteredData = getFilteredQuotes();
    const csv = [
      ['Nr. Ofertës', 'Kliente', 'Email', 'Shuma', 'Statusi', 'Valide Deri'],
      ...filteredData.map(q => [q.quote_number, q.client_name, q.client_email, q.amount, q.status, q.valid_until])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ofertat-${format(new Date(), 'dd.MM.yyyy')}.csv`;
    a.click();
  };

  const getFilteredQuotes = () => {
    return quotes.filter(q => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (clientFilter && !q.client_name.toLowerCase().includes(clientFilter.toLowerCase())) return false;
      if (dateFrom && new Date(q.created_date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(q.created_date) > new Date(dateTo)) return false;
      return true;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const hasActiveFilters = clientFilter || dateFrom || dateTo || statusFilter !== 'all';
  const activeFilterCount = [clientFilter, dateFrom, dateTo].filter(Boolean).length + (statusFilter !== 'all' ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter('all');
    setClientFilter('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxho</p>
            <h1 className="text-4xl font-bold tracking-tight">Ofertat</h1>
          </div>
          <p className="text-sm text-muted-foreground pt-1">{new Date().toLocaleDateString('sq-AL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button variant="outline" onClick={handleExportExcel} className="gap-2 rounded-xl">
            <Download className="w-4 h-4" /> Eksporto Excel
          </Button>
          <Button onClick={() => setShowForm(true)} className="gap-2 rounded-xl">
            <Plus className="w-4 h-4" /> Ofertë e Re
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej</p>
          <p className="text-2xl font-bold mt-1">{quotes.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ofertat</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Të Pranuara</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{quotes.filter(q => q.status === 'accepted').length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">E pranuara</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5 col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vlera Gjithsej</p>
          <p className="text-2xl font-bold mt-1 text-primary">€{quotes.reduce((s, q) => s + (q.amount || 0), 0).toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Me TVSH</p>
        </div>
      </div>

      {/* Filter Trigger Button */}
      <button
       onClick={() => setShowFilters(true)}
       className={cn(
         "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all w-fit shadow-sm",
         hasActiveFilters
           ? "border-primary bg-primary/5 text-primary"
           : "border-border bg-white text-foreground hover:border-primary/50 hover:shadow-md"
       )}
      >
       <SlidersHorizontal className="w-4 h-4" />
       Filtrat & Kërkimi
       {hasActiveFilters && (
         <span className="bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
           {activeFilterCount}
         </span>
       )}
      </button>

      {/* Filters Drawer */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent side="right" className="w-full sm:w-[420px] p-0 flex flex-col bg-gradient-to-b from-white to-slate-50">
          <div className="px-6 py-5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 rounded-b-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
                <SlidersHorizontal className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-[15px]">Filtrat & Kërkimi</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hasActiveFilters ? `${activeFilterCount} filtr aktiv` : "Filtro dhe kërko ofertat"}
                </p>
              </div>
            </div>
            <SheetClose className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-muted-foreground hover:text-foreground transition">
              <X className="h-4 w-4" />
            </SheetClose>
          </div>
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Kërkim</span>
              </div>
              <div className="bg-muted rounded-xl p-1 flex gap-1 mb-3">
                <button onClick={() => { setFilterSearchType("client"); setClientFilter(""); }}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all",
                    filterSearchType === "client" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}>
                  <User className="w-3 h-3" /> Kliente
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input type="text"
                  placeholder="Emri i klientit..."
                  value={clientFilter}
                  onChange={(e) => { setClientFilter(e.target.value); }}
                  className="w-full pl-10 pr-9 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {clientFilter && (
                  <button onClick={() => { setClientFilter(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="h-px bg-border mx-6" />
            <div className="px-6 pt-5 pb-6">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Statusi</span>
              </div>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setStatusFilter("all"); }}
                  className={cn(
                    "flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all",
                    statusFilter === "all" ? "bg-primary/10 border-primary text-primary" : "border-border bg-white hover:border-primary/30"
                  )}
                >
                  Të Gjitha
                </button>
                <button
                  onClick={() => { setStatusFilter("accepted"); }}
                  className={cn(
                    "flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all",
                    statusFilter === "accepted" ? "bg-success/10 border-success text-success" : "border-border bg-white hover:border-success/30"
                  )}
                >
                  E Pranuar
                </button>
                <button
                  onClick={() => { setStatusFilter("draft"); }}
                  className={cn(
                    "flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all",
                    statusFilter === "draft" ? "bg-destructive/10 border-destructive text-destructive" : "border-border bg-white hover:border-destructive/30"
                  )}
                >
                  Draft
                </button>
              </div>
            </div>
            <div className="h-px bg-border mx-6" />
            <div className="px-6 pt-5 pb-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Periudha</span>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Nga Data</label>
                  <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); }}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Deri më Data</label>
                  <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); }}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            </div>
            {hasActiveFilters && (
              <>
                <div className="h-px bg-border mx-6" />
                <div className="px-6 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Filtrat Aktive</p>
                  <div className="flex flex-wrap gap-2">
                    {clientFilter && (
                      <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                        {clientFilter}
                        <button onClick={() => { setClientFilter(""); }}><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {dateFrom && (
                      <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                        Nga {dateFrom}
                        <button onClick={() => { setDateFrom(""); }}><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {dateTo && (
                      <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                        Deri {dateTo}
                        <button onClick={() => { setDateTo(""); }}><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {statusFilter !== 'all' && (
                      <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                        {statusFilter}
                        <button onClick={() => { setStatusFilter('all'); }}><X className="w-3 h-3" /></button>
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="border-t border-border px-6 py-4 bg-white space-y-2 shrink-0">
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="w-full rounded-xl">Pastro të gjithë Filtrat</Button>
            )}
            <SheetClose asChild>
              <Button className="w-full rounded-xl">Apliko & Mbyll</Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden transition-shadow hover:shadow-md w-full">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
          <p className="font-semibold text-sm">{getFilteredQuotes().length} ofertat{hasActiveFilters && " (filtruara)"}</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="px-3 py-1 text-xs font-semibold rounded-lg border border-destructive/40 text-destructive hover:bg-destructive hover:text-white transition-all">
              ✕ Pastro
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">NR. OFERTËS</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">DATA</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">KLIENTE</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">SHUMA</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">VALIDE DERI</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">STATUSI</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">AKSIONE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {getFilteredQuotes().length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                        <FileText className="w-7 h-7 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">Nuk ka oferta</p>
                      <p className="text-xs text-muted-foreground">Krijo ofertën e parë duke klikuar butonin "Ofertë e Re"</p>
                    </div>
                  </td>
                </tr>
              ) : (
                getFilteredQuotes().map((quote) => (
                  <tr key={quote.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-primary cursor-pointer hover:underline">{quote.quote_number}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{quote.created_date ? format(new Date(quote.created_date), 'dd MMM yyyy') : '—'}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold">{quote.client_name}</div>
                      {quote.client_email && <div className="text-xs text-muted-foreground mt-0.5">{quote.client_email}</div>}
                    </td>
                    <td className="px-6 py-4"><span className="text-sm font-bold text-foreground">€{(quote.amount || 0).toFixed(2)}</span></td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{format(new Date(quote.valid_until), 'dd MMM yyyy')}</td>
                    <td className="px-6 py-4">
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", statusColors[quote.status] || 'bg-gray-100')}>
                        {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5 justify-end items-center">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadPDF(quote)} title="Shkarko PDF">
                          <Download className="w-4 h-4" />
                        </Button>
                        {quote.status === 'sent' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7" 
                            onClick={() => {
                              setSelectedQuote(quote);
                              setShowApprovalDialog(true);
                            }}
                            title="Përgjigje"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}
                        {quote.status !== 'converted' && quote.status !== 'sent' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7" 
                            onClick={() => {
                              setConvertingQuote(quote);
                              setShowConvertDialog(true);
                            }}
                            title="Konverto në Faturë"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Quote Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Krijo Ofertë Profesionale</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Section 1: Të dhënat e Klientit */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">1</div>
                <h3 className="font-semibold text-sm">Të dhënat e Klientit</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 pl-8">
                <Input placeholder="Emri i Klientit *" value={formData.client_name} onChange={(e) => setFormData({ ...formData, client_name: e.target.value })} />
                <Input placeholder="Email" type="email" value={formData.client_email} onChange={(e) => setFormData({ ...formData, client_email: e.target.value })} />
                <Input placeholder="Telefon" value={formData.client_phone} onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })} />
                <Input placeholder="NIPT" value={formData.client_nipt} onChange={(e) => setFormData({ ...formData, client_nipt: e.target.value })} />
              </div>
              <Textarea placeholder="Adresa" value={formData.client_address} onChange={(e) => setFormData({ ...formData, client_address: e.target.value })} className="pl-8" />
              {formData.client_name && <QuoteHistory clientName={formData.client_name} />}
            </div>

            {/* Section 2: Logo/Imazh */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">2</div>
                <h3 className="font-semibold text-sm">Logo / Imazh Kompanie</h3>
              </div>
              <div className="pl-8">
                <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 bg-muted/20 transition">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Ngarkoje logon ose imazhun e kompanisë</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    if (e.target.files?.[0]) {
                      const file = e.target.files[0];
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setFormData({ ...formData, logo_url: event.target?.result });
                      };
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
                {formData.logo_url && <div className="mt-2"><img src={formData.logo_url} alt="Logo" className="h-16 object-contain" /></div>}
              </div>
            </div>

            {/* Section 3: Pershkrim i Punes */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">3</div>
                <h3 className="font-semibold text-sm">Përshkrimi i Punës / Detajet</h3>
              </div>
              <div className="pl-8 space-y-2">
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted p-2 flex gap-1 border-b border-border flex-wrap">
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Bold">
                      <Bold className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Madhësia e Tekstit">
                      <Type className="w-4 h-4" />
                    </Button>
                  </div>
                  <ReactQuill 
                    value={formData.work_description} 
                    onChange={(value) => setFormData({ ...formData, work_description: value })}
                    modules={{
                      toolbar: [
                        [{ 'font': ['helvetica', 'arial', 'times', 'courier', 'georgia', 'verdana', 'trebuchet', 'palatino', 'garamond', 'bookman', 'comic', 'impact'] }],
                        ['bold', 'italic', 'underline'],
                        [{ 'size': ['small', false, 'large', 'huge'] }],
                        [{ 'color': [] }],
                        ['bullet', 'ordered'],
                        ['link'],
                      ]
                    }}
                    theme="snow"
                    placeholder="Përshkruaj detajet e punës, materialet, kohëzgjatjen, etj..."
                    className="h-48"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Artikuj/Shërbimet */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">4</div>
                <h3 className="font-semibold text-sm">Artikuj / Shërbimet</h3>
              </div>
              <div className="pl-8 space-y-2">
                {formData.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2">
                    <Input placeholder="Emërtim *" value={item.name} onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[idx].name = e.target.value;
                      setFormData({ ...formData, items: newItems });
                    }} />
                    <Input type="number" placeholder="Sasi" value={item.quantity} onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[idx].quantity = parseFloat(e.target.value);
                      setFormData({ ...formData, items: newItems });
                    }} />
                    <Input placeholder="Njësia" value={item.unit} onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[idx].unit = e.target.value;
                      setFormData({ ...formData, items: newItems });
                    }} />
                    <Input type="number" placeholder="Çmim" value={item.price_ex_vat} onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[idx].price_ex_vat = parseFloat(e.target.value);
                      setFormData({ ...formData, items: newItems });
                    }} />
                    <Input type="number" placeholder="TVSH %" value={item.vat_rate} onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[idx].vat_rate = parseFloat(e.target.value);
                      setFormData({ ...formData, items: newItems });
                    }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Section 5: Shënime dhe Përsonalizim */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">5</div>
                <h3 className="font-semibold text-sm">Shënime dhe Përsonalizim</h3>
              </div>
              <div className="pl-8 space-y-2">
                <Textarea placeholder="Kushte pagese, garancia, etj..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                <Textarea placeholder="Mesazh përsonalizim për klientin (p.sh. Faleminderit që na keni besuar...)" value={formData.personalization_message} onChange={(e) => setFormData({ ...formData, personalization_message: e.target.value })} />
              </div>
            </div>

            {/* Section 6: Nënshkrimi */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">6</div>
                <h3 className="font-semibold text-sm">Nënshkrimi Digjital</h3>
              </div>
              <div className="pl-8">
                <Button
                  variant="outline"
                  onClick={() => setShowSignatureDialog(true)}
                  className="gap-2 w-full justify-center"
                >
                  <PenTool className="w-4 h-4" />
                  {formData.signature_image ? 'Ndrysho Nënshkrimin' : 'Shto Nënshkrimin'}
                </Button>
                {formData.signature_image && (
                  <div className="mt-3 p-2 bg-muted rounded-lg">
                    <img src={formData.signature_image} alt="Signature" className="max-h-20 w-auto" />
                  </div>
                )}
              </div>
            </div>

            {/* Section 7: Cilësime */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">7</div>
                <h3 className="font-semibold text-sm">Cilësime të Ofertës</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 pl-8">
               <div>
                 <label className="text-xs font-medium text-muted-foreground block mb-1.5">Zbritje Lloji</label>
                 <Select value={formData.discount_type} onValueChange={(val) => setFormData({ ...formData, discount_type: val })}>
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="none">Asgjë</SelectItem>
                     <SelectItem value="percentage">%</SelectItem>
                     <SelectItem value="fixed">€</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               {formData.discount_type !== 'none' && (
                 <div>
                   <label className="text-xs font-medium text-muted-foreground block mb-1.5">Zbritje Vlera</label>
                   <Input type="number" value={formData.discount_value} onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })} />
                 </div>
               )}
               <div>
                 <label className="text-xs font-medium text-muted-foreground block mb-1.5">Vlefshme për (ditë)</label>
                 <Input type="number" value={formData.validity_days} onChange={(e) => setFormData({ ...formData, validity_days: parseInt(e.target.value) })} />
               </div>
               <div>
                 <label className="text-xs font-medium text-muted-foreground block mb-1.5">Stil Dokumenti</label>
                 <Select value={formData.template} onValueChange={(val) => setFormData({ ...formData, template: val })}>
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="classic">Klasik</SelectItem>
                     <SelectItem value="modern">Modern</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Anulo</Button>
            <Button onClick={handleAddQuote} className="gap-2">
              <Plus className="w-4 h-4" /> Krijo Ofertë
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Dialog */}
      <SignatureDialog
        open={showSignatureDialog}
        onOpenChange={setShowSignatureDialog}
        onSignatureSaved={(signature) => setFormData({ ...formData, signature_image: signature })}
      />

      {/* Approval Dialog */}
      <QuoteApprovalDialog
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
        quote={selectedQuote}
        onApprovalChange={() => loadQuotes()}
      />

      {/* Convert to Invoice Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konverto në Faturë</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A jeni i sigurt se dëshironi të konvertoni ofertën <strong>{convertingQuote?.quote_number}</strong> në faturë?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>Anulo</Button>
            <Button onClick={() => {
              if (convertingQuote) {
                base44.entities.Quote.update(convertingQuote.id, { status: 'converted' });
                setShowConvertDialog(false);
                loadQuotes();
              }
            }}>Konverto në Faturë</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}