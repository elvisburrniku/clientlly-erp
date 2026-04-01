import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, userName, approvedBy, date, note } = await req.json();

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('ERP Finance', 20, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Dokument i Dorëzimit të Parave', pageWidth - 20, 25, { align: 'right' });

    // Body
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('DORËZIMI I PARAVE', 20, 60);

    doc.setDrawColor(226, 232, 240);
    doc.line(20, 65, pageWidth - 20, 65);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);

    const fields = [
      ['Shuma:', `€${parseFloat(amount).toLocaleString()}`],
      ['Data:', new Date(date).toLocaleDateString('sq-AL', { year: 'numeric', month: 'long', day: 'numeric' })],
      ['Dorëzuar nga:', userName || 'N/A'],
      ['Pranuar nga:', approvedBy || 'N/A'],
    ];

    if (note) {
      fields.push(['Shënim:', note]);
    }

    let y = 80;
    for (const [label, value] of fields) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(label, 20, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(value, 80, y);
      y += 12;
    }

    // Signatures section
    y += 20;
    doc.setDrawColor(226, 232, 240);
    doc.line(20, y, pageWidth - 20, y);
    y += 15;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Nënshkrimet', 20, y);
    y += 20;

    // Signature lines
    doc.setDrawColor(148, 163, 184);
    doc.line(20, y + 15, 90, y + 15);
    doc.line(120, y + 15, 190, y + 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Dorëzuesi', 45, y + 25);
    doc.text('Pranuesi', 148, y + 25);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Ky dokument u gjenerua automatikisht nga ERP Finance', pageWidth / 2, 280, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    const file = new File([pdfBlob], `dorezim-${Date.now()}.pdf`, { type: 'application/pdf' });

    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    return Response.json({ file_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});