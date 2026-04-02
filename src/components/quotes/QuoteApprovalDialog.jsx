import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useState } from 'react';

export default function QuoteApprovalDialog({ open, onOpenChange, quote, onApprovalChange }) {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      // Update quote status
      await base44.entities.Quote.update(quote.id, { status: 'accepted' });

      // Create invoice from quote
      const invoice = {
        invoice_number: `INV-${Date.now().toString(36).toUpperCase()}`,
        invoice_type: 'standard',
        template: quote.template || 'classic',
        client_name: quote.client_name,
        client_email: quote.client_email,
        client_phone: quote.client_phone,
        client_nipt: quote.client_nipt,
        client_address: quote.client_address,
        items: quote.items || [],
        subtotal: quote.subtotal,
        discount_type: quote.discount_type,
        discount_value: quote.discount_value,
        discount_amount: quote.discount_amount,
        vat_amount: quote.vat_amount,
        amount: quote.amount,
        status: 'sent',
        description: quote.description,
      };

      const newInvoice = await base44.entities.Invoice.create(invoice);

      // Update quote with invoice reference
      await base44.entities.Quote.update(quote.id, { 
        converted_to_invoice_id: newInvoice.id,
        status: 'converted'
      });

      onApprovalChange();
      onOpenChange(false);
    } catch (error) {
      console.error('Error approving quote:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await base44.entities.Quote.update(quote.id, { status: 'rejected' });
      onApprovalChange();
      onOpenChange(false);
    } catch (error) {
      console.error('Error rejecting quote:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Përgjigje ndaj Ofertës</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Oferta <strong>{quote?.quote_number}</strong> nga <strong>{quote?.client_name}</strong>
          </p>
          <p className="text-sm">
            Shuma totale: <strong className="text-primary">€{(quote?.amount || 0).toFixed(2)}</strong>
          </p>
        </div>

        <DialogFooter className="gap-2 pt-4">
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={loading}
            className="gap-2"
          >
            <XCircle className="w-4 h-4" /> Refuzo
          </Button>
          <Button
            onClick={handleApprove}
            disabled={loading}
            className="gap-2"
          >
            <CheckCircle className="w-4 h-4" /> Prano & Krijo Faturën
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}