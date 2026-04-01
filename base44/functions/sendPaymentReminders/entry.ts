import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const reminders = await base44.asServiceRole.entities.Reminder.list('-created_date', 100);
    const now = new Date();
    let sent = 0;

    for (const reminder of reminders) {
      if (!reminder.is_active) continue;

      const dueDate = new Date(reminder.due_date);
      const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      let shouldSend = false;
      if (reminder.reminder_type === 'before_due') {
        shouldSend = daysUntil === (reminder.days_before || 3);
      } else if (reminder.reminder_type === 'on_due') {
        shouldSend = daysUntil === 0;
      } else if (reminder.reminder_type === 'after_due') {
        shouldSend = daysUntil === -1;
      }

      if (!shouldSend) continue;

      const lastSent = reminder.last_sent ? new Date(reminder.last_sent) : null;
      if (lastSent && (now - lastSent) < 24 * 60 * 60 * 1000) {
        continue;
      }

      try {
        const subject = `Kujtesë: Fatura ${reminder.invoice_number} pret pagesën`;
        const body = `<p>Pershendetje ${reminder.client_name},</p>
<p>Ju kujtojmë se fatura <b>${reminder.invoice_number}</b> me vlerë <b>€${(reminder.amount || 0).toFixed(2)}</b> me afat <b>${new Date(reminder.due_date).toLocaleDateString('sq-AL')}</b> është ende e papaguar.</p>
<p>Ju lutem kryeni pagesën sa më parë.</p>
<p>Faleminderit!</p>`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: reminder.client_email,
          subject: subject,
          body: body,
        });

        await base44.asServiceRole.entities.Reminder.update(reminder.id, {
          last_sent: new Date().toISOString(),
        });

        sent++;
      } catch (err) {
        console.error(`Failed to send reminder for ${reminder.invoice_number}:`, err.message);
      }
    }

    return Response.json({ success: true, sent, message: `${sent} kujtesa u dërguan` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});