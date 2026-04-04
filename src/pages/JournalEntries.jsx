import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Eye, Trash2, BookOpen, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import { Card } from "@/components/ui/card";

export default function JournalEntries() {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewEntry, setViewEntry] = useState(null);
  const [viewLines, setViewLines] = useState([]);
  const [viewOpen, setViewOpen] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    entry_date: moment().format('YYYY-MM-DD'),
    description: '',
    lines: [
      { account_id: '', account_code: '', account_name: '', debit: '', credit: '', description: '' },
      { account_id: '', account_code: '', account_name: '', debit: '', credit: '', description: '' },
    ],
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ent, acc] = await Promise.all([
        base44.entities.JournalEntry.list('-entry_date', 500),
        base44.entities.ChartOfAccount.list('code', 1000),
      ]);
      setEntries(ent);
      setAccounts(acc);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setForm({
      entry_date: moment().format('YYYY-MM-DD'),
      description: '',
      lines: [
        { account_id: '', account_code: '', account_name: '', debit: '', credit: '', description: '' },
        { account_id: '', account_code: '', account_name: '', debit: '', credit: '', description: '' },
      ],
    });
    setDialogOpen(true);
  };

  const addLine = () => {
    setForm(f => ({
      ...f,
      lines: [...f.lines, { account_id: '', account_code: '', account_name: '', debit: '', credit: '', description: '' }],
    }));
  };

  const removeLine = (idx) => {
    if (form.lines.length <= 2) return;
    setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  };

  const updateLine = (idx, field, value) => {
    setForm(f => {
      const lines = [...f.lines];
      lines[idx] = { ...lines[idx], [field]: value };
      if (field === 'account_id') {
        const acc = accounts.find(a => a.id === value);
        if (acc) {
          lines[idx].account_code = acc.code;
          lines[idx].account_name = acc.name;
        }
      }
      return { ...f, lines };
    });
  };

  const totalDebit = form.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSave = async () => {
    if (!isBalanced) {
      toast({ title: 'Gabim', description: 'Debiti duhet të jetë i barabartë me Kreditin', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch('/api/accounting/journal-entry', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: form.entry_date,
          description: form.description,
          lines: form.lines.filter(l => l.account_id && (parseFloat(l.debit) || parseFloat(l.credit))),
          status: 'posted',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast({ title: 'Regjistrimi u krijua me sukses' });
      setDialogOpen(false);
      await loadData();
    } catch (err) {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    }
  };

  const viewEntryDetails = async (entry) => {
    setViewEntry(entry);
    try {
      const lines = await base44.entities.JournalLine.filter({ journal_entry_id: entry.id });
      setViewLines(lines);
    } catch (err) {
      setViewLines([]);
    }
    setViewOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('A jeni i sigurt?')) return;
    try {
      await base44.entities.JournalEntry.delete(id);
      toast({ title: 'Regjistrimi u fshi' });
      await loadData();
    } catch (err) {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Kontabilitet</p>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Regjistrime Kontabël</h1>
          <p className="text-sm text-muted-foreground mt-1">Krijo dhe menaxho regjistrimet kontabël (journal entries)</p>
        </div>
        <Button onClick={openCreate} className="gap-2" data-testid="button-create-entry">
          <Plus className="w-4 h-4" /> Regjistrim i Ri
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Total Regjistrime</p>
          <p className="text-2xl font-bold mt-1" data-testid="text-total-entries">{entries.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Të Postuara</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{entries.filter(e => e.status === 'posted').length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Draft</p>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{entries.filter(e => e.status === 'draft').length}</p>
        </Card>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left py-3 px-6 font-semibold text-muted-foreground">Nr.</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Data</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Përshkrimi</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Referenca</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Debit</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Kredit</th>
              <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Statusi</th>
              <th className="text-right py-3 px-6 font-semibold text-muted-foreground">Veprime</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-12 text-muted-foreground">Nuk ka regjistrime kontabël</td></tr>
            ) : entries.map((entry, i) => (
              <tr key={entry.id} className={`${i % 2 === 0 ? 'bg-muted/10' : ''} hover:bg-muted/30`} data-testid={`row-entry-${entry.id}`}>
                <td className="py-3 px-6 font-mono text-sm font-semibold">{entry.entry_number}</td>
                <td className="py-3 px-4">{moment(entry.entry_date).format('DD/MM/YYYY')}</td>
                <td className="py-3 px-4 max-w-[200px] truncate">{entry.description || '-'}</td>
                <td className="py-3 px-4 text-muted-foreground">{entry.reference_number || '-'}</td>
                <td className="py-3 px-4 text-right font-mono">{parseFloat(entry.total_debit || 0).toFixed(2)}</td>
                <td className="py-3 px-4 text-right font-mono">{parseFloat(entry.total_credit || 0).toFixed(2)}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${entry.status === 'posted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {entry.status === 'posted' ? 'Postuar' : 'Draft'}
                  </span>
                </td>
                <td className="py-3 px-6 text-right">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => viewEntryDetails(entry)} className="p-1 hover:bg-muted rounded" data-testid={`button-view-${entry.id}`}><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(entry.id)} className="p-1 hover:bg-red-50 text-red-500 rounded" data-testid={`button-delete-${entry.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Regjistrim i Ri Kontabël</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Data</Label>
                <Input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} data-testid="input-entry-date" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Përshkrimi</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Përshkrim..." data-testid="input-entry-description" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs font-semibold">Linjat e Regjistrimit</Label>
                <Button variant="outline" size="sm" onClick={addLine} className="gap-1" data-testid="button-add-line"><Plus className="w-3 h-3" /> Shto Linjë</Button>
              </div>
              <div className="space-y-2">
                {form.lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-lg">
                    <div className="col-span-5">
                      <Select value={line.account_id} onValueChange={v => updateLine(idx, 'account_id', v)}>
                        <SelectTrigger className="text-xs" data-testid={`select-line-account-${idx}`}><SelectValue placeholder="Zgjidh llogarinë" /></SelectTrigger>
                        <SelectContent>
                          {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="Debit" value={line.debit} onChange={e => updateLine(idx, 'debit', e.target.value)} className="text-xs" data-testid={`input-line-debit-${idx}`} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="Kredit" value={line.credit} onChange={e => updateLine(idx, 'credit', e.target.value)} className="text-xs" data-testid={`input-line-credit-${idx}`} />
                    </div>
                    <div className="col-span-2">
                      <Input placeholder="Shënim" value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} className="text-xs" />
                    </div>
                    <div className="col-span-1 text-center">
                      {form.lines.length > 2 && (
                        <button onClick={() => removeLine(idx)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-6 mt-3 p-3 bg-muted/30 rounded-lg">
                <div className="text-sm"><span className="text-muted-foreground">Total Debit:</span> <span className="font-bold">{totalDebit.toFixed(2)}</span></div>
                <div className="text-sm"><span className="text-muted-foreground">Total Kredit:</span> <span className="font-bold">{totalCredit.toFixed(2)}</span></div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Diferenca:</span>{' '}
                  <span className={`font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>{(totalDebit - totalCredit).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSave} disabled={!isBalanced || totalDebit === 0} data-testid="button-save-entry">Posto Regjistrimin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Regjistrimi {viewEntry?.entry_number}</DialogTitle>
          </DialogHeader>
          {viewEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Data:</span> {moment(viewEntry.entry_date).format('DD/MM/YYYY')}</div>
                <div><span className="text-muted-foreground">Statusi:</span> {viewEntry.status === 'posted' ? 'Postuar' : 'Draft'}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Përshkrimi:</span> {viewEntry.description || '-'}</div>
              </div>
              <table className="w-full text-sm border-t">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="text-left py-2 px-3">Llogaria</th>
                    <th className="text-right py-2 px-3">Debit</th>
                    <th className="text-right py-2 px-3">Kredit</th>
                  </tr>
                </thead>
                <tbody>
                  {viewLines.map(line => (
                    <tr key={line.id} className="border-b border-border/30">
                      <td className="py-2 px-3">{line.account_code} - {line.account_name}</td>
                      <td className="py-2 px-3 text-right font-mono">{parseFloat(line.debit) > 0 ? parseFloat(line.debit).toFixed(2) : '-'}</td>
                      <td className="py-2 px-3 text-right font-mono">{parseFloat(line.credit) > 0 ? parseFloat(line.credit).toFixed(2) : '-'}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-muted/30">
                    <td className="py-2 px-3">Totali</td>
                    <td className="py-2 px-3 text-right font-mono">{parseFloat(viewEntry.total_debit || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-mono">{parseFloat(viewEntry.total_credit || 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
