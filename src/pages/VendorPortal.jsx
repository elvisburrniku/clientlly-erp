import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FileText, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function VendorPortal() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPortalData();
  }, [token]);

  const loadPortalData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/vendor/${token}`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Invalid token");
        setLoading(false);
        return;
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError("Gabim gjatë ngarkimit");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-10 text-center max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <Truck className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold mb-2">Link i Pavlefshëm</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const { supplier, expenses, payments } = data;
  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.total || e.amount || 0), 0);
  const totalPayments = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  const statusBadge = (status) => {
    const styles = {
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-blue-100 text-blue-700",
      paid: "bg-emerald-100 text-emerald-700",
      rejected: "bg-red-100 text-red-700",
    };
    const labels = { pending: "Në Pritje", approved: "Aprovuar", paid: "Paguar", rejected: "Refuzuar" };
    return (
      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", styles[status] || "bg-muted text-muted-foreground")}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b border-border/40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Portali i Furnitorit</p>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-vendor-name">{supplier.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{supplier.email}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10 space-y-8">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Informacioni</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Emri</p>
              <p className="font-semibold">{supplier.name}</p>
            </div>
            {supplier.email && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="font-semibold">{supplier.email}</p>
              </div>
            )}
            {supplier.phone && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Telefon</p>
                <p className="font-semibold">{supplier.phone}</p>
              </div>
            )}
            {supplier.address && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Adresa</p>
                <p className="font-semibold">{supplier.address}</p>
              </div>
            )}
            {supplier.contact_person && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Personi i Kontaktit</p>
                <p className="font-semibold">{supplier.contact_person}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej Fatura</p>
            <p className="text-2xl font-bold mt-2" data-testid="text-total-expenses">{expenses.length}</p>
            <p className="text-xs text-muted-foreground mt-1">€{totalExpenses.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pagesa</p>
            <p className="text-2xl font-bold mt-2 text-emerald-600">{payments.length}</p>
            <p className="text-xs text-muted-foreground mt-1">€{totalPayments.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bilanci</p>
            <p className={cn("text-2xl font-bold mt-2", (totalExpenses - totalPayments) > 0 ? "text-red-600" : "text-emerald-600")}>
              €{(totalExpenses - totalPayments).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold">Faturat / Shpenzimet</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Përshkrimi</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Shuma</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Data</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Statusi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                          <FileText className="w-7 h-7 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">Nuk ka fatura</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-expense-${exp.id}`}>
                      <td className="px-6 py-4 text-sm">{exp.description || exp.category_name || "—"}</td>
                      <td className="px-6 py-4 text-sm font-bold">€{parseFloat(exp.total || exp.amount || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {moment(exp.expense_date || exp.created_at).format("DD MMM YYYY")}
                      </td>
                      <td className="px-6 py-4">{statusBadge(exp.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {payments.length > 0 && (
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Historiku i Pagesave</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Referenca</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Shuma</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Data</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Metoda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 text-sm">{p.reference || p.invoice_number || "—"}</td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-600">€{parseFloat(p.amount || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {moment(p.payment_date || p.created_at).format("DD MMM YYYY")}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{p.payment_method || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
