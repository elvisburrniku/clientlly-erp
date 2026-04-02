import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Download, Filter, X, SlidersHorizontal, Search, Calendar, User } from 'lucide-react';
import { useLanguage } from '@/lib/useLanguage';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { cn } from '@/lib/utils';
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

  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    client_nipt: '',
    client_address: '',
    items: [{ type: 'product', name: '', quantity: 1, unit: 'cope', price_ex_vat: 0, vat_rate: 20 }],
    description: '',
    validity_days: 30,
    template: 'classic',
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

  const handleAddQuote = async () => {
    const subtotal = formData.items.reduce((s, i) => s + i.price_ex_vat * i.quantity, 0);
    const vat_amount = subtotal * 0.2;
    const amount = subtotal + vat_amount;
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
      vat_amount,
      amount,
      description: formData.description,
      validity_days: formData.validity_days,
      valid_until: valid_until.toISOString().split('T')[0],
      status: 'draft',
      template: formData.template,
    };

    await base44.entities.Quote.create(quote);
    setFormData({
      client_name: '',
      client_email: '',
      client_phone: '',
      client_nipt: '',
      client_address: '',
      items: [{ type: 'product', name: '', quantity: 1, unit: 'cope', price_ex_vat: 0, vat_rate: 20 }],
      description: '',
      validity_days: 30,
      template: 'classic',
    });
    setShowForm(false);
    loadQuotes();
  };

  const handleDownloadPDF = (quote) => {
    const pageWidth = 210;
    const pageHeight = 297;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('OFERTA', 20, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let y = 35;

    doc.text(`Nr. Ofertës: ${quote.quote_number}`, 20, y);
    y += 6;
    doc.text(`Data: ${format(new Date(quote.created_date), 'dd.MM.yyyy')}`, 20, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Kliente:', 20, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
    doc.text(`Emri: ${quote.client_name}`, 20, y);
    y += 5;
    doc.text(`Email: ${quote.client_email || '-'}`, 20, y);
    y += 5;
    doc.text(`Telefon: ${quote.client_phone || '-'}`, 20, y);
    y += 5;
    doc.text(`Adresa: ${quote.client_address || '-'}`, 20, y);
    y += 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const tableY = y;
    doc.text('Artikuj', 20, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const items = quote.items || [];
    items.forEach((item, idx) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }
      const lineTotal = (item.quantity * item.price_ex_vat).toFixed(2);
      doc.text(`${idx + 1}. ${item.name}`, 20, y);
      doc.text(`${item.quantity} x €${item.price_ex_vat.toFixed(2)}`, 120, y);
      doc.text(`€${lineTotal}`, pageWidth - 30, y, { align: 'right' });
      y += 6;
    });

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Subtotali: €${(quote.subtotal || 0).toFixed(2)}`, pageWidth - 80, y, { align: 'right' });
    y += 6;
    doc.text(`TVSH (20%): €${(quote.vat_amount || 0).toFixed(2)}`, pageWidth - 80, y, { align: 'right' });
    y += 6;
    doc.setFontSize(10);
    doc.text(`GJITHSEJ: €${(quote.amount || 0).toFixed(2)}`, pageWidth - 80, y, { align: 'right' });

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
                  <td colSpan={6} className="text-center py-16">
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
                        {quote.status !== 'converted' && (
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
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Krijo Ofertë të Re</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Emri i Klientit"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              />
              <Input
                placeholder="Email"
                type="email"
                value={formData.client_email}
                onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
              />
              <Input
                placeholder="Telefon"
                value={formData.client_phone}
                onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
              />
              <Input
                placeholder="NIPT"
                value={formData.client_nipt}
                onChange={(e) => setFormData({ ...formData, client_nipt: e.target.value })}
              />
            </div>

            <Textarea
              placeholder="Adresa"
              value={formData.client_address}
              onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
            />

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Artikuj</h3>
              {formData.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-5 gap-2 mb-2">
                  <Input
                    placeholder="Emërtim"
                    value={item.name}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[idx].name = e.target.value;
                      setFormData({ ...formData, items: newItems });
                    }}
                  />
                  <Input
                    type="number"
                    placeholder="Sasi"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[idx].quantity = parseFloat(e.target.value);
                      setFormData({ ...formData, items: newItems });
                    }}
                  />
                  <Input
                    placeholder="Njësia"
                    value={item.unit}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[idx].unit = e.target.value;
                      setFormData({ ...formData, items: newItems });
                    }}
                  />
                  <Input
                    type="number"
                    placeholder="Çmim"
                    value={item.price_ex_vat}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[idx].price_ex_vat = parseFloat(e.target.value);
                      setFormData({ ...formData, items: newItems });
                    }}
                  />
                  <Input
                    type="number"
                    placeholder="TVSH %"
                    value={item.vat_rate}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[idx].vat_rate = parseFloat(e.target.value);
                      setFormData({ ...formData, items: newItems });
                    }}
                  />
                </div>
              ))}
            </div>

            <Textarea
              placeholder="Përshkrim / Shënime"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Dita të vlefshme"
                value={formData.validity_days}
                onChange={(e) => setFormData({ ...formData, validity_days: parseInt(e.target.value) })}
              />
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Anulo</Button>
            <Button onClick={handleAddQuote}>Krijo Ofertë</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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