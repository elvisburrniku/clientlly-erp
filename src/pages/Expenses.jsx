import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, MoreHorizontal, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const emptyForm = () => ({
  category: "",
  description: "",
  amount: 0,
  expense_date: new Date().toISOString().split("T")[0],
  payment_method: "cash",
  supplier: "",
  is_paid: true,
});

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [budgets, setBudgets] = useState([]);

  useEffect(() => { loadData(); loadCategories(); loadBudgets(); }, []);

  const loadBudgets = async () => {
    const buds = await base44.entities.CategoryBudget.list("-created_date", 100).catch(() => []);
    setBudgets(buds);
  };

  const loadCategories = async () => {
    const cats = await base44.entities.ExpenseCategory.list("-created_date", 100).catch(() => []);
    setCategories(cats);
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newCat = await base44.entities.ExpenseCategory.create({ name: newCategoryName });
    setCategories([...categories, newCat]);
    setForm({ ...form, category: newCat.id });
    setShowNewCategory(false);
    setNewCategoryName("");
  };

  const loadData = async () => {
    try {
      const data = await base44.entities.Expense.list("-created_date", 100);
      setExpenses(data);
    } catch (err) {
      console.error("Load error:", err);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.category || form.amount <= 0 || !form.expense_date) {
      toast.error("Plotësoni të gjitha fushat e detyrueshme");
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.Expense.create(form);
      toast.success("Shpenzimi u shtua");
      setForm(emptyForm());
      setDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error("Gabim në ruajtje");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Fshi këtë shpenzim?")) return;
    try {
      await base44.entities.Expense.delete(id);
      toast.success("Shpenzimi u fshi");
      loadData();
    } catch (err) {
      toast.error("Gabim në fshirje");
    }
  };

  const getBudgetStatus = (categoryId) => {
    const budget = budgets.find(b => b.category_id === categoryId);
    if (!budget) return { status: 'none', percentage: 0 };
    const monthExpenses = expenses.filter(e => e.category === categoryId && new Date(e.expense_date).getMonth() === new Date().getMonth()).reduce((s, e) => s + (e.amount || 0), 0);
    const percentage = (monthExpenses / budget.monthly_limit) * 100;
    if (percentage >= 100) return { status: 'exceeded', percentage: Math.round(percentage), spent: monthExpenses, limit: budget.monthly_limit };
    if (percentage >= budget.warning_percentage) return { status: 'warning', percentage: Math.round(percentage), spent: monthExpenses, limit: budget.monthly_limit };
    return { status: 'ok', percentage: Math.round(percentage), spent: monthExpenses, limit: budget.monthly_limit };
  };

  const filtered = expenses.filter(exp => {
    if (dateFrom && new Date(exp.expense_date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(exp.expense_date) > new Date(dateTo)) return false;
    if (categoryFilter && exp.category !== categoryFilter) return false;
    return true;
  });

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setCategoryFilter("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const totalExpenses = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);
  const byCategory = categories.map(cat => ({
    category: cat,
    total: filtered.filter(e => e.category === cat.id).reduce((sum, e) => sum + (e.amount || 0), 0),
  })).filter(x => x.total > 0);

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxhimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Shpenzimet</h1>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Shto Shpenzim
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total Shpenzimesh</p>
          <p className="text-2xl font-bold mt-1 text-destructive">€{totalExpenses.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
          <p className="text-xs text-muted-foreground mt-0.5">këtë muaj</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Numri i Shpenzimeve</p>
          <p className="text-2xl font-bold mt-1">{expenses.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">regjistrime</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold">Filtrat</p>
          <Button variant="ghost" size="sm" onClick={() => setFilterOpen(!filterOpen)} className="text-xs">
            {filterOpen ? "Fsheh" : "Shfaq"}
          </Button>
        </div>
        {filterOpen && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs mb-1.5 block">Nga Data</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Deri më Data</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Kategoria</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Të gjitha" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Të gjitha</SelectItem>
                    {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(dateFrom || dateTo || categoryFilter) && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">Pastro Filtrat</Button>
            )}
          </div>
        )}
      </div>

      {/* By Category */}
      {byCategory.length > 0 && (
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
          <h3 className="text-base font-semibold mb-4">Sipas Kategorive</h3>
          <div className="space-y-3">
            {byCategory.map(({ category, total }) => (
              <div key={category.id} className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">{category.name}</span>
                <span className="font-medium">€{total.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-semibold text-sm">{filtered.length} shpenzimesh{(dateFrom || dateTo || categoryFilter) && " (filtruara)"}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Kategoria</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Përshkrimi</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Shuma</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Data</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Metoda</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Asnjë shpenzim të regjistruar</p>
                  </td>
                </tr>
              ) : (
                filtered.map(exp => {
                  const budgetStatus = getBudgetStatus(exp.category);
                  return (
                    <tr key={exp.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{categories.find(c => c.id === exp.category)?.name || exp.category}</span>
                          {budgetStatus.status === 'exceeded' && <AlertCircle className="w-4 h-4 text-destructive" title={`Buxheti tejkaluar: €${budgetStatus.spent.toFixed(2)}/€${budgetStatus.limit.toFixed(2)}`} />}
                          {budgetStatus.status === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500" title={`Approxi. 80%: €${budgetStatus.spent.toFixed(2)}/€${budgetStatus.limit.toFixed(2)}`} />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{exp.description || "—"}</td>
                      <td className="px-6 py-4"><span className="text-sm font-bold">€{(exp.amount || 0).toFixed(2)}</span></td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{moment(exp.expense_date).format("DD MMM YY")}</td>
                      <td className="px-6 py-4"><span className="text-xs font-medium bg-muted px-2.5 py-1 rounded-full capitalize">{exp.payment_method || "—"}</span></td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDelete(exp.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Fshi
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Shto Shpenzim të Ri</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Kategoria *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Zgjedh kategorinë" /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowNewCategory(true)} className="w-full" disabled={showNewCategory}>
                + Kategori e Re
              </Button>
            </div>
            {showNewCategory && (
              <div className="flex gap-2">
                <Input placeholder="Emri i kategorisë" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="text-sm" />
                <Button size="sm" variant="outline" onClick={addCategory} className="px-2">✓</Button>
                <Button size="sm" variant="outline" onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }} className="px-2">✕</Button>
              </div>
            )}
            <div>
              <Label>Furnitori</Label>
              <Input placeholder="Emri i furnitorit" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="mt-1.5 text-sm" />
            </div>
            <div>
              <Label>Përshkrimi</Label>
              <Textarea placeholder="P.sh. Qira për muajin prill..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={2} />
            </div>
            <div>
              <Label>Shuma (EUR) *</Label>
              <Input type="number" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} className="mt-1.5" step="0.01" />
            </div>
            <div>
              <Label>Data e Shpenzimit *</Label>
              <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Metoda e Pagesës</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Transfer Bankar</SelectItem>
                  <SelectItem value="card">Kartë</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_paid" checked={form.is_paid} onChange={(e) => setForm({ ...form, is_paid: e.target.checked })} className="w-4 h-4 rounded" />
              <Label htmlFor="is_paid" className="!mt-0 cursor-pointer text-sm">Paguar</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleCreate} disabled={submitting}>{submitting ? "Duke ruajtur..." : "Shto Shpenzim"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}