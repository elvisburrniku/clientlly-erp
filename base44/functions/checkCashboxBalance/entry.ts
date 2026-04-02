import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all transactions to compute balance
    const transactions = await base44.asServiceRole.entities.CashTransaction.list('-created_date', 1000);
    const cashIn = transactions.filter(t => t.type === 'cash_in').reduce((s, t) => s + (t.amount || 0), 0);
    const cashOut = transactions.filter(t => t.type === 'cash_out').reduce((s, t) => s + (t.amount || 0), 0);
    const balance = cashIn - cashOut;

    // Get cashbox settings
    const settings = await base44.asServiceRole.entities.CashboxSettings.list('-created_date', 1);
    if (!settings.length) return Response.json({ checked: true, notified: false, reason: 'no_settings' });

    const cfg = settings[0];
    if (!cfg.notifications_enabled) return Response.json({ checked: true, notified: false, reason: 'disabled' });
    if (!cfg.alert_email) return Response.json({ checked: true, notified: false, reason: 'no_email' });

    const minBalance = cfg.min_balance ?? 50;

    if (balance < minBalance) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: cfg.alert_email,
        subject: `⚠️ Bilanci i Arkës është nën €${minBalance}`,
        body: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
            <div style="background:#4338CA;padding:16px 20px;border-radius:8px 8px 0 0;">
              <h2 style="color:#fff;margin:0;font-size:18px;">⚠️ Njoftim Bilanci i Ulët</h2>
            </div>
            <div style="padding:20px 0;">
              <p style="margin:0 0 12px;color:#374151;">Bilanci aktual i arkës ka rënë nën kufirin minimal.</p>
              <div style="display:flex;gap:12px;">
                <div style="flex:1;background:#fef2f2;border-radius:8px;padding:14px;">
                  <div style="font-size:11px;color:#991b1b;margin-bottom:4px;">BILANCI AKTUAL</div>
                  <div style="font-size:22px;font-weight:700;color:#dc2626;">€${balance.toFixed(2)}</div>
                </div>
                <div style="flex:1;background:#eff6ff;border-radius:8px;padding:14px;">
                  <div style="font-size:11px;color:#1e40af;margin-bottom:4px;">KUFIRI MINIMAL</div>
                  <div style="font-size:22px;font-weight:700;color:#4338CA;">€${minBalance.toFixed(2)}</div>
                </div>
              </div>
              <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">Ju lutem shtoni para në arkë sa më shpejt.</p>
            </div>
          </div>
        `
      });
      return Response.json({ checked: true, notified: true, balance });
    }

    return Response.json({ checked: true, notified: false, balance, reason: 'above_minimum' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});