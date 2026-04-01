import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Mail, MessageCircle, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const buildMessage = (inv) => {
  const items = (inv.items || []).map(it =>
    `  - ${it.name}: ${it.quantity} ${it.unit} x €${it.price_inc_vat} = €${it.line_total}`
  ).join("\n");
  return `Fatura ${inv.invoice_number}\nKlienti: ${inv.client_name}\n${items}\nSubtotal: €${(inv.subtotal||0).toFixed(2)}\nTVSH: €${(inv.vat_amount||0).toFixed(2)}\nTotal: €${(inv.amount||0).toFixed(2)}\nAfati: ${inv.due_date || "—"}`;
};

export default function SendInvoiceDialog({ invoice, open, onClose }) {
  const [sending, setSending] = useState(null);

  if (!invoice) return null;

  const message = buildMessage(invoice);
  const encodedMsg = encodeURIComponent(message);
  const phone = (invoice.client_phone || "").replace(/\s+/g, "");

  const handleEmail = async () => {
    if (!invoice.client_email) { toast.error("Klienti nuk ka email!"); return; }
    setSending("email");
    await base44.integrations.Core.SendEmail({
      to: invoice.client_email,
      subject: `Fatura ${invoice.invoice_number}`,
      body: `<pre style="font-family:sans-serif">${message}</pre>`,
    });
    toast.success("Email u dërgua!");
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
      href: phone ? `https://wa.me/${phone}?text=${encodedMsg}` : null,
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