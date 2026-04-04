import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, BookOpen, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Aktive', color: 'bg-blue-100 text-blue-800' },
  { value: 'liability', label: 'Detyrime', color: 'bg-red-100 text-red-800' },
  { value: 'equity', label: 'Kapital', color: 'bg-purple-100 text-purple-800' },
  { value: 'revenue', label: 'Të Ardhura', color: 'bg-green-100 text-green-800' },
  { value: 'expense', label: 'Shpenzime', color: 'bg-orange-100 text-orange-800' },
];

const typeColorMap = Object.fromEntries(ACCOUNT_TYPES.map(t => [t.value, t.color]));
const typeLabelMap = Object.fromEntries(ACCOUNT_TYPES.map(t => [t.value, t.label]));

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedTypes, setExpandedTypes] = useState(['asset', 'liability', 'equity', 'revenue', 'expense']);
  const [form, setForm] = useState({ code: '', name: '', name_en: '', account_type: 'asset', normal_balance: 'debit', description: '' });
  const { toast } = useToast();

  useEffect(() => { loadAccounts(); }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.ChartOfAccount.list('code', 1000);
      setAccounts(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const seedAccounts = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/accounting/seed-accounts', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      toast({ title: 'Plani kontabël u krijua', description: `${data.count || 0} llogari u shtuan` });
      await loadAccounts();
    } catch (err) {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    }
    setSeeding(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ code: '', name: '', name_en: '', account_type: 'asset', normal_balance: 'debit', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (acc) => {
    setEditing(acc);
    setForm({ code: acc.code, name: acc.name, name_en: acc.name_en || '', account_type: acc.account_type, normal_balance: acc.normal_balance, description: acc.description || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await base44.entities.ChartOfAccount.update(editing.id, form);
        toast({ title: 'Llogaria u përditësua' });
      } else {
        await base44.entities.ChartOfAccount.create(form);
        toast({ title: 'Llogaria u krijua' });
      }
      setDialogOpen(false);
      await loadAccounts();
    } catch (err) {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('A jeni i sigurt që doni ta fshini këtë llogari?')) return;
    try {
      await base44.entities.ChartOfAccount.delete(id);
      toast({ title: 'Llogaria u fshi' });
      await loadAccounts();
    } catch (err) {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    }
  };

  const toggleType = (type) => {
    setExpandedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const groupedAccounts = ACCOUNT_TYPES.map(type => ({
    ...type,
    accounts: accounts.filter(a => a.account_type === type.value).sort((a, b) => a.code.localeCompare(b.code)),
  }));

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Kontabilitet</p>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Plani Kontabël</h1>
          <p className="text-sm text-muted-foreground mt-1">Menaxho llogaritë kontabël të biznesit</p>
        </div>
        <div className="flex gap-2">
          {accounts.length === 0 && (
            <Button onClick={seedAccounts} disabled={seeding} variant="outline" className="gap-2" data-testid="button-seed-accounts">
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
              Krijo Llogaritë Default
            </Button>
          )}
          <Button onClick={openCreate} className="gap-2" data-testid="button-add-account">
            <Plus className="w-4 h-4" /> Shto Llogari
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {groupedAccounts.map(group => (
          <div key={group.value} className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleType(group.value)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
              data-testid={`button-toggle-${group.value}`}
            >
              <div className="flex items-center gap-3">
                {expandedTypes.includes(group.value) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${group.color}`}>{group.label}</span>
                <span className="text-sm text-muted-foreground">({group.accounts.length} llogari)</span>
              </div>
            </button>
            {expandedTypes.includes(group.value) && group.accounts.length > 0 && (
              <div className="border-t border-border/40">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20">
                      <th className="text-left py-2.5 px-6 font-semibold text-muted-foreground w-24">Kodi</th>
                      <th className="text-left py-2.5 px-4 font-semibold text-muted-foreground">Emri</th>
                      <th className="text-left py-2.5 px-4 font-semibold text-muted-foreground">Emri (EN)</th>
                      <th className="text-left py-2.5 px-4 font-semibold text-muted-foreground w-32">Bilanci Normal</th>
                      <th className="text-right py-2.5 px-6 font-semibold text-muted-foreground w-24">Veprime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.accounts.map((acc, i) => (
                      <tr key={acc.id} className={`${i % 2 === 0 ? 'bg-muted/10' : ''} hover:bg-muted/30`} data-testid={`row-account-${acc.id}`}>
                        <td className="py-2.5 px-6 font-mono text-sm font-semibold">{acc.code}</td>
                        <td className="py-2.5 px-4">{acc.name}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">{acc.name_en || '-'}</td>
                        <td className="py-2.5 px-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${acc.normal_balance === 'debit' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                            {acc.normal_balance === 'debit' ? 'Debit' : 'Kredit'}
                          </span>
                        </td>
                        <td className="py-2.5 px-6 text-right">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => openEdit(acc)} className="p-1 hover:bg-muted rounded" data-testid={`button-edit-${acc.id}`}><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDelete(acc.id)} className="p-1 hover:bg-red-50 text-red-500 rounded" data-testid={`button-delete-${acc.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Përditëso Llogarinë' : 'Shto Llogari të Re'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Kodi</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="p.sh. 1100" data-testid="input-account-code" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Lloji</Label>
                <Select value={form.account_type} onValueChange={v => setForm(f => ({ ...f, account_type: v, normal_balance: ['asset', 'expense'].includes(v) ? 'debit' : 'credit' }))}>
                  <SelectTrigger data-testid="select-account-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Emri (Shqip)</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-account-name" />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Emri (Anglisht)</Label>
              <Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} data-testid="input-account-name-en" />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Bilanci Normal</Label>
              <Select value={form.normal_balance} onValueChange={v => setForm(f => ({ ...f, normal_balance: v }))}>
                <SelectTrigger data-testid="select-normal-balance"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Debit</SelectItem>
                  <SelectItem value="credit">Kredit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Përshkrimi</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} data-testid="input-account-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSave} disabled={!form.code || !form.name} data-testid="button-save-account">
              {editing ? 'Përditëso' : 'Ruaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
