import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BUSINESS_WHATSAPP = "38349221223"; // business number without +
const BUSINESS_EMAIL_NAME = "ScentLinq Pro - info@scentlinqpro-ks.com";

const buildMessage = (inv) => {
  const items = (inv.items || []).map(it =>
    `  - ${it.name}: ${it.quantity} ${it.unit} x E${it.price_inc_vat} = E${it.line_total}`
  ).join("\n");
  return `Fatura ${inv.invoice_number}\nKlienti: ${inv.client_name}\n${items}\nSubtotal: E${(inv.subtotal||0).toFixed(2)}\nTVSH: E${(inv.vat_amount||0).toFixed(2)}\nTotal: E${(inv.amount||0).toFixed(2)}\nAfati: ${inv.due_date || "-"}`;
};

export default function SendInvoiceDialog({ invoice, open, onClose }) {
  const [sending, setSending] = useState(null);

  if (!invoice) return null;

  const message = buildMessage(invoice);
  const encodedMsg = encodeURIComponent(message);
  const phone = (invoice.client_phone || "").replace(/\s+/g, "");

  const handleEmail = async () => {
    setSending("email");
    const itemsHtml = (invoice.items || []).map(it =>
      `<tr><td>${it.name}</td><td>${it.quantity} ${it.unit}</td><td>€${it.price_inc_vat}</td><td>€${it.line_total}</td></tr>`
    ).join("");
    const body = `
      <h2>Fatura ${invoice.invoice_number}</h2>
      <p><b>Klienti:</b> ${invoice.client_name}</p>
      ${invoice.client_email ? `<p><b>Email:</b> ${invoice.client_email}</p>` : ""}
      ${invoice.client_phone ? `<p><b>Tel:</b> ${invoice.client_phone}</p>` : ""}
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
        <thead><tr><th>Artikulli</th><th>Sasia</th><th>Çmimi</th><th>Total</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <p>Subtotal: €${(invoice.subtotal||0).toFixed(2)}</p>
      <p>TVSH: €${(invoice.vat_amount||0).toFixed(2)}</p>
      <p><b>Total: €${(invoice.amount||0).toFixed(2)}</b></p>
      ${invoice.due_date ? `<p>Afati: ${invoice.due_date}</p>` : ""}
    `;
    await base44.integrations.Core.SendEmail({
      to: "info@scentlinqpro-ks.com",
      subject: `Fatura ${invoice.invoice_number} - ${invoice.client_name}`,
      body,
    });
    toast.success("Email u dërgua te info@scentlinqpro-ks.com");
    setSending(null);
    onClose();
  };

  const channels = [
    {
      key: "email",
      label: "Email",
      icon: Mail,
      color: "bg-blue-500",
      action: handleEmail,
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      color: "bg-green-500",
      href: phone ? `https://wa.me/${phone.replace(/\+/g,"")}?text=${encodedMsg}` : null,
      disabled: !phone,
    },
    {
      key: "viber",
      label: "Viber",
      icon: Phone,
      color: "bg-purple-500",
      href: phone ? `viber://chat?number=${phone}&text=${encodedMsg}` : null,
      disabled: !phone,
    },
    {
      key: "sms",
      label: "SMS",
      icon: Send,
      color: "bg-orange-500",
      href: phone ? `sms:${phone}?body=${encodedMsg}` : null,
      disabled: !phone,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Dërgo Faturën</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{invoice.invoice_number} — {invoice.client_name}</p>
        {!invoice.client_email && !invoice.client_phone && (
          <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            Klienti nuk ka email apo numër telefoni. Modifiko faturën dhe shto kontaktet.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {channels.map(({ key, label, icon: Icon, color, action, href, disabled }) => (
            <button
              key={key}
              disabled={disabled || sending === key}
              onClick={action || (() => href && window.open(href, "_blank"))}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200",
                disabled
                  ? "opacity-40 cursor-not-allowed bg-muted border-border"
                  : "hover:shadow-md hover:-translate-y-0.5 bg-white border-border cursor-pointer"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium">{sending === key ? "Duke dërguar..." : label}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground text-center pt-1">
          WhatsApp, Viber dhe SMS kërkojnë numër telefoni me prefiks ndërkombëtar (p.sh. +355...)
        </p>
      </DialogContent>
    </Dialog>
  );
}