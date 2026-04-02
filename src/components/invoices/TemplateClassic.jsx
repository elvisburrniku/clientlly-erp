import { useAuth } from "@/lib/AuthContext";

export default function TemplateClassic({ invoice, template }) {
  const { user } = useAuth();

  if (template !== "classic") return null;

  return (
    <div className="bg-white p-12 font-serif text-black" style={{ width: "210mm", height: "297mm" }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-5xl font-light text-gray-400 mb-2">INVOICE</h1>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-semibold">{user?.tenant_name || "Company Name"}</h2>
          <p className="text-sm text-gray-600">Trucking Service</p>
        </div>
      </div>

      {/* Bill From / To */}
      <div className="grid grid-cols-3 gap-12 mb-12">
        <div>
          <p className="font-semibold mb-2">Bill from:</p>
          <p className="text-sm font-semibold">{user?.full_name || "Name Surname"}</p>
          <p className="text-sm text-gray-600">123, Street, City, 1234</p>
          <p className="text-sm text-gray-600">+00 123 456 789</p>
        </div>
        <div>
          <p className="font-semibold mb-2">Bill to:</p>
          <p className="text-sm font-semibold">{invoice.client_name}</p>
          <p className="text-sm text-gray-600">{invoice.client_address || "123, Street, City, 1234"}</p>
          <p className="text-sm text-gray-600">{invoice.client_phone || "+00 123 456 789"}</p>
        </div>
        <div className="text-right">
          <div className="mb-4">
            <p className="text-sm text-gray-600">Invoice</p>
            <p className="text-2xl font-semibold">{invoice.invoice_number}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date</p>
            <p className="text-lg font-semibold">{new Date(invoice.created_date).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-12">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-3 text-sm font-semibold">Description</th>
              <th className="text-right py-3 text-sm font-semibold">Price</th>
              <th className="text-center py-3 text-sm font-semibold">Qty</th>
              <th className="text-right py-3 text-sm font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, i) => (
              <tr key={i} className="border-b border-gray-200">
                <td className="py-3 text-sm">#{i + 1} {item.name}</td>
                <td className="text-right py-3 text-sm">${item.price_inc_vat?.toFixed(2) || "0.00"}</td>
                <td className="text-center py-3 text-sm">{item.quantity}</td>
                <td className="text-right py-3 text-sm">${item.line_total?.toFixed(2) || "0.00"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-12 space-y-2 w-80">
        <div className="flex justify-between w-full">
          <span className="text-sm">Subtotal</span>
          <span className="text-sm">${invoice.subtotal?.toFixed(2) || "0.00"}</span>
        </div>
        <div className="flex justify-between w-full">
          <span className="text-sm">Tax</span>
          <span className="text-sm">${invoice.vat_amount?.toFixed(2) || "0.00"}</span>
        </div>
        <div className="flex justify-between w-full border-t-2 border-gray-400 pt-2 mt-2">
          <span className="font-semibold">Total</span>
          <span className="font-semibold">${invoice.amount?.toFixed(2) || "0.00"}</span>
        </div>
      </div>

      {/* Payment & Terms */}
      <div className="grid grid-cols-2 gap-12 text-sm">
        <div>
          <p className="font-semibold mb-2">Payment method</p>
          <p className="text-gray-600 text-xs">{invoice.payment_notes || "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod."}</p>
        </div>
        <div>
          <p className="font-semibold mb-2">Terms & conditions</p>
          <p className="text-gray-600 text-xs">Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod. Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.</p>
        </div>
      </div>
    </div>
  );
}