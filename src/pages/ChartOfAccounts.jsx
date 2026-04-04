import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, BookOpen, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Aktive', color: 'bg-blue-100 text-blue-800' },
  { value: 'liability', label: 'Detyrime', color: 'bg-red-100 text-red-800' },
  { value: 'equity', label: 'Kapital', color: 'bg-purple-100 text-purple-800' },
  { value: 'revenue', label: 'Të Ardhura', color: 'bg-green-100 text-green-800' },
  { value: 'expense', label: 'Shpenzime', color: 'bg-orange-100 text-orange-800' },
];

const ACCOUNT_SUBTYPES = [
  { value: 'other', label: 'E Zakonshme' },
  { value: 'receivable', label: 'Arkëtueshme' },
  { value: 'payable', label: 'Pagueshme' },
  { value: 'liquidity', label: 'Likuiditeti' },
  { value: 'equity_unaffected', label: 'Kapital (Pandikuar)' },
];

const typeColorMap = Object.fromEntries(ACCOUNT_TYPES.map(t => [t.value, t.color]));
const subtypeLabelMap = Object.fromEntries(ACCOUNT_SUBTYPES.map(t => [t.value, t.label]));

function fmt(n) {
  const v = parseFloat(n) || 0;
  if (v === 0) return '';
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getBalance(acc) {
  const debit = parseFloat(acc.total_debit) || 0;
  const credit = parseFloat(acc.total_credit) || 0;
  if (acc.normal_balance === 'debit') return debit - credit;
  return credit - debit;
}

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [form, setForm] = useState({
    code: '', name: '', name_en: '', account_type: 'asset', normal_balance: 'debit',
    account_subtype: 'other', reconcile: false, description: '', account_group_id: '',
  });
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, grpRes] = await Promise.all([
        fetch('/api/accounting/accounts-with-balances', { credentials: 'include' }),
        fetch('/api/accounting/account-groups', { credentials: 'include' }),
      ]);
      const [accData, grpData] = await Promise.all([accRes.json(), grpRes.json()]);
      const accList = Array.isArray(accData) ? accData : [];
      const grpList = Array.isArray(grpData) ? grpData : [];
      setAccounts(accList);
      setGroups(grpList);

      // auto-expand all root groups
      const expanded = {};
      grpList.forEach(g => { if (!g.parent_id) expanded[g.id] = true; });
      setExpandedGroups(expanded);
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
      await loadData();
    } catch (err) {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    }
    setSeeding(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ code: '', name: '', name_en: '', account_type: 'asset', normal_balance: 'debit', account_subtype: 'other', reconcile: false, description: '', account_group_id: '' });
    setDialogOpen(true);
  };

  const openEdit = (acc) => {
    setEditing(acc);
    setForm({
      code: acc.code, name: acc.name, name_en: acc.name_en || '', account_type: acc.account_type,
      normal_balance: acc.normal_balance, account_subtype: acc.account_subtype || 'other',
      reconcile: acc.reconcile || false, description: acc.description || '',
      account_group_id: acc.account_group_id || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name) {
      toast({ title: 'Gabim', description: 'Kodi dhe emri janë të detyrueshme', variant: 'destructive' });
      return;
    }
    try {
      const body = {
        code: form.code, name: form.name, name_en: form.name_en || null,
        account_type: form.account_type, normal_balance: form.normal_balance,
        account_subtype: form.account_subtype, reconcile: form.reconcile,
        description: form.description || null,
        account_group_id: form.account_group_id || null,
      };
      const url = editing ? `/api/entities/ChartOfAccount/${editing.id}` : '/api/entities/ChartOfAccount';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || err.message); }
      toast({ title: editing ? 'Llogaria u përditësua' : 'Llogaria u krijua' });
      setDialogOpen(false);
      await loadData();
    } catch (err) {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('A jeni i sigurt që doni ta fshini këtë llogari?')) return;
    try {
      await fetch(`/api/entities/ChartOfAccount/${id}`, { method: 'DELETE', credentials: 'include' });
      toast({ title: 'Llogaria u fshi' });
      await loadData();
    } catch (err) {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    }
  };

  const toggleGroup = (gId) => setExpandedGroups(prev => ({ ...prev, [gId]: !prev[gId] }));

  // Hierarchical structure: root groups → child groups → accounts
  const rootGroups = groups.filter(g => !g.parent_id).sort((a, b) => a.sequence - b.sequence);
  const childGroups = groups.filter(g => g.parent_id);

  const getGroupAccounts = (groupId) => accounts.filter(a => a.account_group_id === groupId).sort((a, b) => a.code.localeCompare(b.code));
  const getChildGroups = (parentId) => childGroups.filter(g => g.parent_id === parentId).sort((a, b) => a.sequence - b.sequence);
  const ungroupedAccounts = accounts.filter(a => !a.account_group_id).sort((a, b) => a.code.localeCompare(b.code));

  // Compute group balance totals
  const getGroupTotal = (gId) => {
    const directAccs = getGroupAccounts(gId);
    const childGrps = getChildGroups(gId);
    let debit = 0, credit = 0;
    directAccs.forEach(a => { debit += parseFloat(a.total_debit) || 0; credit += parseFloat(a.total_credit) || 0; });
    childGrps.forEach(g => {
      const sub = getGroupTotal(g.id);
      debit += sub.debit;
      credit += sub.credit;
    });
    return { debit, credit };
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  const AccountRow = ({ acc, indent = 0 }) => {
    const balance = getBalance(acc);
    return (
      <tr className="hover:bg-muted/20 border-b border-border/20" data-testid={`row-account-${acc.id}`}>
        <td className="py-2 px-4 font-mono text-sm font-semibold" style={{ paddingLeft: `${16 + indent * 16}px` }}>{acc.code}</td>
        <td className="py-2 px-3 text-sm">{acc.name}</td>
        <td className="py-2 px-3 text-xs text-muted-foreground">{acc.name_en || '-'}</td>
        <td className="py-2 px-3 text-center">
          {acc.account_subtype && acc.account_subtype !== 'other' ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{subtypeLabelMap[acc.account_subtype] || acc.account_subtype}</span>
          ) : null}
        </td>
        <td className="py-2 px-3 text-center">
          {acc.reconcile ? <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">✓</span> : null}
        </td>
        <td className="py-2 px-3 text-right font-mono text-sm text-muted-foreground">{fmt(acc.total_debit) || '—'}</td>
        <td className="py-2 px-3 text-right font-mono text-sm text-muted-foreground">{fmt(acc.total_credit) || '—'}</td>
        <td className={`py-2 px-3 text-right font-mono text-sm font-semibold ${balance < 0 ? 'text-red-600' : balance > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
          {balance !== 0 ? fmt(Math.abs(balance)) : '—'}
        </td>
        <td className="py-2 px-3 text-right">
          <div className="flex gap-1 justify-end">
            <button onClick={() => openEdit(acc)} className="p-1 hover:bg-muted rounded" data-testid={`button-edit-${acc.id}`}><Edit2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => handleDelete(acc.id)} className="p-1 hover:bg-red-50 text-red-500 rounded" data-testid={`button-delete-${acc.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </td>
      </tr>
    );
  };

  const GroupSection = ({ group, depth = 0 }) => {
    const childGrps = getChildGroups(group.id);
    const directAccs = getGroupAccounts(group.id);
    const hasContent = childGrps.length > 0 || directAccs.length > 0;
    const isExpanded = expandedGroups[group.id];
    const totals = getGroupTotal(group.id);

    return (
      <>
        <tr
          className={`border-b border-border/40 cursor-pointer ${depth === 0 ? 'bg-muted/40 hover:bg-muted/60' : 'bg-muted/20 hover:bg-muted/30'}`}
          onClick={() => toggleGroup(group.id)}
          data-testid={`row-group-${group.id}`}
        >
          <td className="py-2 px-4 font-mono text-xs text-muted-foreground" style={{ paddingLeft: `${16 + depth * 16}px` }}>
            {group.code_prefix_start}–{group.code_prefix_end && group.code_prefix_end !== group.code_prefix_start ? group.code_prefix_end : ''}
          </td>
          <td className="py-2 px-3" colSpan={4}>
            <div className="flex items-center gap-2">
              {hasContent ? (isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />) : <span className="w-3.5" />}
              <span className={`text-sm font-semibold ${depth === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{group.name}</span>
              <span className="text-xs text-muted-foreground">({group.name_en})</span>
            </div>
          </td>
          <td className="py-2 px-3 text-right font-mono text-xs text-muted-foreground">{totals.debit > 0 ? fmt(totals.debit) : ''}</td>
          <td className="py-2 px-3 text-right font-mono text-xs text-muted-foreground">{totals.credit > 0 ? fmt(totals.credit) : ''}</td>
          <td className="py-2 px-3 text-right font-mono text-xs font-semibold text-foreground/70">
            {(totals.debit !== 0 || totals.credit !== 0) ? fmt(totals.debit - totals.credit) : ''}
          </td>
          <td />
        </tr>
        {isExpanded && (
          <>
            {childGrps.map(cg => <GroupSection key={cg.id} group={cg} depth={depth + 1} />)}
            {directAccs.map(acc => <AccountRow key={acc.id} acc={acc} indent={depth + 1} />)}
          </>
        )}
      </>
    );
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Kontabilitet</p>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Plani Kontabël</h1>
          <p className="text-sm text-muted-foreground mt-1">Menaxho llogaritë kontabël me bilancet në kohë reale</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="ghost" size="icon" title="Rifresko"><RefreshCw className="w-4 h-4" /></Button>
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

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground w-24">Kodi</th>
              <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Emri</th>
              <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Emri (EN)</th>
              <th className="text-center py-3 px-3 font-semibold text-muted-foreground w-32">Nëntipi</th>
              <th className="text-center py-3 px-3 font-semibold text-muted-foreground w-20">Balanc.</th>
              <th className="text-right py-3 px-3 font-semibold text-muted-foreground w-28">Debit</th>
              <th className="text-right py-3 px-3 font-semibold text-muted-foreground w-28">Kredit</th>
              <th className="text-right py-3 px-3 font-semibold text-muted-foreground w-28">Bilanci</th>
              <th className="text-right py-3 px-3 font-semibold text-muted-foreground w-20">Veprime</th>
            </tr>
          </thead>
          <tbody>
            {rootGroups.length === 0 && ungroupedAccounts.length === 0 ? (
              <tr><td colSpan="9" className="text-center py-12 text-muted-foreground">
                Nuk ka llogari. Klikoni "Krijo Llogaritë Default" për të filluar.
              </td></tr>
            ) : (
              <>
                {rootGroups.map(g => <GroupSection key={g.id} group={g} depth={0} />)}
                {ungroupedAccounts.map(acc => <AccountRow key={acc.id} acc={acc} indent={0} />)}
              </>
            )}
          </tbody>
        </table>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Emri (Shqip)</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-account-name" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Emri (Anglisht)</Label>
                <Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} data-testid="input-account-name-en" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                <Label className="text-xs font-semibold mb-1.5 block">Nëntipi</Label>
                <Select value={form.account_subtype} onValueChange={v => setForm(f => ({ ...f, account_subtype: v }))}>
                  <SelectTrigger data-testid="select-account-subtype"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_SUBTYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Grupi i Llogarisë</Label>
              <Select value={form.account_group_id || 'none'} onValueChange={v => setForm(f => ({ ...f, account_group_id: v === 'none' ? '' : v }))}>
                <SelectTrigger data-testid="select-account-group"><SelectValue placeholder="Zgjidh grupin (opsionale)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Pa grup —</SelectItem>
                  {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="reconcile"
                checked={form.reconcile}
                onCheckedChange={v => setForm(f => ({ ...f, reconcile: v }))}
                data-testid="checkbox-reconcile"
              />
              <Label htmlFor="reconcile" className="text-sm cursor-pointer">Lejo balancimet (Reconciliation)</Label>
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
