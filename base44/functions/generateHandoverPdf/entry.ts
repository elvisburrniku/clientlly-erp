import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { handoverId } = await req.json();
    const handover = await base44.asServiceRole.entities.CashHandover.get(handoverId);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const H = 297;
    const margin = 14;
    const cw = W - margin * 2;

    // ── Header bar ──────────────────────────────────────────────
    doc.setFillColor(107, 114, 126);
    doc.rect(0, 0, W, 38, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('DORE\u0308ZIMI I PARAVE', margin, 18);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nr. Ref: ${handover.id.slice(0, 8).toUpperCase()}`, margin, 28);
    const dateStr = new Date(handover.created_date).toLocaleDateString('sq-AL', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(dateStr, W - margin, 28, { align: 'right' });

    // ── Info section ────────────────────────────────────────────
    let y = 50;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('INFORMACIONI I DORE\u0308ZIMIT', margin, y);
    y += 3;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, W - margin, y);
    y += 6;

    const statusLabel = handover.status === 'approved' ? 'Aprovuar' : handover.status === 'rejected' ? 'Refuzuar' : 'N\u00eb Pritje';
    const infoRows = [
      ['Dor\u00ebzuar nga:', handover.user_name || ''],
      ['Email:', handover.user_email || ''],
      ['Statusi:', statusLabel],
      ...(handover.approved_by ? [['Aprovuar nga:', handover.approved_by]] : []),
      ...(handover.approved_date ? [['Data Aprovimit:', new Date(handover.approved_date).toLocaleDateString('sq-AL')]] : []),
    ];

    for (const [label, value] of infoRows) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(9);
      doc.text(label, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(value, margin + 45, y);
      y += 6;
    }

    y += 6;

    // ── Debi / Kredi summary boxes ───────────────────────────────
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('PERMBLEDHJA FINANCIARE', margin, y);
    y += 3;
    doc.line(margin, y, W - margin, y);
    y += 7;

    const boxW = (cw - 6) / 3;
    // Debi box (para q\u00eb lar\u00ebgohen - dalje)
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, y, boxW, 18, 2, 2, 'F');
    doc.setFontSize(7); doc.setTextColor(150, 50, 50);
    doc.text('DEBI (Dalje)', margin + 3, y + 6);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(200, 38, 38);
    doc.text(`\u20ac${(handover.amount || 0).toFixed(2)}`, margin + 3, y + 15);

    // Kredi box (para q\u00eb vij\u00ebn - hyrje)
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin + boxW + 3, y, boxW, 18, 2, 2, 'F');
    doc.setFontSize(7); doc.setTextColor(50, 130, 70); doc.setFont('helvetica', 'normal');
    doc.text('KREDI (Hyrje)', margin + boxW + 6, y + 6);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 163, 74);
    doc.text(`\u20ac${(handover.amount || 0).toFixed(2)}`, margin + boxW + 6, y + 15);

    // Status box
    const statusColor = handover.status === 'approved' ? [240,253,244] : handover.status === 'rejected' ? [254,242,242] : [239,246,255];
    const statusTextColor = handover.status === 'approved' ? [22,163,74] : handover.status === 'rejected' ? [220,38,38] : [67,56,202];
    doc.setFillColor(...statusColor);
    doc.roundedRect(margin + (boxW + 3) * 2, y, boxW, 18, 2, 2, 'F');
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100,100,100);
    doc.text('STATUSI', margin + (boxW + 3) * 2 + 3, y + 6);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...statusTextColor);
    doc.text(statusLabel, margin + (boxW + 3) * 2 + 3, y + 15);

    y += 26;

    // ── Invoices table ───────────────────────────────────────────
    if (handover.invoices && handover.invoices.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('FATURAT E PE\u0308RFSHIRA', margin, y);
      y += 3;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, W - margin, y);
      y += 5;

      // Table header
      doc.setFillColor(107, 114, 126);
      doc.rect(margin, y - 4, cw, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('Nr. Fatur\u00ebs', margin + 2, y + 1);
      doc.text('Klienti', margin + 48, y + 1);
      doc.text('Shuma', W - margin - 2, y + 1, { align: 'right' });
      y += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      for (let i = 0; i < handover.invoices.length; i++) {
        const inv = handover.invoices[i];
        if (y > 260) { doc.addPage(); y = 20; }
        if (i % 2 === 0) { doc.setFillColor(245, 247, 255); doc.rect(margin, y - 4, cw, 7, 'F'); }
        doc.setTextColor(40, 40, 40);
        doc.text(inv.invoice_number || 'N/A', margin + 2, y);
        doc.text((inv.client_name || 'N/A').slice(0, 32), margin + 48, y);
        doc.setTextColor(22, 163, 74);
        doc.text(`\u20ac${(inv.amount || 0).toFixed(2)}`, W - margin - 2, y, { align: 'right' });
        y += 7;
      }

      y += 2;
      // Total row
      doc.setFillColor(107, 114, 126);
      doc.rect(margin, y - 4, cw, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL', margin + 2, y + 1);
      doc.text(`\u20ac${(handover.amount || 0).toFixed(2)}`, W - margin - 2, y + 1, { align: 'right' });
      y += 14;
    }

    // ── Note ────────────────────────────────────────────────────
    if (handover.note) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('SHE\u0308NIM', margin, y);
      y += 3;
      doc.line(margin, y, W - margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const lines = doc.splitTextToSize(handover.note, cw);
      doc.text(lines, margin, y);
    }

    // ── Footer ───────────────────────────────────────────────────
    doc.setFillColor(107, 114, 126);
    doc.rect(0, H - 14, W, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Ky dokument u gjenerua automatikisht. E\u00ebsht\u00eb i vlefsh\u00ebm pa n\u00ebnshkrime.', W / 2, H - 6, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    const file = new File([pdfBlob], `dorezim-${handover.id}.pdf`, { type: 'application/pdf' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    return Response.json({ file_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});