import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Edit2, Trash2, Mail, Send } from "lucide-react";
import { toast } from "sonner";

const reportTypes = [
  { id: 'financial_summary', label: 'Përmbledhja Financiare' },
  { id: 'invoice_analysis', label: 'Analiza e Faturave' },
  { id: 'expense_breakdown', label: 'Zbërthimi i Shpenzimeve' },
  { id: 'cash_flow', label: 'Rrjedha e Parave' },
];

const sectionOptions = [
  { id: 'summary', label: 'Përmbledhja Financiare' },
  { id: 'invoices', label: 'Faturat' },
  { id: 'expenses', label: 'Shpenzime' },
  { id: 'cash_transactions', label: 'Transaksionet e Arkes' },
  { id: 'debtors', label: 'Debtorët' },
  { id: 'charts', label: 'Grafike' },
];

export default function ReportTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    report_type: 'financial_summary',
    frequency: 'monthly',
    include_sections: ['summary', 'invoices', 'expenses'],
    recipient_emails: '',
    send_day_of_month: 1,
    send_month: 1,
    custom_title: '',
    include_company_logo: true,
    is_active: true,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const data = await base44.entities.ReportTemplate.filter({ tenant_id: user.tenant_id }, '-created_date', 50);
    setTemplates(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.recipient_emails) {
      toast.error('Plotëso fushat e nevojshme');
      return;
    }

    const emails = formData.recipient_emails.split(',').map(e => e.trim()).filter(Boolean);
    if (emails.length === 0) {
      toast.error('Shto të paktën një email');
      return;
    }

    const data = {
      ...formData,
      tenant_id: user.tenant_id,
      recipient_emails: emails,
    };

    if (editingId) {
      await base44.entities.ReportTemplate.update(editingId, data);
      toast.success('Template përditësuar');
    } else {
      await base44.entities.ReportTemplate.create(data);
      toast.success('Template i ri u krijua');
    }

    setDialogOpen(false);
    resetForm();
    await loadTemplates();
  };

  const handleDelete = async (id) => {
    if (confirm('A je i sigurt?')) {
      await base44.entities.ReportTemplate.delete(id);
      await loadTemplates();
      toast.success('Template u fshi');
    }
  };

  const handleEdit = (template) => {
    setFormData({
      ...template,
      recipient_emails: template.recipient_emails.join(', '),
    });
    setEditingId(template.id);
    setDialogOpen(true);
  };

  const handleSendNow = async (id) => {
    try {
      await base44.functions.invoke('generateAndSendReport', { templateId: id });
      toast.success('Raporti u dërgua me sukses');
    } catch (error) {
      toast.error('Gabim gjatë dërgimit');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      report_type: 'financial_summary',
      frequency: 'monthly',
      include_sections: ['summary', 'invoices', 'expenses'],
      recipient_emails: '',
      send_day_of_month: 1,
      send_month: 1,
      custom_title: '',
      include_company_logo: true,
      is_active: true,
    });
    setEditingId(null);
  };

  const toggleSection = (sectionId) => {
    setFormData(prev => ({
      ...prev,
      include_sections: prev.include_sections.includes(sectionId)
        ? prev.include_sections.filter(s => s !== sectionId)
        : [...prev.include_sections, sectionId],
    }));
  };

  if (loading) return <div className="p-6">Duke ngarë...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Template-e Raporteve</h1>
          <p className="text-sm text-muted-foreground mt-1">Menaxho raporte financiare automatike</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Template i Ri
          </Button>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Ndrysho Template' : 'Template i Ri'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Emri i Template-it</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="mt-1" placeholder="p.sh. Raport Mujor" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Lloji i Raportit</Label>
                  <select value={formData.report_type} onChange={(e) => setFormData({...formData, report_type: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-border rounded-lg text-sm">
                    {reportTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Frekuenca</Label>
                  <select value={formData.frequency} onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-border rounded-lg text-sm">
                    <option value="monthly">Mujor</option>
                    <option value="yearly">Vjetor</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>Titull Custom (optional)</Label>
                <Input value={formData.custom_title} onChange={(e) => setFormData({...formData, custom_title: e.target.value})}
                  className="mt-1" placeholder="Shfaq këtë titull në raport" />
              </div>

              <div>
                <Label>Email-e Marrësish (ndarë me presje)</Label>
                <Input value={formData.recipient_emails} onChange={(e) => setFormData({...formData, recipient_emails: e.target.value})}
                  className="mt-1" placeholder="john@example.com, jane@example.com" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dita e Muajit (1-31)</Label>
                  <Input type="number" min="1" max="31" value={formData.send_day_of_month}
                    onChange={(e) => setFormData({...formData, send_day_of_month: parseInt(e.target.value)})}
                    className="mt-1" />
                </div>
                <div>
                  <Label>Muaj për Raportin Vjetor (1-12)</Label>
                  <Input type="number" min="1" max="12" value={formData.send_month}
                    onChange={(e) => setFormData({...formData, send_month: parseInt(e.target.value)})}
                    className="mt-1" />
                </div>
              </div>

              <div>
                <Label className="block mb-3">Seksionet e Raportit</Label>
                <div className="grid grid-cols-2 gap-3">
                  {sectionOptions.map(section => (
                    <button key={section.id} onClick={() => toggleSection(section.id)}
                      className={`p-3 rounded-lg border text-sm transition-all ${
                        formData.include_sections.includes(section.id)
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border hover:border-primary/50'
                      }`}>
                      {section.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  id="active" className="w-4 h-4" />
                <Label htmlFor="active" className="mb-0">Aktiv</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
              <Button onClick={handleSave}>Ruaj Template</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates list */}
      <div className="grid gap-4">
        {templates.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">Nuk ka template-e raportesh. Krijo njërin!</p>
          </div>
        ) : (
          templates.map(template => (
            <div key={template.id} className="bg-card border border-border rounded-lg p-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg">{template.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {reportTypes.find(t => t.id === template.report_type)?.label} • {template.frequency === 'monthly' ? 'Mujor' : 'Vjetor'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  <Mail className="w-3 h-3 inline mr-1" />
                  {template.recipient_emails.join(', ')}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {template.include_sections.slice(0, 3).map(sec => (
                    <span key={sec} className="text-xs bg-muted px-2 py-1 rounded">
                      {sectionOptions.find(s => s.id === sec)?.label}
                    </span>
                  ))}
                  {template.include_sections.length > 3 && <span className="text-xs text-muted-foreground">+{template.include_sections.length - 3}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => handleSendNow(template.id)} className="gap-2">
                  <Send className="w-4 h-4" /> Dërgo Tani
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleEdit(template)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(template.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}