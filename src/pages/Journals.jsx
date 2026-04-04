import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, BookOpen, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const JOURNAL_TYPES = [
  { value: 'sale', label: 'Shitje', label_en: 'Sales', color: 'bg-green-100 text-green-800' },
  { value: 'purchase', label: 'Blerje', label_en: 'Purchase', color: 'bg-orange-100 text-orange-800' },
  { value: 'bank', label: 'Bankë', label_en: 'Bank', color: 'bg-blue-100 text-blue-800' },
  { value: 'cash', label: 'Arkë', label_en: 'Cash', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'general', label: 'Të Tjera', label_en: 'Miscellaneous', color: 'bg-gray-100 text-gray-800' },
];

const typeMap = Object.fromEntries(JOURNAL_TYPES.map(t => [t.value, t]));

export default function Journals() {
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', name_en: '', type: 'general', sequence_prefix: '', default_account_id: '', sequence: 10 });
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jRes, aRes] = await Promise.all([
        fetch('/api/accounting/journals', { credentials: 'include' }),
        fetch('/api/accounting/accounts-with-balances', { credentials: 'include' }),
      ]);
      const [jData, aData] = await Promise.all([jRes.json(), aRes.json()]);
      setJournals(Array.isArray(jData) ? jData : []);
      setAccounts(Array.isArray(aData) ? aData : []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', name_en: '', type: 'general', sequence_prefix: '', default_account_id: '', sequence: 10 });
    setDialogOpen(true);
  };

  const openEdit = (j) => {
    setEditing(j);
    setForm({
      name: j.name,
      name_en: j.name_en || '',
      type: j.type || 'general',
      sequence_prefix: j.sequence_prefix || '',
      default_account_id: j.default_account_id || '',
      sequence: j.sequence || 10,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.sequence_prefix) {
      toast({ title: 'Gabim', description: 'Emri dhe prefiksi janë të detyrueshme', variant: 'destructive' });
      return;
    }
    try {
      const body = {
        name: form.name,
        name_en: form.name_en || null,
        type: form.type,
        sequence_prefix: form.sequence_prefix.toUpperCase(),
        default_account_id: form.default_account_id || null,
        sequence: parseInt(form.sequence) || 10,
      };
      const url = editing ? `/api/accounting/journals/${editing.id}` : '/api/accounting/journals';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast({ title: editing ? 'Libri u përditësua' : 'Libri u krijua' });
      setDialogOpen(false);
      await loadData();
    } catch (err) {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('A jeni i sigurt që doni ta fshini këtë libër?')) return;
    try {
      await fetch(`/api/accounting/journals/${id}`, { method: 'DELETE', credentials: 'include' });
      toast({ title: 'Libri u fshi' });
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
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Librat Kontabël</h1>
          <p className="text-sm text-muted-foreground mt-1">Menaxho librat kontabël (Shitje, Blerje, Bankë, Arkë)</p>
        </div>
        <Button onClick={openCreate} className="gap-2" data-testid="button-add-journal">
          <Plus className="w-4 h-4" /> Shto Libër
        </Button>
      </div>

      {journals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-12 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nuk ka libra kontabël. Filloni duke shtuar llogaritë default.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left py-3 px-6 font-semibold text-muted-foreground">Libri</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Lloji</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground w-28">Prefiksi</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Llogaria Default</th>
                <th className="text-right py-3 px-6 font-semibold text-muted-foreground w-24">Veprime</th>
              </tr>
            </thead>
            <tbody>
              {journals.map((j, i) => {
                const typeInfo = typeMap[j.type] || typeMap['general'];
                return (
                  <tr key={j.id} className={`${i % 2 === 0 ? 'bg-muted/10' : ''} hover:bg-muted/30`} data-testid={`row-journal-${j.id}`}>
                    <td className="py-3 px-6 font-semibold">{j.name}{j.name_en ? <span className="font-normal text-muted-foreground ml-2 text-xs">({j.name_en})</span> : null}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${typeInfo.color}`}>{typeInfo.label}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-xs">{j.sequence_prefix}-XXXXX</td>
                    <td className="py-3 px-4 text-muted-foreground text-sm">
                      {j.default_account_code ? `${j.default_account_code} – ${j.default_account_name}` : '—'}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(j)} className="p-1 hover:bg-muted rounded" data-testid={`button-edit-${j.id}`}><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(j.id)} className="p-1 hover:bg-red-50 text-red-500 rounded" data-testid={`button-delete-${j.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Përditëso Librin' : 'Shto Libër të Ri'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Emri (Shqip)</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="p.sh. Libri i Shitjes" data-testid="input-journal-name" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Emri (Anglisht)</Label>
                <Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} placeholder="Sales Journal" data-testid="input-journal-name-en" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Lloji</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger data-testid="select-journal-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOURNAL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Prefiksi i Numërtimit</Label>
                <Input
                  value={form.sequence_prefix}
                  onChange={e => setForm(f => ({ ...f, sequence_prefix: e.target.value.toUpperCase() }))}
                  placeholder="p.sh. INV"
                  maxLength={10}
                  data-testid="input-sequence-prefix"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Llogaria Default</Label>
              <Select value={form.default_account_id || 'none'} onValueChange={v => setForm(f => ({ ...f, default_account_id: v === 'none' ? '' : v }))}>
                <SelectTrigger data-testid="select-default-account"><SelectValue placeholder="Zgjidh llogarinë (opsionale)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Pa llogari default —</SelectItem>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} – {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.sequence_prefix} data-testid="button-save-journal">
              {editing ? 'Përditëso' : 'Ruaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
