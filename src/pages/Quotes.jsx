import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Send, Check, X, Eye, Trash2, Copy, Download, Filter } from 'lucide-react';
import { useLanguage } from '@/lib/useLanguage';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf/dist/jspdf.umd.min.js';

const statusColors = {
  draft: 'bg-slate-100 text-slate-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-orange-100 text-orange-800',
  converted: 'bg-purple-100 text-purple-800'
};

export default function Quotes() {
  const { t } = useLanguage();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertingQuote, setConvertingQuote] = useState(null);
  const [formData, setFormData] = useState({
    quote_number: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_nipt: '',
    client_address: '',
    items: [{ type: 'service', name: '', quantity: 1, unit: 'cope', price_ex_vat: 0, vat_rate: 20 }],
    description: '',
    validity_days: 30,
    template: 'classic'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const data = await base44.entities.Quote.list('-created_date', 100);
      setQuotes(data);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQuoteNumber = async () => {
    const quotes = await base44.entities.Quote.list('-created_date', 1);
    const lastNumber = quotes.length > 0 ? parseInt(quotes[0].quote_number.split('-')[1]) : 0;
    return `OFT-${String(lastNumber + 1).padStart(4, '0')}`;
  };

  const calculateTotals = (items, discount) => {
    let subtotal = 0;
    let vat = 0;
    items.forEach(item => {
      const lineTotal = item.quantity * item.price_ex_vat;
      subtotal += lineTotal;
      vat += lineTotal * (item.vat_rate / 100);
    });
    const discountAmount = discount.type === 'percentage' ? subtotal * (discount.value / 100) : discount.value;
    const subtotalAfterDiscount = subtotal - discountAmount;
    return {
      subtotal,
      discount_amount: discountAmount,
      vat_amount: subtotalAfterDiscount * (20 / 100),
      amount: subtotalAfterDiscount + (subtotalAfterDiscount * (20 / 100))
    };
  };

  const handleAddQuote = async () => {
    try {
      const quoteNumber = await generateQuoteNumber();
      const totals = calculateTotals(formData.items, { type: 'none', value: 0 });
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + formData.validity_days);

      const newQuote = {
        quote_number: quoteNumber,
        client_name: formData.client_name,
        client_email: formData.client_email,
        client_phone: formData.client_phone,
        client_nipt: formData.client_nipt,
        client_address: formData.client_address,
        items: formData.items.map(item => ({
          ...item,
          price_inc_vat: item.price_ex_vat * (1 + item.vat_rate / 100),
          line_total: item.quantity * item.price_ex_vat
        })),
        ...totals,
        description: formData.description,
        validity_days: formData.validity_days,
        valid_until: validUntil.toISOString().split('T')[0],
        template: formData.template,
        status: 'draft'
      };

      await base44.entities.Quote.create(newQuote);
      setFormData({
        quote_number: '',
        client_name: '',
        client_email: '',
        client_phone: '',
        client_nipt: '',
        client_address: '',
        items: [{ type: 'service', name: '', quantity: 1, unit: 'cope', price_ex_vat: 0, vat_rate: 20 }],
        description: '',
        validity_days: 30,
        template: 'classic'
      });
      setShowForm(false);
      fetchQuotes();
    } catch (error) {
      console.error('Error creating quote:', error);
    }
  };

  const handleConvertToInvoice = async () => {
    try {
      const quote = convertingQuote;
      const invoiceNumber = `INV-${quote.quote_number.split('-')[1]}`;
      
      const newInvoice = {
        invoice_number: invoiceNumber,
        client_name: quote.client_name,
        client_email: quote.client_email,
        client_phone: quote.client_phone,
        client_nipt: quote.client_nipt,
        client_address: quote.client_address,
        items: quote.items,
        subtotal: quote.subtotal,
        discount_amount: quote.discount_amount,
        vat_amount: quote.vat_amount,
        amount: quote.amount,
        status: 'draft',
        template: quote.template,
        description: quote.description
      };

      const invoice = await base44.entities.Invoice.create(newInvoice);
      await base44.entities.Quote.update(quote.id, {
        status: 'converted',
        converted_to_invoice_id: invoice.id
      });

      setShowConvertDialog(false);
      setConvertingQuote(null);
      fetchQuotes();
    } catch (error) {
      console.error('Error converting quote:', error);
    }
  };

  const handleDeleteQuote = async (id) => {
    try {
      await base44.entities.Quote.delete(id);
      fetchQuotes();
    } catch (error) {
      console.error('Error deleting quote:', error);
    }
  };

  const handleDownloadPDF = async (quote) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('OFERTË', pageWidth / 2, y, { align: 'center' });
    y += 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Nr. Ofertës: ${quote.quote_number}`, 20, y);
    doc.text(`Data: ${format(new Date(quote.created_date), 'dd.MM.yyyy')}`, pageWidth - 80, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Të dhënat e Klientit:', 20, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Emri: ${quote.client_name}`, 20, y);
    y += 5;
    doc.text(`Email: ${quote.client_email}`, 20, y);
    y += 5;
    doc.text(`Telefon: ${quote.client_phone || '-'}`, 20, y);
    y += 5;
    doc.text(`NIPT: ${quote.client_nipt || '-'}`, 20, y);
    y += 5;
    doc.text(`Adresa: ${quote.client_address || '-'}`, 20, y, { maxWidth: 160 });
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
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ofertat</h1>
          <p className="text-sm text-muted-foreground">Menaxho dhe krijo oferta për klientët</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(true)} className="gap-2">
            <Filter className="w-4 h-4" />
            Filtro
          </Button>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Ofertë e Re
          </Button>
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nr. Ofertës</TableHead>
              <TableHead>Kliente</TableHead>
              <TableHead>Shuma</TableHead>
              <TableHead>Valide Deri</TableHead>
              <TableHead>Statusi</TableHead>
              <TableHead className="text-right">Aksione</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {getFilteredQuotes().map((quote) => (
              <TableRow key={quote.id} className="hover:bg-slate-50">
                <TableCell className="font-semibold">{quote.quote_number}</TableCell>
                <TableCell>{quote.client_name}</TableCell>
                <TableCell>€{quote.amount?.toLocaleString()}</TableCell>
                <TableCell>{format(new Date(quote.valid_until), 'dd MMM yyyy')}</TableCell>
                <TableCell>
                  <Badge className={statusColors[quote.status] || 'bg-gray-100'}>
                    {quote.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDownloadPDF(quote)} title="Shkarko PDF">
                      <Download className="w-4 h-4" />
                    </Button>
                    {quote.status !== 'converted' && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setConvertingQuote(quote);
                          setShowConvertDialog(true);
                        }}
                        title="Konverto në Faturë"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteQuote(quote.id)}
                      title="Fshi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Quote Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Krijo Ofertë të Re</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Client Info */}
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

            {/* Items */}
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
            <Button onClick={handleConvertToInvoice}>Konverto në Faturë</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters Sheet */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filtro Ofertat</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <label className="text-sm font-semibold mb-2 block">Statusi</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Të Gjitha</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">E Dërguar</SelectItem>
                  <SelectItem value="accepted">E Pranuar</SelectItem>
                  <SelectItem value="rejected">E Refuzuar</SelectItem>
                  <SelectItem value="expired">E Skaduar</SelectItem>
                  <SelectItem value="converted">E Konvertuar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Kliente</label>
              <Input
                placeholder="Emri i klientit"
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold mb-2 block">Nga Data</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Deri Data</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setStatusFilter('all');
                  setClientFilter('');
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Risetimi
              </Button>
              <Button className="flex-1" onClick={handleExportExcel}>
                Eksporto Excel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}