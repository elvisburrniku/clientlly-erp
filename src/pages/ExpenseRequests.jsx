import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Trash2, MoreHorizontal, CheckCircle, XCircle, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const emptyForm = () => ({
  title: "",
  description: "",
  amount: 0,
  category: "",
  expense_date: new Date().toISOString().split("T")[0],
});

const statusConfig = {
  submitted: { label: "Dorëzuar", cls: "bg-blue-100 text-blue-700", icon: Clock },
  approved: { label: "Aprovuar", cls: "bg-green-100 text-green-700", icon: CheckCircle },
  rejected: { label: "Refuzuar", cls: "bg-red-100 text-red-700", icon: XCircle },
};

export default function ExpenseRequests() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [user, data] = await Promise.all([
      base44.auth.me(),
      base44.entities.ExpenseRequest.list("-created_date", 100),
    ]);
    setCurrentUser(user);
    setRequests(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.title || form.amount <= 0) {
      toast.error("Plotësoni titullin dhe shumën");
      return;
    }
    setSubmitting(true);
    await base44.entities.ExpenseRequest.create({
      tenant_id: tenantId,
      title: form.title,
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category,
      expense_date: form.expense_date,
      requested_by: currentUser?.email,
      status: "submitted",
    });
    setDialogOpen(false);
    setForm(emptyForm());
    setSubmitting(false);
    toast.success("Kërkesa u dorëzua");
    loadData();
  };

  const handleApprove = async (req) => {
    await base44.entities.ExpenseRequest.update(req.id, {
      status: "approved",
      approved_by: currentUser?.email,
    });
    toast.success("Kërkesa u aprovua");
    loadData();
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    await base44.entities.ExpenseRequest.update(rejectDialog.id, {
      status: "rejected",
      approved_by: currentUser?.email,
      rejection_reason: rejectReason,
    });
    setRejectDialog(null);
    setRejectReason("");
    toast.success("Kërkesa u refuzua");
    loadData();
  };

  const handleDelete = async (req) => {
    if (!window.confirm("Fshi këtë kërkesë?")) return;
    await base44.entities.ExpenseRequest.delete(req.id);
    toast.success("Kërkesa u fshi");
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const filtered = requests.filter(r => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!r.title?.toLowerCase().includes(q) && !r.requested_by?.toLowerCase().includes(q)) return false;
    }
    if (statusFilter && statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  const totalPending = requests.filter(r => r.status === "submitted").length;
  const totalApproved = requests.filter(r => r.status === "approved").reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxhimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Kërkesat për Shpenzime</h1>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setDialogOpen(true); }} className="gap-2 rounded-xl" data-testid="button-new-expense-request">
          <Plus className="w-4 h-4" /> Kërkesë e Re
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total Kërkesa</p>
          <p className="text-2xl font-bold mt-1">{requests.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Në Pritje</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{totalPending}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Aprovuara</p>
          <p className="text-2xl font-bold mt-1 text-green-600">€{totalApproved.toLocaleString('en', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Kërko..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 rounded-xl" data-testid="input-search-expense-requests" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Të gjithë" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjithë</SelectItem>
            <SelectItem value="submitted">Në Pritje</SelectItem>
            <SelectItem value="approved">Aprovuara</SelectItem>
            <SelectItem value="rejected">Refuzuara</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Titulli</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Kërkuar nga</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Shuma</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Kategoria</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Statusi</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Data</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-12">Asnjë kërkesë</td></tr>
            ) : filtered.map((req) => {
              const sc = statusConfig[req.status] || statusConfig.submitted;
              const StatusIcon = sc.icon;
              return (
                <tr key={req.id} className="border-b border-border last:border-0 hover:bg-muted/20" data-testid={`row-expense-request-${req.id}`}>
                  <td className="px-4 py-3 font-medium">{req.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{req.requested_by}</td>
                  <td className="px-4 py-3 text-right font-semibold">€{(req.amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{req.category || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1", sc.cls)}>
                      <StatusIcon className="w-3 h-3" /> {sc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{moment(req.created_date || req.created_at).format("DD/MM/YYYY")}</td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {req.status === "submitted" && (
                          <>
                            <DropdownMenuItem onClick={() => handleApprove(req)}><CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Aprovo</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setRejectDialog(req); setRejectReason(""); }}><XCircle className="w-4 h-4 mr-2 text-red-600" /> Refuzo</DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(req)}><Trash2 className="w-4 h-4 mr-2" /> Fshi</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kërkesë e Re për Shpenzim</DialogTitle>
            <DialogDescription>Dorëzoni kërkesën për aprovim</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Titulli *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Titulli i kërkesës" data-testid="input-expense-request-title" />
            </div>
            <div>
              <Label>Përshkrimi</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detaje shtesë..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Shuma *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} data-testid="input-expense-request-amount" />
              </div>
              <div>
                <Label>Kategoria</Label>
                <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="p.sh. Transport" />
              </div>
            </div>
            <div>
              <Label>Data e Shpenzimit</Label>
              <Input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleCreate} disabled={submitting} data-testid="button-submit-expense-request">
              {submitting ? "Duke dorëzuar..." : "Dorëzo Kërkesën"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectDialog} onOpenChange={(open) => { if (!open) setRejectDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Refuzo Kërkesën</DialogTitle>
            <DialogDescription>Jepni arsyen e refuzimit</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Arsyeja</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Arsyeja e refuzimit..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Anulo</Button>
            <Button variant="destructive" onClick={handleReject} data-testid="button-confirm-reject">Refuzo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
