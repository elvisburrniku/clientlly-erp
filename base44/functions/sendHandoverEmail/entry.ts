import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const handoverId = body?.handoverId;
  if (!handoverId) return Response.json({ error: 'Missing handoverId' }, { status: 400 });

  const handovers = await base44.asServiceRole.entities.CashHandover.list();
  const handover = handovers.find(h => h.id === handoverId);
  if (!handover) return Response.json({ error: 'Handover not found' }, { status: 404 });

  const targetEmail = handover.user_email;
  if (!targetEmail) return Response.json({ error: 'No user email on handover' }, { status: 400 });

  const invoiceRows = (handover.invoices || []).map(inv =>
    `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${inv.invoice_number}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${inv.client_name}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">\u20ac${(inv.amount || 0).toFixed(2)}</td></tr>`
  ).join('');

  const emailBody = `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#4338CA;margin-bottom:4px">Dor\u00ebzim Kesh i Aprovuar</h2>
      <p style="color:#666;margin-top:0">Dor\u00ebzimi juaj u aprovua me sukses.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <thead><tr style="background:#f3f4f6">
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888">Nr. Fatur\u00ebs</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888">Klienti</th>
          <th style="padding:8px 12px;text-align:right;font-size:12px;color:#888">Shuma</th>
        </tr></thead>
        <tbody>${invoiceRows}</tbody>
      </table>
      <div style="margin-top:16px;padding:12px 16px;background:#f0fdf4;border-radius:8px">
        <strong>Total: \u20ac${(handover.amount || 0).toFixed(2)}</strong>
      </div>
      ${handover.note ? `<p style="color:#666;font-size:14px;margin-top:12px">Sh\u00ebnim: ${handover.note}</p>` : ''}
    </div>
  `;

  await base44.asServiceRole.integrations.Core.SendEmail({
    to: targetEmail,
    subject: `Dor\u00ebzimi i Kesh u Aprovua \u2014 \u20ac${(handover.amount || 0).toFixed(2)}`,
    body: emailBody,
  });

  return Response.json({ success: true });
});