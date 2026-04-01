import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { handoverId } = await req.json();
    const handover = await base44.asServiceRole.entities.CashHandover.get(handoverId);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    // Color scheme
    const primaryColor = [37, 99, 235];
    const lightGray = [226, 232, 240];
    const darkText = [30, 41, 59];
    const grayText = [71, 85, 105];

    // Header background
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('DORËZIMI I PARAVE', margin, 25);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nr. ${handover.id.slice(0, 8).toUpperCase()}`, margin, 35);
    doc.text(new Date(handover.created_date).toLocaleDateString('sq-AL', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth - margin, 35, { align: 'right' });

    let y = 65;

    // Section 1: Handover Info
    doc.setTextColor(...darkText);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIONI I DORËZIMIT', margin, y);
    y += 8;

    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.3);
    doc.line(margin, y - 1, pageWidth - margin, y - 1);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayText);

    const info = [
      ['Dorëzuar nga:', handover.user_name],
      ['Email:', handover.user_email],
      ['Statusi:', handover.status === 'pending' ? 'Në Pritje' : handover.status === 'approved' ? 'Aprovuar' : 'Refuzuar'],
      ['Shuma Totale:', `€${handover.amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ];

    if (handover.approved_by) {
      info.push(['Aprovuar nga:', handover.approved_by]);
    }

    y += 8;
    for (const [label, value] of info) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkText);
      doc.text(label, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...grayText);
      doc.text(value, margin + 50, y);
      y += 7;
    }

    y += 5;

    // Section 2: Invoices Table
    if (handover.invoices && handover.invoices.length > 0) {
      doc.setTextColor(...darkText);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('FATURAT E PËRFSHIRA', margin, y);
      y += 8;

      doc.setDrawColor(...lightGray);
      doc.line(margin, y - 1, pageWidth - margin, y - 1);

      y += 3;

      // Table header
      doc.setFillColor(...primaryColor);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');

      const col1 = margin;
      const col2 = margin + 50;
      const col3 = margin + 100;
      const col4 = pageWidth - margin - 30;

      doc.rect(margin, y - 5, contentWidth, 7, 'F');
      doc.text('Nr. Fatures', col1, y - 1);
      doc.text('Klienti', col2, y - 1);
      doc.text('Shuma', col4, y - 1, { align: 'right' });

      y += 10;

      // Table rows
      doc.setTextColor(...grayText);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      let rowNum = 0;
      for (const inv of handover.invoices) {
        if (rowNum % 2 === 0) {
          doc.setFillColor(245, 248, 255);
          doc.rect(margin, y - 4, contentWidth, 6, 'F');
        }
        doc.setTextColor(...grayText);
        doc.text(inv.invoice_number || 'N/A', col1, y);
        doc.text(inv.client_name || 'N/A', col2, y);
        doc.text(`€${(inv.amount || 0).toFixed(2)}`, col4, y, { align: 'right' });
        y += 6;
        rowNum++;
      }

      y += 3;

      // Total row
      doc.setFillColor(...primaryColor);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.rect(margin, y - 5, contentWidth, 7, 'F');
      doc.text('TOTAL', col1, y - 1);
      doc.text(`€${handover.amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, col4, y - 1, { align: 'right' });
    }

    y = pageHeight - 50;

    // Note section
    if (handover.note) {
      doc.setTextColor(...darkText);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('SHËNIM', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...grayText);
      const noteLines = doc.splitTextToSize(handover.note, contentWidth);
      doc.text(noteLines, margin, y);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Ky dokument u gjenerua automatikisht. Është i vlefshëm pa nënshkrime.', pageWidth / 2, pageHeight - 10, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    const file = new File([pdfBlob], `dorezim-${handover.id}.pdf`, { type: 'application/pdf' });

    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    return Response.json({ file_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});