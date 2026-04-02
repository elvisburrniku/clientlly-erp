import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Trash2, Copy, Save } from 'lucide-react';

export default function QuoteTemplateManager({ isOpen, onClose, onLoad, formData }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    if (isOpen) loadTemplates();
  }, [isOpen]);

  const loadTemplates = async () => {
    setLoading(true);
    const data = await base44.entities.QuoteTemplate.list('-created_date', 50);
    setTemplates(data);
    setLoading(false);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    
    const template = {
      name: templateName,
      client_name: formData.client_name,
      client_email: formData.client_email,
      client_phone: formData.client_phone,
      client_nipt: formData.client_nipt,
      client_address: formData.client_address,
      items: formData.items,
      description: formData.description,
      validity_days: formData.validity_days,
      personalization_message: formData.personalization_message,
      template_style: formData.template,
      font_family: formData.font_family,
    };

    await base44.entities.QuoteTemplate.create(template);
    setTemplateName('');
    setShowSaveDialog(false);
    loadTemplates();
  };

  const handleLoadTemplate = (template) => {
    onLoad({
      client_name: template.client_name || '',
      client_email: template.client_email || '',
      client_phone: template.client_phone || '',
      client_nipt: template.client_nipt || '',
      client_address: template.client_address || '',
      items: template.items || [{ type: 'product', name: '', quantity: 1, unit: 'cope', price_ex_vat: 0, vat_rate: 20 }],
      description: template.description || '',
      work_description: '',
      validity_days: template.validity_days || 30,
      personalization_message: template.personalization_message || '',
      template: template.template_style || 'classic',
      font_family: template.font_family || 'helvetica',
    });
    onClose();
  };

  const handleDeleteTemplate = async (id) => {
    await base44.entities.QuoteTemplate.delete(id);
    loadTemplates();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Menaxho Shabllonët e Ofertave</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Ngarkon...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nuk ka shabllone të ruajura</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {templates.map((template) => (
                <div key={template.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{template.name}</p>
                    <p className="text-xs text-muted-foreground">{template.client_name || 'Kliente i përgjithshëm'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleLoadTemplate(template)}
                      title="Ngarko"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:text-destructive"
                      onClick={() => handleDeleteTemplate(template.id)}
                      title="Fshi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Mbyll
          </Button>
          <Button onClick={() => setShowSaveDialog(true)} className="gap-2">
            <Save className="w-4 h-4" /> Ruaj si Shabllon
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ruaj si Shabllon</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Emri i shabllonit"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Anulo
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>
              Ruaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}