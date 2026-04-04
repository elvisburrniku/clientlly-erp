import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Eye, Trash2, BookOpen, Filter } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import { Card } from "@/components/ui/card";

const JOURNAL_TYPE_COLORS = {
  sale: 'bg-green-100 text-green-700',
  purchase: 'bg-orange-100 text-orange-700',
  bank: 'bg-blue-100 text-blue-700',
  cash: 'bg-yellow-100 text-yellow-700',
  general: 'bg-gray-100 text-gray-700',
};

export default function JournalEntries() {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewEntry, setViewEntry] = useState(null);
  const [viewLines, setViewLines] = useState([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [createdEntryNumber, setCreatedEntryNumber] = useState(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    entry_date: moment().format('YYYY-MM-DD'),
    description: '',
    status: 'posted',
    journal_id: '',
    lines: [
      { account_id: '', account_code: '', account_name: '', debit: '', credit: '', description: '' },
      { account_id: '', account_code: '', account_name: '', debit: '', credit: '', description: '' },
    ],
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [entRes, accRes, jRes] = await Promise.all([
        fetch('/api/accounting/journal-entries', { credentials: 'include' }),
        fetch('/api/accounting/accounts-with-balances', { credentials: 'include' }),
        fetch('/api/accounting/journals', { credentials: 'include' }),
      ]);
      const [entData, accData, jData] = await Promise.all([entRes.json(), accRes.json(), jRes.json()]);
      setEntries(Array.isArray(entData) ? entData : []);
      setAccounts(Array.isArray(accData) ? accData : []);
      setJournals(Array.isArray(jData) ? jData : []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setCreatedEntryNumber(null);
    setForm({
      entry_date: moment().format('YYYY-MM-DD'),
      description: '',
      status: 'posted',
      journal_id: journals.length > 0 ? journals.find(j => j.type === 'general')?.id || journals[0].id : '',
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
    const validLines = form.lines.filter(l => l.account_id && (parseFloat(l.debit) || parseFloat(l.credit)));
    if (validLines.length < 2) {
      toast({ title: 'Gabim', description: 'Nevojiten të paktën 2 linja të vlefshme', variant: 'destructive' });
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
          lines: validLines,
          status: form.status || 'posted',
          journal_id: form.journal_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }
      setCreatedEntryNumber(data.entry_number);
      toast({ title: `Regjistrimi u krijua: ${data.entry_number}` });
      await loadData();
    } catch (err) {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    }
  };

  const viewEntryDetails = async (entry) => {
    setViewEntry(entry);
    try {
      const res = await fetch(`/api/accounting/journal-entries/${entry.id}/lines`, { credentials: 'include' });
      const data = await res.json();
      setViewLines(Array.isArray(data) ? data : []);
    } catch (err) {
      setViewLines([]);
    }
    setViewOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('A jeni i sigurt?')) return;
    try {
      await fetch(`/api/entities/JournalEntry/${id}`, { method: 'DELETE', credentials: 'include' });
      toast({ title: 'Regjistrimi u fshi' });
      await loadData();
    } catch (err) {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    }
  };

  const journalMap = Object.fromEntries(journals.map(j => [j.id, j]));

  const JOURNAL_TYPE_LABELS = {
    sale: 'Shitje',
    purchase: 'Blerje',
    bank: 'Bankë',
    cash: 'Arkë',
    general: 'Ndryshime',
  };

  const presentTypes = [...new Set(journals.map(j => j.type))].filter(Boolean);

  const filteredEntries = filterType === 'all'
    ? entries
    : entries.filter(e => {
        const journal = journalMap[e.journal_id];
        return journal?.type === filterType;
      });

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Kontabilitet</p>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Regjistrime Kontabël</h1>
          <p className="text-sm text-muted-foreground mt-1">Krijo dhe menaxho regjistrimet kontabël</p>
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

      <div className="flex items-center gap-3 flex-wrap" data-testid="journal-filter-bar">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Filtro sipas tipit:</span>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-colors ${filterType === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-border text-muted-foreground hover:bg-muted/30'}`}
            data-testid="filter-all"
          >
            Të Gjitha ({entries.length})
          </button>
          {presentTypes.map(type => {
            const count = entries.filter(e => journalMap[e.journal_id]?.type === type).length;
            const colorClass = JOURNAL_TYPE_COLORS[type] || JOURNAL_TYPE_COLORS.general;
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-colors ${filterType === type ? 'bg-primary text-primary-foreground border-primary' : `${colorClass} border-transparent hover:opacity-80`}`}
                data-testid={`filter-type-${type}`}
              >
                {JOURNAL_TYPE_LABELS[type] || type} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left py-3 px-6 font-semibold text-muted-foreground">Nr.</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Libri</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Data</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Përshkrimi</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Debit</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Kredit</th>
              <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Statusi</th>
              <th className="text-right py-3 px-6 font-semibold text-muted-foreground">Veprime</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-12 text-muted-foreground">Nuk ka regjistrime kontabël</td></tr>
            ) : filteredEntries.map((entry, i) => {
              const journal = entry.journal_id ? journalMap[entry.journal_id] : null;
              const jColorClass = journal ? (JOURNAL_TYPE_COLORS[journal.type] || JOURNAL_TYPE_COLORS.general) : 'bg-gray-100 text-gray-600';
              return (
                <tr key={entry.id} className={`${i % 2 === 0 ? 'bg-muted/10' : ''} hover:bg-muted/30`} data-testid={`row-entry-${entry.id}`}>
                  <td className="py-3 px-6 font-mono text-sm font-semibold">{entry.entry_number}</td>
                  <td className="py-3 px-4">
                    {journal ? (
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${jColorClass}`}>{journal.sequence_prefix}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">{moment(entry.entry_date).format('DD/MM/YYYY')}</td>
                  <td className="py-3 px-4 max-w-[200px] truncate">{entry.description || '-'}</td>
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
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setCreatedEntryNumber(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Regjistrim i Ri Kontabël</DialogTitle>
          </DialogHeader>
          {createdEntryNumber && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-0.5">Numri i Regjistrimit (vetëm lexim)</p>
                <p className="text-lg font-mono font-bold text-green-800" data-testid="text-created-entry-number">{createdEntryNumber}</p>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Data</Label>
                <Input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} data-testid="input-entry-date" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Libri Kontabël</Label>
                <Select value={form.journal_id || 'none'} onValueChange={v => setForm(f => ({ ...f, journal_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger data-testid="select-entry-journal"><SelectValue placeholder="Zgjidh librin..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Pa libër —</SelectItem>
                    {journals.map(j => <SelectItem key={j.id} value={j.id}>{j.sequence_prefix} – {j.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Statusi</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger data-testid="select-entry-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="posted">Postuar</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Përshkrimi</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Përshkrim..." data-testid="input-entry-description" />
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
                      <Select value={line.account_id || 'none'} onValueChange={v => updateLine(idx, 'account_id', v === 'none' ? '' : v)}>
                        <SelectTrigger className="text-xs" data-testid={`select-line-account-${idx}`}><SelectValue placeholder="Zgjidh llogarinë" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Zgjidh llogarinë —</SelectItem>
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
            <Button variant="outline" onClick={() => { setDialogOpen(false); setCreatedEntryNumber(null); }}>{createdEntryNumber ? 'Mbyll' : 'Anulo'}</Button>
            {!createdEntryNumber && (
              <Button onClick={handleSave} disabled={!isBalanced || totalDebit === 0} data-testid="button-save-entry">{form.status === 'draft' ? 'Ruaj si Draft' : 'Posto Regjistrimin'}</Button>
            )}
            {createdEntryNumber && (
              <Button onClick={() => { setCreatedEntryNumber(null); openCreate(); }} data-testid="button-new-after-save">Regjistrim i Ri</Button>
            )}
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
                {viewEntry.journal_id && journalMap[viewEntry.journal_id] && (
                  <div><span className="text-muted-foreground">Libri:</span> {journalMap[viewEntry.journal_id].name}</div>
                )}
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
