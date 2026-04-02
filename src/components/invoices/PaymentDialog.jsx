import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Banknote, CreditCard, Building2, Plus } from 'lucide-react';

export default function PaymentDialog({ invoice, isOpen, onOpenChange, onPaymentAdded }) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amount, setAmount] = useState(invoice?.amount || 0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Card payment fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');

  const handleAddPayment = async () => {
    if (!amount || amount <= 0) {
      toast.error('Shuma duhet të jetë më e madhe se 0');
      return;
    }

    if (paymentMethod === 'card') {
      if (!cardNumber || !cardHolder || !expiryMonth || !expiryYear || !cvv) {
        toast.error('Plotëso të gjithë fushat e kartës');
        return;
      }
    }

    setLoading(true);
    try {
      const lastFour = cardNumber.slice(-4);
      const cardType = cardNumber.startsWith('4') ? 'visa' : cardNumber.startsWith('5') ? 'mastercard' : cardNumber.startsWith('3') ? 'amex' : 'other';

      // Create payment record
      await base44.entities.Payment.create({
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        client_name: invoice.client_name,
        client_email: invoice.client_email,
        amount,
        payment_method: paymentMethod,
        card_last_four: paymentMethod === 'card' ? lastFour : null,
        card_type: paymentMethod === 'card' ? cardType : null,
        notes,
        payment_date: new Date().toISOString().split('T')[0],
        status: 'completed'
      });

      // Update invoice payment records
      const existingPayments = invoice.payment_records || [];
      const updatedPayments = [...existingPayments, {
        amount,
        payment_method: paymentMethod,
        paid_date: new Date().toISOString().split('T')[0],
        notes: notes || ''
      }];

      const totalPaid = updatedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const isFullyPaid = totalPaid >= invoice.amount;

      await base44.entities.Invoice.update(invoice.id, {
        payment_records: updatedPayments,
        is_open: !isFullyPaid,
        status: isFullyPaid ? 'paid' : invoice.status
      });

      toast.success(`€${amount.toFixed(2)} u regjistrua`);
      onPaymentAdded();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Gabim: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPaymentMethod('cash');
    setAmount(invoice?.amount || 0);
    setNotes('');
    setCardNumber('');
    setCardHolder('');
    setExpiryMonth('');
    setExpiryYear('');
    setCvv('');
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Regjistro Pagesën</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Method */}
          <div>
            <Label className="mb-3 block">Metoda e Pagesës</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-lg border-2 transition flex flex-col items-center gap-2 ${
                  paymentMethod === 'cash'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span className="text-xs font-medium">Para</span>
              </button>
              <button
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`p-3 rounded-lg border-2 transition flex flex-col items-center gap-2 ${
                  paymentMethod === 'bank_transfer'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span className="text-xs font-medium">Transferi</span>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-lg border-2 transition flex flex-col items-center gap-2 ${
                  paymentMethod === 'card'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs font-medium">Kartë</span>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <Label>Shuma (€)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="mt-1.5"
              step="0.01"
              min="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Në pritje: €{Math.max(0, invoice?.amount - (invoice?.payment_records?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0)).toFixed(2)}
            </p>
          </div>

          {/* Card Details */}
          {paymentMethod === 'card' && (
            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-border">
              <div>
                <Label className="text-xs">Numri i Kartës</Label>
                <Input
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength="19"
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Emri në Kartë</Label>
                <Input
                  placeholder="JOHN DOE"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                  className="mt-1 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Muaji</Label>
                  <Input
                    placeholder="MM"
                    value={expiryMonth}
                    onChange={(e) => setExpiryMonth(e.target.value.slice(0, 2))}
                    maxLength="2"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Viti</Label>
                  <Input
                    placeholder="YY"
                    value={expiryYear}
                    onChange={(e) => setExpiryYear(e.target.value.slice(0, 2))}
                    maxLength="2"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">CVV</Label>
                  <Input
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.slice(0, 4))}
                    maxLength="4"
                    className="mt-1 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>Shënime (Opsionale)</Label>
            <Textarea
              placeholder="Ndonjë informacion shtesë për këtë pagesë..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anulo
          </Button>
          <Button onClick={handleAddPayment} disabled={loading} className="gap-2">
            {loading ? 'Duke regjistruar...' : 'Regjistro Pagesën'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}