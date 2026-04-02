import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { templateId } = await req.json();

    // Fetch template
    const template = await base44.entities.ReportTemplate.get(templateId);
    if (!template || template.tenant_id !== user.tenant_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch data
    const [invoices, expenses, cashTransactions, clients] = await Promise.all([
      base44.entities.Invoice.filter({ tenant_id: user.tenant_id }, '-created_date', 100),
      base44.entities.Expense.filter({ tenant_id: user.tenant_id }, '-created_date', 100),
      base44.entities.CashTransaction.filter({ tenant_id: user.tenant_id }, '-created_date', 100),
      base44.entities.Client.filter({ tenant_id: user.tenant_id }, '-created_date', 100),
    ]);

    // Calculate metrics
    const totalRevenue = invoices.reduce((s, i) => s + (i.amount || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const paidInvoices = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);
    const cashBalance = cashTransactions.reduce((s, t) => s + (t.type === 'cash_in' ? t.amount : -t.amount), 0);
    const debtors = invoices.filter(i => i.status === 'overdue' || i.status === 'partially_paid');

    // Generate PDF
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, H = 297, margin = 15, cw = W - margin * 2;
    let y = 20;

    // Header
    pdf.setFillColor(67, 56, 202);
    pdf.rect(0, 0, W, 30, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(template.custom_title || 'RAPORT FINANCIAR', margin, y);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Periudha: ${new Date().toLocaleDateString('sq-AL')}`, margin, y + 8);
    y = 45;

    // Summary section
    if (template.include_sections.includes('summary')) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(67, 56, 202);
      pdf.text('PËRMBLEDHJA FINANCIARE', margin, y);
      y += 10;

      const summaryData = [
        { label: 'Të ardhura Totale', value: `€${totalRevenue.toFixed(2)}` },
        { label: 'Shpenzime Totale', value: `€${totalExpenses.toFixed(2)}` },
        { label: 'Fitim Neto', value: `€${(totalRevenue - totalExpenses).toFixed(2)}` },
        { label: 'Pagese Totale', value: `€${paidInvoices.toFixed(2)}` },
        { label: 'Bilanci Arkës', value: `€${cashBalance.toFixed(2)}` },
        { label: 'Debtorë të Vjetëruar', value: debtors.length.toString() },
      ];

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(40, 40, 40);

      summaryData.forEach((item, idx) => {
        if (y > 260) { pdf.addPage(); y = 20; }
        if (idx % 2 === 0) {
          pdf.setFillColor(240, 240, 250);
          pdf.rect(margin, y - 5, cw, 8, 'F');
        }
        pdf.text(item.label, margin + 2, y);
        pdf.setFont('helvetica', 'bold');
        pdf.text(item.value, W - margin - 2, y, { align: 'right' });
        pdf.setFont('helvetica', 'normal');
        y += 8;
      });
      y += 5;
    }

    // Invoices section
    if (template.include_sections.includes('invoices') && invoices.length > 0) {
      if (y > 250) { pdf.addPage(); y = 20; }
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(67, 56, 202);
      pdf.text('FATURATE', margin, y);
      y += 8;

      pdf.setFontSize(9);
      pdf.setTextColor(40, 40, 40);
      invoices.slice(0, 10).forEach((inv, idx) => {
        if (y > 270) { pdf.addPage(); y = 20; }
        pdf.text(`${inv.invoice_number} - ${inv.client_name}`, margin + 2, y);
        pdf.text(`€${inv.amount.toFixed(2)}`, W - margin - 2, y, { align: 'right' });
        y += 6;
      });
      y += 3;
    }

    // Expenses section
    if (template.include_sections.includes('expenses') && expenses.length > 0) {
      if (y > 250) { pdf.addPage(); y = 20; }
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(67, 56, 202);
      pdf.text('SHPENZIME', margin, y);
      y += 8;

      pdf.setFontSize(9);
      pdf.setTextColor(40, 40, 40);
      expenses.slice(0, 10).forEach((exp) => {
        if (y > 270) { pdf.addPage(); y = 20; }
        pdf.text(`${exp.description || exp.category} - €${exp.amount.toFixed(2)}`, margin + 2, y);
        y += 6;
      });
    }

    // Footer
    pdf.setFillColor(67, 56, 202);
    pdf.rect(0, H - 10, W, 10, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.text('Raport i gjeneruar automatikisht', W / 2, H - 3, { align: 'center' });

    const pdfBytes = pdf.output('arraybuffer');
    const base64Pdf = btoa(String.fromCharCode.apply(null, new Uint8Array(pdfBytes)));

    // Send email
    await base44.integrations.Core.SendEmail({
      to: template.recipient_emails.join(','),
      subject: `${template.custom_title || 'Raport Financiar'} - ${new Date().toLocaleDateString('sq-AL')}`,
      body: `
        <h2>${template.custom_title || 'Raport Financiar Mujor'}</h2>
        <p>Përshëndetje,</p>
        <p>Në shtesë gjendet raporti financiar për periudhën e kërkuar.</p>
        <p><strong>Përmbledhja:</strong></p>
        <ul>
          <li>Të ardhura Totale: €${totalRevenue.toFixed(2)}</li>
          <li>Shpenzime Totale: €${totalExpenses.toFixed(2)}</li>
          <li>Fitim Neto: €${(totalRevenue - totalExpenses).toFixed(2)}</li>
          <li>Pagese Totale: €${paidInvoices.toFixed(2)}</li>
        </ul>
        <p>Më shumë detaje në shtesë.</p>
      `
    });

    return Response.json({ success: true, message: 'Raporti u dërgua me sukses' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});