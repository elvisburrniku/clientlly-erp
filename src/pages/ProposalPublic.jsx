import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Check, X, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProposalPublic() {
  const { token } = useParams();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [responding, setResponding] = useState(false);
  const [responded, setResponded] = useState(false);

  useEffect(() => {
    loadProposal();
  }, [token]);

  const loadProposal = async () => {
    try {
      const res = await fetch(`/api/proposals/public/${token}`);
      if (!res.ok) throw new Error('Propozimi nuk u gjet');
      const data = await res.json();
      setProposal(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (action) => {
    setResponding(true);
    try {
      const res = await fetch(`/api/proposals/public/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason: rejectionReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error');
      }
      setResponded(true);
      setRejectDialog(false);
      loadProposal();
    } catch (err) {
      alert(err.message);
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h2 className="text-xl font-bold mb-2">Propozimi nuk u gjet</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const p = proposal;
  const themeColor = p.color_theme || '#4338ca';
  const isRespondable = p.status === 'sent' || p.status === 'viewed';
  const items = p.items || [];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl shadow-lg overflow-hidden bg-white">
          <div className="px-8 py-6" style={{ backgroundColor: themeColor }}>
            <div className="flex items-center justify-between text-white">
              <div>
                <h1 className="text-2xl font-bold">PROPOZIM</h1>
                <p className="text-white/80 text-sm mt-1">Nr: {p.proposal_number}</p>
              </div>
              <div className="text-right text-sm text-white/80">
                <p>Data: {new Date(p.created_at).toLocaleDateString('sq-AL')}</p>
                {p.valid_until && <p>Vlefshme deri: {new Date(p.valid_until).toLocaleDateString('sq-AL')}</p>}
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {p.status === 'accepted' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm font-medium text-green-700">Ky propozim është pranuar</p>
              </div>
            )}
            {p.status === 'rejected' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-700">Ky propozim është refuzuar</p>
                  {p.rejection_reason && <p className="text-xs text-red-600 mt-1">{p.rejection_reason}</p>}
                </div>
              </div>
            )}

            {p.title && <h2 className="text-xl font-bold" data-testid="text-proposal-title">{p.title}</h2>}

            {p.description && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">Përshkrimi</h3>
                <p className="text-sm whitespace-pre-wrap" data-testid="text-proposal-description">{p.description}</p>
              </div>
            )}

            {items.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Artikuj / Shërbime</h3>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: themeColor + '15' }}>
                        <th className="text-left px-4 py-2 font-semibold">Përshkrimi</th>
                        <th className="text-center px-4 py-2 font-semibold">Sasia</th>
                        <th className="text-right px-4 py-2 font-semibold">Çmimi</th>
                        <th className="text-right px-4 py-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-4 py-2" data-testid={`text-item-name-${idx}`}>{item.name}</td>
                          <td className="px-4 py-2 text-center">{item.quantity} {item.unit || ''}</td>
                          <td className="px-4 py-2 text-right">€{(item.price || 0).toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-medium">€{((item.price || 0) * (item.quantity || 0)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-right space-y-1 text-sm">
                  <p>Subtotal: <strong>€{(p.subtotal || 0).toFixed(2)}</strong></p>
                  {p.discount_amount > 0 && <p>Zbritje: <strong>-€{(p.discount_amount || 0).toFixed(2)}</strong></p>}
                  <p>TVSH: <strong>€{(p.tax_amount || 0).toFixed(2)}</strong></p>
                  <p className="text-lg font-bold" style={{ color: themeColor }} data-testid="text-proposal-total">Total: €{(p.total || 0).toFixed(2)}</p>
                </div>
              </div>
            )}

            {p.terms && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">Kushtet</h3>
                <p className="text-sm whitespace-pre-wrap bg-slate-50 rounded-lg p-4">{p.terms}</p>
              </div>
            )}

            {p.notes && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">Shënime</h3>
                <p className="text-sm whitespace-pre-wrap">{p.notes}</p>
              </div>
            )}

            {isRespondable && !responded && (
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={() => handleRespond('accept')} disabled={responding} className="flex-1 gap-2" style={{ backgroundColor: themeColor }} data-testid="button-accept-proposal">
                  <Check className="w-4 h-4" /> Prano Propozimin
                </Button>
                <Button variant="outline" onClick={() => setRejectDialog(true)} disabled={responding} className="flex-1 gap-2 text-destructive border-destructive/30" data-testid="button-reject-proposal">
                  <X className="w-4 h-4" /> Refuzo
                </Button>
              </div>
            )}

            {responded && (
              <div className="text-center py-4 border-t">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="font-medium">Faleminderit për përgjigjen tuaj!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuzo Propozimin</DialogTitle>
          </DialogHeader>
          <div>
            <p className="text-sm text-muted-foreground mb-3">Ju lutem jepni arsyen e refuzimit (opsionale):</p>
            <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3} placeholder="Arsyeja e refuzimit..." data-testid="input-rejection-reason" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>Anulo</Button>
            <Button variant="destructive" onClick={() => handleRespond('reject')} disabled={responding} data-testid="button-confirm-reject">
              {responding ? 'Duke dërguar...' : 'Konfirmo Refuzimin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
