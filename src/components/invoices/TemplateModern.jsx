import { useAuth } from "@/lib/AuthContext";

export default function TemplateModern({ invoice, template }) {
  const { user } = useAuth();

  if (template !== "modern") return null;

  return (
    <div className="bg-gray-50 p-12" style={{ width: "210mm", height: "297mm" }}>
      <div className="bg-white p-10 rounded-lg shadow-lg h-full flex flex-col">
        {/* Header */}
        <div className="border-b-4 border-blue-600 pb-8 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-600 mb-1">COMPANY</p>
              <h1 className="text-3xl font-bold text-gray-900">{user?.tenant_name || "Dental Clinic"}</h1>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-blue-600">invoice</p>
              <p className="text-sm text-gray-500 mt-2">{new Date(invoice.created_date).toLocaleDateString("en-GB")}</p>
            </div>
          </div>
        </div>

        {/* Invoice Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-bold text-gray-600 mb-3">Invoice number</p>
            <p className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-600 mb-3">Invoice to</p>
            <p className="text-sm font-semibold text-gray-900">{invoice.client_name}</p>
            <p className="text-sm text-gray-600 mt-1">{invoice.client_address || "Address not provided"}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8 flex-1">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 text-xs font-bold text-gray-600 uppercase">description</th>
                <th className="text-right py-3 text-xs font-bold text-gray-600 uppercase">price</th>
                <th className="text-center py-3 text-xs font-bold text-gray-600 uppercase">qty</th>
                <th className="text-right py-3 text-xs font-bold text-gray-600 uppercase">total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="py-4 text-sm text-gray-700">{item.name}</td>
                  <td className="text-right py-4 text-sm text-gray-700">${item.price_inc_vat?.toFixed(2) || "0.00"}</td>
                  <td className="text-center py-4 text-sm text-gray-700">0{item.quantity}</td>
                  <td className="text-right py-4 text-sm text-gray-700">${item.line_total?.toFixed(2) || "0.00"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8 space-y-1 w-64">
          <div className="flex justify-between w-full text-sm">
            <span className="text-gray-600">subtotal</span>
            <span className="text-gray-900 font-semibold">${invoice.subtotal?.toFixed(2) || "0.00"}</span>
          </div>
          <div className="flex justify-between w-full text-sm border-b border-gray-300 pb-2 mb-2">
            <span className="text-gray-600">total 21%</span>
            <span className="text-gray-900 font-semibold">${invoice.amount?.toFixed(2) || "0.00"}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-6">
          <p className="text-xs font-bold text-gray-600 mb-2">Payment Conditions</p>
          <p className="text-xs text-gray-600 mb-6">{invoice.payment_notes || "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod. Ut wisi enim."}</p>
          
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-gray-600">@{user?.email?.split("@")[0] || "company"}</p>
              <div className="flex gap-3 mt-2">
                <span className="text-sm text-gray-600">📱</span>
                <span className="text-sm text-gray-600">f</span>
                <span className="text-sm text-gray-600">🎥</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">wecare.com</p>
            </div>
            <div className="w-16 h-16 border-4 border-blue-600 rounded-full flex items-center justify-center">
              <span className="text-2xl">😊</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}