import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Trash2, Edit2, Calendar, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const typeColors = { public: "bg-red-100 text-red-700", company: "bg-blue-100 text-blue-700" };
const typeLabels = { public: "Publike", company: "Kompanisë" };

export default function Holidays() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [form, setForm] = useState({
    name: "", holiday_date: "", holiday_type: "public", recurring: false,
  });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const hols = await base44.entities.Holiday.filter({ tenant_id: tenantId }, "holiday_date");
      setHolidays(hols);
    } catch (e) { toast.error("Gabim në ngarkim"); }
    setLoading(false);
  };

  const filteredHolidays = holidays.filter(h => {
    if (h.recurring) return true;
    return moment(h.holiday_date).year() === selectedYear;
  });

  const handleSave = async () => {
    if (!form.name || !form.holiday_date) { toast.error("Plotëso fushat"); return; }
    setSubmitting(true);
    try {
      const data = { ...form, tenant_id: tenantId };
      if (editingId) {
        await base44.entities.Holiday.update(editingId, data);
        toast.success("U përditësua");
      } else {
        await base44.entities.Holiday.create(data);
        toast.success("Festa u shtua");
      }
      setDialogOpen(false);
      setForm({ name: "", holiday_date: "", holiday_type: "public", recurring: false });
      setEditingId(null);
      loadAll();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Fshi?")) return;
    try { await base44.entities.Holiday.delete(id); toast.success("U fshi"); loadAll(); }
    catch (e) { toast.error(e.message); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Festat Zyrtare</h1>
          <p className="text-sm text-slate-500 mt-1">Menaxho festat publike dhe të kompanisë</p>
        </div>
        <Button onClick={() => { setForm({ name: "", holiday_date: "", holiday_type: "public", recurring: false }); setEditingId(null); setDialogOpen(true); }} data-testid="button-add-holiday">
          <Plus className="w-4 h-4 mr-1" /> Shto Festë
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-500">{filteredHolidays.length} festa</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredHolidays.map(h => (
          <div key={h.id} className="bg-white rounded-xl border p-5" data-testid={`card-holiday-${h.id}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-red-50 flex flex-col items-center justify-center">
                  <span className="text-xs text-red-500 font-medium">{moment(h.holiday_date).format("MMM")}</span>
                  <span className="text-lg font-bold text-red-600">{moment(h.holiday_date).format("D")}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{h.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={cn("text-xs", typeColors[h.holiday_type])}>{typeLabels[h.holiday_type]}</Badge>
                    {h.recurring && <Badge className="text-xs bg-indigo-100 text-indigo-700">Përsëritëse</Badge>}
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setForm({...h}); setEditingId(h.id); setDialogOpen(true); }}>
                    <Edit2 className="w-4 h-4 mr-2" /> Modifiko
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(h.id)}>
                    <Trash2 className="w-4 h-4 mr-2" /> Fshi
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
        {filteredHolidays.length === 0 && <p className="col-span-3 text-center text-slate-400 py-12">Nuk ka festa të regjistruara</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifiko Festën" : "Shto Festë"}</DialogTitle>
            <DialogDescription>Plotëso të dhënat e festës</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Emri *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} data-testid="input-holiday-name" /></div>
            <div><Label>Data *</Label><Input type="date" value={form.holiday_date} onChange={e => setForm({...form, holiday_date: e.target.value})} data-testid="input-holiday-date" /></div>
            <div>
              <Label>Lloji</Label>
              <Select value={form.holiday_type} onValueChange={v => setForm({...form, holiday_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Publike</SelectItem>
                  <SelectItem value="company">Kompanisë</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.recurring} onCheckedChange={v => setForm({...form, recurring: v})} />
              <Label>Përsëritet çdo vit</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSave} disabled={submitting} data-testid="button-save-holiday">{submitting ? "Duke ruajtur..." : "Ruaj"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
