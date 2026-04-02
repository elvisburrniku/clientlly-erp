import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all open quotes (not expired or converted)
    const quotes = await base44.entities.Quote.filter({
      status: { $in: ['draft', 'sent'] }
    }, '-created_date', 1000);

    const now = new Date();
    let remindersSent = 0;
    let quotesConverted = 0;

    for (const quote of quotes) {
      const validUntil = new Date(quote.valid_until);
      const daysUntilExpiry = Math.floor((validUntil - now) / (1000 * 60 * 60 * 24));

      // Send reminder 3 days before expiry
      if (daysUntilExpiry === 3 && quote.client_email) {
        await base44.integrations.Core.SendEmail({
          to: quote.client_email,
          subject: `Përgjigje e domosdoshme: Oferta ${quote.quote_number} - Vlefshme për 3 Ditë`,
          body: `Përshëndetje ${quote.client_name},\n\nOferta juaj nr. ${quote.quote_number} do të skadojë në ${validUntil.toLocaleDateString('sq-AL')}.\n\nShuma: €${(quote.amount || 0).toFixed(2)}\n\nJu lutemi të na njoftoni nëse e pranoni apo refuzoni këtë ofertë.\n\nMe përshëndetje`
        });
        remindersSent++;
      }

      // Mark as expired if past due date
      if (daysUntilExpiry < 0 && quote.status !== 'expired') {
        await base44.entities.Quote.update(quote.id, { status: 'expired' });
      }
    }

    return Response.json({
      success: true,
      remindersSent,
      quotesConverted
    });
  } catch (error) {
    console.error('Error in sendQuoteReminder:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});