import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Download, FileText, DollarSign, Check, CheckCheck, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";
import { jsPDF } from "jspdf";

const statusColors = {
  draft: "bg-gray-100 text-gray-600",
  processed: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
};
const statusLabels = { draft: "Draft", processed: "Procesuar", paid: "Paguar" };

export default function Payroll() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(moment().month());
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [selected, setSelected] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPayroll, setDetailPayroll] = useState(null);

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingPayrollId, setEditingPayrollId] = useState(null);
  const [itemForm, setItemForm] = useState({ description: "", type: "addition", amount: 0 });
  const [editItems, setEditItems] = useState([]);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pays, emps] = await Promise.all([
        base44.entities.Payroll.filter({ tenant_id: tenantId }, "-created_at"),
        base44.entities.Employee.filter({ tenant_id: tenantId, status: "active" }),
      ]);
      setPayrolls(pays);
      setEmployees(emps);
    } catch (e) { toast.error("Gabim në ngarkim"); }
    setLoading(false);
  };

  const monthlyPayrolls = payrolls.filter(p => p.month === selectedMonth + 1 && p.year === selectedYear);

  const generatePayroll = async () => {
    setSubmitting(true);
    try {
      const existing = monthlyPayrolls.map(p => p.employee_id);
      const toCreate = employees.filter(e => !existing.includes(e.id));
      if (toCreate.length === 0) { toast.info("Pagat janë gjeneruar tashmë"); setSubmitting(false); return; }
      for (const emp of toCreate) {
        await base44.entities.Payroll.create({
          tenant_id: tenantId, employee_id: emp.id,
          employee_name: `${emp.first_name} ${emp.last_name}`,
          month: selectedMonth + 1, year: selectedYear,
          base_salary: emp.base_salary || 0,
          additions: 0, deductions: 0,
          net_pay: emp.base_salary || 0,
          status: "draft", items: [],
        });
      }
      toast.success(`${toCreate.length} paga u gjeneruan`);
      loadAll();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handlePaySelected = async () => {
    if (selected.length === 0) { toast.error("Zgjidh pagat"); return; }
    try {
      for (const id of selected) {
        await base44.entities.Payroll.update(id, { status: "paid", paid_at: new Date().toISOString() });
      }
      toast.success(`${selected.length} paga u paguan`);
      setSelected([]);
      loadAll();
    } catch (e) { toast.error(e.message); }
  };

  const handlePayAll = async () => {
    const unpaid = monthlyPayrolls.filter(p => p.status !== "paid");
    if (unpaid.length === 0) { toast.info("Të gjitha pagat janë paguar"); return; }
    try {
      for (const p of unpaid) {
        await base44.entities.Payroll.update(p.id, { status: "paid", paid_at: new Date().toISOString() });
      }
      toast.success(`${unpaid.length} paga u paguan`);
      loadAll();
    } catch (e) { toast.error(e.message); }
  };

  const openDetail = (p) => {
    setDetailPayroll(p);
    setEditItems(Array.isArray(p.items) ? p.items : (typeof p.items === "string" ? JSON.parse(p.items || "[]") : []));
    setEditingPayrollId(p.id);
    setDetailOpen(true);
  };

  const addItem = () => {
    if (!itemForm.description || !itemForm.amount) return;
    const newItems = [...editItems, { ...itemForm, amount: parseFloat(itemForm.amount) }];
    setEditItems(newItems);
    setItemForm({ description: "", type: "addition", amount: 0 });
  };

  const removeItem = (idx) => {
    setEditItems(editItems.filter((_, i) => i !== idx));
  };

  const saveItems = async () => {
    if (!editingPayrollId || !detailPayroll) return;
    const additions = editItems.filter(i => i.type === "addition").reduce((s, i) => s + i.amount, 0);
    const deductions = editItems.filter(i => i.type === "deduction").reduce((s, i) => s + i.amount, 0);
    const net = (parseFloat(detailPayroll.base_salary) || 0) + additions - deductions;
    try {
      await base44.entities.Payroll.update(editingPayrollId, {
        items: editItems, additions, deductions, net_pay: net, status: "processed",
      });
      toast.success("Paga u përditësua");
      setDetailOpen(false);
      loadAll();
    } catch (e) { toast.error(e.message); }
  };

  const exportPayslipPDF = (p) => {
    const doc = new jsPDF();
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("FLET\u00cb PAGA", 14, 16);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`${moment().month(p.month - 1).format("MMMM")} ${p.year}`, 14, 25);
    doc.text(`Gjeneruar: ${moment().format("DD/MM/YYYY")}`, 140, 25);

    doc.setTextColor(30, 30, 30);
    let y = 50;
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text("Punonj\u00ebsi:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(p.employee_name || "", 60, y);
    y += 10;

    doc.setFillColor(243, 244, 246);
    doc.rect(14, y, 180, 10, "F");
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("Paga Baz\u00eb", 18, y + 7);
    doc.text(`${Number(p.base_salary || 0).toLocaleString()} ALL`, 170, y + 7, { align: "right" });
    y += 15;

    const items = Array.isArray(p.items) ? p.items : (typeof p.items === "string" ? JSON.parse(p.items || "[]") : []);
    if (items.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Komponent\u00ebt:", 14, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      items.forEach(item => {
        const prefix = item.type === "addition" ? "+" : "-";
        doc.text(item.description, 18, y);
        doc.text(`${prefix}${Number(item.amount).toLocaleString()} ALL`, 170, y, { align: "right" });
        y += 7;
      });
      y += 5;
    }

    doc.setFillColor(243, 244, 246);
    doc.rect(14, y, 180, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Shtesat", 18, y + 7);
    doc.text(`+${Number(p.additions || 0).toLocaleString()} ALL`, 170, y + 7, { align: "right" });
    y += 12;
    doc.setFillColor(243, 244, 246);
    doc.rect(14, y, 180, 10, "F");
    doc.text("Zbritjet", 18, y + 7);
    doc.text(`-${Number(p.deductions || 0).toLocaleString()} ALL`, 170, y + 7, { align: "right" });
    y += 18;

    doc.setFillColor(30, 41, 59);
    doc.rect(14, y, 180, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.text("PAGA NETO", 18, y + 10);
    doc.text(`${Number(p.net_pay || 0).toLocaleString()} ALL`, 170, y + 10, { align: "right" });

    doc.save(`paga_${p.employee_name?.replace(/\s+/g, "_")}_${p.month}_${p.year}.pdf`);
    toast.success("PDF u shkarkua");
  };

  const exportBankExcel = () => {
    const rows = monthlyPayrolls.map(p => {
      const emp = employees.find(e => e.id === p.employee_id);
      return [p.employee_name, emp?.bank_account || "", Number(p.net_pay || 0).toFixed(2), statusLabels[p.status]];
    });
    let csv = "Punonjësi,Llogaria Bankare,Shuma Neto,Statusi\n";
    rows.forEach(r => { csv += r.join(",") + "\n"; });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pagat_bank_${selectedYear}_${selectedMonth + 1}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV u eksportua");
  };

  const totals = {
    baseSalary: monthlyPayrolls.reduce((s, p) => s + parseFloat(p.base_salary || 0), 0),
    additions: monthlyPayrolls.reduce((s, p) => s + parseFloat(p.additions || 0), 0),
    deductions: monthlyPayrolls.reduce((s, p) => s + parseFloat(p.deductions || 0), 0),
    netPay: monthlyPayrolls.reduce((s, p) => s + parseFloat(p.net_pay || 0), 0),
    paid: monthlyPayrolls.filter(p => p.status === "paid").length,
    total: monthlyPayrolls.length,
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Pagat</h1>
          <p className="text-sm text-slate-500 mt-1">Proceso dhe menaxho pagat mujore</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500 uppercase font-medium">Paga Bazë Totale</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{totals.baseSalary.toLocaleString()} ALL</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500 uppercase font-medium">Shtesat</p>
          <p className="text-xl font-bold text-green-600 mt-1">+{totals.additions.toLocaleString()} ALL</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500 uppercase font-medium">Zbritjet</p>
          <p className="text-xl font-bold text-red-600 mt-1">-{totals.deductions.toLocaleString()} ALL</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500 uppercase font-medium">Paga Neto Totale</p>
          <p className="text-xl font-bold text-indigo-600 mt-1">{totals.netPay.toLocaleString()} ALL</p>
          <p className="text-xs text-slate-400 mt-1">{totals.paid}/{totals.total} paguar</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(parseInt(v))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{moment.months().map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" onClick={generatePayroll} disabled={submitting} data-testid="button-generate-payroll">
          <RefreshCw className="w-4 h-4 mr-1" /> Gjenero Pagat
        </Button>
        <Button variant="outline" onClick={handlePaySelected} disabled={selected.length === 0} data-testid="button-pay-selected">
          <Check className="w-4 h-4 mr-1" /> Paguaj Zgjedhurat ({selected.length})
        </Button>
        <Button variant="outline" onClick={handlePayAll} data-testid="button-pay-all">
          <CheckCheck className="w-4 h-4 mr-1" /> Paguaj Të Gjitha
        </Button>
        <Button variant="outline" onClick={exportBankExcel} data-testid="button-export-bank">
          <Download className="w-4 h-4 mr-1" /> Eksporto CSV
        </Button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="w-10 px-4 py-3"><Checkbox checked={selected.length === monthlyPayrolls.length && monthlyPayrolls.length > 0} onCheckedChange={(v) => setSelected(v ? monthlyPayrolls.map(p => p.id) : [])} /></th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Punonjësi</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Paga Bazë</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Shtesat</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Zbritjet</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Paga Neto</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Statusi</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {monthlyPayrolls.map(p => (
              <tr key={p.id} className="hover:bg-slate-50" data-testid={`row-payroll-${p.id}`}>
                <td className="px-4 py-3"><Checkbox checked={selected.includes(p.id)} onCheckedChange={(v) => setSelected(v ? [...selected, p.id] : selected.filter(i => i !== p.id))} /></td>
                <td className="px-4 py-3 font-medium text-slate-900">{p.employee_name}</td>
                <td className="px-4 py-3 text-right">{Number(p.base_salary || 0).toLocaleString()} ALL</td>
                <td className="px-4 py-3 text-right text-green-600">+{Number(p.additions || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-red-600">-{Number(p.deductions || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-bold text-slate-900">{Number(p.net_pay || 0).toLocaleString()} ALL</td>
                <td className="px-4 py-3"><Badge className={cn("text-xs", statusColors[p.status])}>{statusLabels[p.status] || p.status}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openDetail(p)} data-testid={`button-detail-payroll-${p.id}`}><DollarSign className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => exportPayslipPDF(p)} data-testid={`button-pdf-payroll-${p.id}`}><FileText className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {monthlyPayrolls.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Nuk ka paga për këtë muaj. Kliko "Gjenero Pagat" për t'i krijuar.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detajet e Pagës - {detailPayroll?.employee_name}</DialogTitle>
            <DialogDescription>Shto shtesat dhe zbritjet</DialogDescription>
          </DialogHeader>
          {detailPayroll && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm font-medium">Paga Bazë: <span className="text-indigo-600">{Number(detailPayroll.base_salary || 0).toLocaleString()} ALL</span></p>
              </div>

              {editItems.length > 0 && (
                <div className="space-y-2">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Badge className={cn("text-xs", item.type === "addition" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                        {item.type === "addition" ? "+" : "-"}
                      </Badge>
                      <span className="flex-1">{item.description}</span>
                      <span className="font-medium">{Number(item.amount).toLocaleString()} ALL</span>
                      <Button size="icon" variant="ghost" className="w-6 h-6 text-red-500" onClick={() => removeItem(idx)}>×</Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border rounded-lg p-3 space-y-3">
                <div><Label>Përshkrimi</Label><Input value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} placeholder="p.sh. Bonus, Siguracione..." data-testid="input-item-desc" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Lloji</Label>
                    <Select value={itemForm.type} onValueChange={v => setItemForm({...itemForm, type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="addition">Shtesë (+)</SelectItem>
                        <SelectItem value="deduction">Zbritje (-)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Shuma</Label><Input type="number" value={itemForm.amount} onChange={e => setItemForm({...itemForm, amount: parseFloat(e.target.value) || 0})} data-testid="input-item-amount" /></div>
                </div>
                <Button variant="outline" size="sm" onClick={addItem} data-testid="button-add-item"><Plus className="w-3 h-3 mr-1" /> Shto</Button>
              </div>

              <div className="bg-indigo-50 rounded-lg p-3 text-sm">
                <div className="flex justify-between"><span>Paga Bazë:</span><span>{Number(detailPayroll.base_salary || 0).toLocaleString()} ALL</span></div>
                <div className="flex justify-between text-green-600"><span>Shtesat:</span><span>+{editItems.filter(i => i.type === "addition").reduce((s, i) => s + i.amount, 0).toLocaleString()} ALL</span></div>
                <div className="flex justify-between text-red-600"><span>Zbritjet:</span><span>-{editItems.filter(i => i.type === "deduction").reduce((s, i) => s + i.amount, 0).toLocaleString()} ALL</span></div>
                <div className="flex justify-between font-bold text-indigo-700 border-t pt-2 mt-2">
                  <span>Neto:</span>
                  <span>{(parseFloat(detailPayroll.base_salary || 0) + editItems.filter(i => i.type === "addition").reduce((s, i) => s + i.amount, 0) - editItems.filter(i => i.type === "deduction").reduce((s, i) => s + i.amount, 0)).toLocaleString()} ALL</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Anulo</Button>
            <Button onClick={saveItems} data-testid="button-save-payroll">Ruaj</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
