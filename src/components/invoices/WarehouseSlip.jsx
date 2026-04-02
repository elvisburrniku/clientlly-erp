import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Download, Package, AlertCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import moment from 'moment';

export default function WarehouseSlip({ invoice, open, onClose }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) loadInventory();
  }, [open]);

  const loadInventory = async () => {
    const inv = await base44.entities.Inventory.list('-created_date', 500);
    setInventory(inv);
    setLoading(false);
  };

  const getInventoryForProduct = (productName) => {
    return inventory.find(i => i.product_name === productName);
  };

  const generateWarehouseSlip = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const H = 297;
    const margin = 12;

    // Header
    doc.setFillColor(67, 56, 202);
    doc.rect(0, 0, W, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FLETËDALJE MAGAZINI', margin, 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fatura: ${invoice.invoice_number}`, W - margin, 10, { align: 'right' });
    doc.text(`Data: ${moment().format('DD/MM/YYYY')}`, W - margin, 16, { align: 'right' });

    // Client info
    let y = 35;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('KLIENTI:', margin, y);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.client_name, margin, y + 5);
    if (invoice.client_email) doc.text(invoice.client_email, margin, y + 10);
    if (invoice.client_phone) doc.text(invoice.client_phone, margin, y + 15);

    y += 25;

    // Products table
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PRODUKTET PËR DALJE:', margin, y);
    y += 7;

    const colW = [80, 20, 35, 35];
    const headers = ['EMRI I PRODUKTIT', 'SASI', 'NJËSIA', 'STOK AKTUAL'];
    
    // Table header
    doc.setFillColor(67, 56, 202);
    doc.rect(margin, y - 5, W - 2 * margin, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    let xPos = margin;
    headers.forEach((h, i) => {
      doc.text(h, xPos + 2, y);
      xPos += colW[i];
    });

    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);

    // Table rows
    invoice.items?.forEach((item, idx) => {
      if (item.type === 'product') {
        const inv = getInventoryForProduct(item.name);
        const currentStock = inv?.quantity || 0;
        const rowH = 8;
        
        if (y > H - 30) {
          doc.addPage();
          y = 20;
        }

        if (idx % 2 === 0) {
          doc.setFillColor(245, 247, 255);
          doc.rect(margin, y - 4, W - 2 * margin, rowH, 'F');
        }

        xPos = margin;
        doc.text((item.name || '').slice(0, 35), xPos + 2, y);
        xPos += colW[0];
        
        doc.text(String(item.quantity), xPos + 2, y);
        xPos += colW[1];
        
        doc.text(item.unit || '', xPos + 2, y);
        xPos += colW[2];
        
        const stockStatus = currentStock >= item.quantity ? 'OK' : `⚠ ${currentStock}`;
        doc.text(stockStatus, xPos + 2, y);
        
        y += rowH;
      }
    });

    // Footer
    y = H - 25;
    doc.setDrawColor(67, 56, 202);
    doc.line(margin, y, W - margin, y);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Gjeneruar: ' + moment().format('DD/MM/YYYY HH:mm'), margin, y + 5);
    doc.text('Ky dokument është i vlefshëm vetëm me vulën e kompanisë.', margin, y + 10);

    // Save
    doc.save(`flete_dalje_${invoice.invoice_number}_${moment().format('YYYY-MM-DD')}.pdf`);
  };

  const hasProducts = invoice?.items?.some(i => i.type === 'product');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fletëdalje Magazini - {invoice?.invoice_number}</DialogTitle>
        </DialogHeader>

        {!hasProducts ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <AlertCircle className="w-10 h-10 text-amber-500" />
            <p className="text-muted-foreground">Kjo faturë nuk ka produkte për dalje (vetëm shërbime).</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left px-4 py-2 text-xs font-semibold">Produkti</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold">Sasi Dalje</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold">Stok Aktual</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold">Statusi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice?.items?.map((item, idx) => {
                    if (item.type !== 'product') return null;
                    const inv = getInventoryForProduct(item.name);
                    const currentStock = inv?.quantity || 0;
                    const sufficient = currentStock >= item.quantity;
                    return (
                      <tr key={idx} className={sufficient ? 'hover:bg-muted/20' : 'bg-red-50 hover:bg-red-100'}>
                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          {item.name}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">{item.quantity}</td>
                        <td className="px-4 py-3 text-center font-semibold">{currentStock}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            sufficient 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {sufficient ? '✓ OK' : `⚠ Mungon ${item.quantity - currentStock}`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Mbyll</Button>
          {hasProducts && (
            <Button onClick={generateWarehouseSlip} className="gap-2">
              <Download className="w-4 h-4" /> Shkarko Fletëdalje
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}