import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all open invoices
    const invoices = await base44.asServiceRole.entities.Invoice.list('-created_date', 1000);
    const settings = await base44.asServiceRole.entities.InvoiceSettings.list('-created_date', 1);
    
    const config = settings.length > 0 ? settings[0] : {};
    const daysBefore = config.payment_reminder_days_before || 3;
    const daysAfter = config.payment_reminder_days_after || 5;
    
    const today = new Date();
    let remindersSent = 0;
    
    for (const invoice of invoices) {
      // Only process open invoices with client email
      if (!invoice.is_open || !invoice.client_email) continue;
      
      if (!invoice.due_date) continue;
      
      const dueDate = new Date(invoice.due_date);
      const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
      
      let shouldSend = false;
      let reminderType = '';
      
      // Send reminder X days before due date
      if (daysUntilDue === daysBefore && daysUntilDue > 0) {
        shouldSend = true;
        reminderType = 'before';
      }
      // Send reminder X days after due date
      else if (daysUntilDue === -daysAfter && daysUntilDue < 0) {
        shouldSend = true;
        reminderType = 'after';
      }
      
      if (shouldSend) {
        const subject = reminderType === 'before' 
          ? `Kujtesë: Fatura ${invoice.invoice_number} do të shënohet si e vonuar në ${invoice.due_date}`
          : `Kujtesë urgjente: Fatura ${invoice.invoice_number} është e vonuar`;
        
        const body = reminderType === 'before'
          ? `<p>Pershendetje ${invoice.client_name},</p><p>Ju kujtojmë se fatura <b>${invoice.invoice_number}</b> me vlerë <b>€${(invoice.amount || 0).toFixed(2)}</b> do të shënohet si e vonuar pas datës <b>${invoice.due_date}</b>.</p><p>Ju lutem kryeni pagesën sa më parë.</p><p>Faleminderit!</p>`
          : `<p>Pershendetje ${invoice.client_name},</p><p>Fatura <b>${invoice.invoice_number}</b> me vlerë <b>€${(invoice.amount || 0).toFixed(2)}</b> ka kaluar afatin e pagesës (<b>${invoice.due_date}</b>) dhe është aktualisht e vonuar.</p><p>Ju lutem kryeni pagesën sa më parë.</p><p>Faleminderit!</p>`;
        
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: invoice.client_email,
            subject: subject,
            body: body,
          });
          remindersSent++;
        } catch (err) {
          console.error(`Failed to send reminder for invoice ${invoice.invoice_number}:`, err.message);
        }
      }
    }
    
    return Response.json({ success: true, remindersSent: remindersSent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});