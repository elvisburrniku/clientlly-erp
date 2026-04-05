import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Send, ToggleLeft, ToggleRight, Building2, Calendar, CreditCard, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";
import InvoicePDFButton from "../components/invoices/InvoicePDFButton";
import SendInvoiceDialog from "../components/invoices/SendInvoiceDialog";
import WarehouseSlip from "../components/invoices/WarehouseSlip";

const COMPANY = {
  name: "Emri i Kompanisë",
  email: "email@company.com",
  phone: "+355 6X XXX XXXX",
  address: "Adresa e kompanisë"
};

const statusConfig = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-700 border-slate-300" },
  sent: { label: "Dërguar", cls: "bg-blue-100 text-blue-700 border-blue-300" },
  paid: { label: "Paguar", cls: "bg-green-100 text-green-700 border-green-300" },
  overdue: { label: "Vonuar", cls: "bg-red-100 text-red-700 border-red-300" },
  cancelled: { label: "Anuluar", cls: "bg-gray-100 text-gray-700 border-gray-300" },
  partially_paid: { label: "Pjesërisht Paguar", cls: "bg-amber-100 text-amber-700 border-amber-300" }
};

const toNumber = (value) => {
  const parsed = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const firstNumber = (...values) => {
  for (const value of values) {
    const parsed = typeof value === "number" ? value : parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const firstText = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const normalizeInvoiceItem = (item) => {
  const quantity = firstNumber(item.quantity, 1);
  const priceExVat = firstNumber(item.price_ex_vat, item.unit_price, item.price);
  const vatRate = firstNumber(item.vat_rate, item.tax_rate, item.tax);
  const priceIncVat = firstNumber(
    item.price_inc_vat,
    item.price_with_tax,
    quantity > 0 && item.total !== undefined ? toNumber(item.total) / quantity : undefined,
    priceExVat * (1 + vatRate / 100),
  );
  const lineTotal = firstNumber(
    item.line_total,
    item.total,
    priceIncVat * quantity,
    priceExVat * quantity * (1 + vatRate / 100),
  );

  return {
    ...item,
    name: firstText(item.name, item.product_name, item.description, "Shërbim"),
    type: item.type || (item.product_id || item.source_product_id ? "product" : "service"),
    quantity,
    unit: firstText(item.unit, "Shërbim"),
    price_ex_vat: priceExVat,
    price_inc_vat: priceIncVat,
    vat_rate: vatRate,
    line_total: lineTotal,
  };
};

const normalizeInvoice = (rawInvoice) => {
  if (!rawInvoice) return null;

  return {
    ...rawInvoice,
    subtotal: toNumber(rawInvoice.subtotal),
    vat_amount: toNumber(rawInvoice.vat_amount),
    amount: toNumber(rawInvoice.amount),
    paid_amount: toNumber(rawInvoice.paid_amount),
    items: Array.isArray(rawInvoice.items)
      ? rawInvoice.items.map(normalizeInvoiceItem)
      : [],
  };
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendOpen, setSendOpen] = useState(false);
  const [warehouseSlipOpen, setWarehouseSlipOpen] = useState(false);

  useEffect(() => { loadInvoice(); }, [id]);

  const loadInvoice = async () => {
    const data = await base44.entities.Invoice.filter({ id });
    setInvoice(normalizeInvoice(data[0] || null));
    setLoading(false);
  };

  const toggleOpen = async () => {
    await base44.entities.Invoice.update(invoice.id, { is_open: !invoice.is_open });
    toast.success(invoice.is_open ? "Fatura u mbyll" : "Fatura u hap");
    loadInvoice();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!invoice) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <p className="text-muted-foreground">Fatura nuk u gjet.</p>
      <Button variant="outline" onClick={() => navigate("/invoices")}>Kthehu</Button>
    </div>
  );

  const sc = statusConfig[invoice.status] || statusConfig.draft;
  const items = invoice.items || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-border px-6 py-3 flex items-center justify-between gap-4">
        <button onClick={() => navigate("/invoices")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Kthehu te Faturat
        </button>
        <div className="flex items-center gap-2">
           <button onClick={toggleOpen} className="flex items-center gap-1.5 text-xs font-medium border border-border rounded-lg px-3 py-1.5 hover:bg-muted/50 transition-colors">
             {invoice.is_open !== false
               ? <><ToggleRight className="w-4 h-4 text-emerald-500" /><span className="text-emerald-600">Hapur</span></>
               : <><ToggleLeft className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Mbyllur</span></>
             }
           </button>
           {invoice?.items?.some(i => i.type === 'product') && (
             <Button size="sm" variant="outline" className="gap-2" onClick={() => setWarehouseSlipOpen(true)}>
               <Package className="w-3.5 h-3.5" /> Fletëdalje
             </Button>
           )}
           <InvoicePDFButton invoice={invoice} />
           <Button size="sm" className="gap-2" onClick={() => setSendOpen(true)}>
             <Send className="w-3.5 h-3.5" /> Dërgo
           </Button>
         </div>
      </div>

      {/* Invoice document */}
      <div className="max-w-4xl mx-auto p-6 lg:p-10">
        <div className="bg-white rounded-3xl shadow-xl border border-border/40 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 px-10 py-10 text-white">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{COMPANY.name}</p>
                    <p className="text-indigo-200 text-sm">{COMPANY.email}</p>
                  </div>
                </div>
                <p className="text-indigo-200 text-sm">{COMPANY.phone}</p>
                <p className="text-indigo-200 text-sm">{COMPANY.address}</p>
              </div>
              <div className="text-right">
                <p className="text-indigo-200 text-sm uppercase tracking-widest font-semibold mb-1">Faturë</p>
                <p className="text-3xl font-bold mb-2">{invoice.invoice_number}</p>
                <span className={cn("text-xs font-semibold px-3 py-1 rounded-full border", sc.cls)}>
                  {sc.label}
                </span>
              </div>
            </div>
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
            {[
              { icon: Calendar, label: "Data", value: moment(invoice.created_date).format("DD MMM YYYY") },
              { icon: Calendar, label: "Afati", value: invoice.due_date || "—" },
              { icon: CreditCard, label: "Pagesa", value: invoice.payment_method || "—" },
              { icon: Building2, label: "Lëshuar nga", value: invoice.issued_by || "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-muted/30 px-6 py-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
                </div>
                <p className="text-sm font-semibold capitalize">{value}</p>
              </div>
            ))}
          </div>

          <div className="px-10 py-8 space-y-8">
            {/* Client */}
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 bg-muted/20 rounded-2xl p-5 border border-border/50">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Faturuar për</p>
                <p className="text-lg font-bold text-foreground">{invoice.client_name}</p>
                {invoice.client_email && <p className="text-sm text-muted-foreground mt-1">{invoice.client_email}</p>}
                {invoice.client_phone && <p className="text-sm text-muted-foreground">{invoice.client_phone}</p>}
              </div>
              {invoice.description && (
                <div className="flex-1 bg-amber-50 rounded-2xl p-5 border border-amber-100">
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">Shënime</p>
                  <p className="text-sm text-foreground leading-relaxed">{invoice.description}</p>
                </div>
              )}
            </div>

            {/* Items table */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Artikujt / Shërbimet</p>
              <div className="rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Përshkrimi</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Lloji</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Sasi</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Njësia</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Çm. pa TVSH</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">TVSH%</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan={7} className="text-center text-muted-foreground py-8 text-sm">Nuk ka artikuj</td></tr>
                    ) : items.map((item, i) => (
                      <tr key={i} className={cn("border-b border-border last:border-0", i % 2 === 0 ? "bg-white" : "bg-muted/10")}>
                        <td className="px-4 py-3 font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", item.type === "product" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700")}>
                            {item.type === "product" ? "Produkt" : "Shërbim"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                        <td className="px-4 py-3 text-right">€{(item.price_ex_vat || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{item.vat_rate || 0}%</td>
                        <td className="px-4 py-3 text-right font-semibold">€{(item.line_total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Warehouse Slip Products */}
            {items.some(i => i.type === 'product') && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-blue-600" />
                  <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Produktet e Fletëdaljes</p>
                </div>
                <div className="space-y-2">
                  {items.filter(i => i.type === 'product').map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-100">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Sasia: {item.quantity} {item.unit}</p>
                      </div>
                      <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">✓ Në Fletëdalje</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal (pa TVSH)</span>
                  <span className="font-medium">€{(invoice.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">TVSH</span>
                  <span className="font-medium">€{(invoice.vat_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center bg-gradient-to-r from-indigo-600 to-violet-700 text-white rounded-xl px-4 py-3 mt-3">
                  <span className="font-bold text-sm">TOTAL ME TVSH</span>
                  <span className="font-bold text-lg">€{(invoice.amount || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-muted/20 border-t border-border px-10 py-5 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Faleminderit për besimin tuaj!</p>
            <p className="text-xs text-muted-foreground">{COMPANY.email} · {COMPANY.phone}</p>
          </div>
        </div>
      </div>

      <SendInvoiceDialog invoice={invoice} open={sendOpen} onClose={() => setSendOpen(false)} />
      <WarehouseSlip invoice={invoice} open={warehouseSlipOpen} onClose={() => setWarehouseSlipOpen(false)} />
    </div>
  );
}
