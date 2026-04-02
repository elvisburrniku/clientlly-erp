import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { FileText, ChevronRight, Eye, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusColors = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  partially_paid: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-700",
};

export default function RecentInvoices() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!tenantId) return;
    fetchRecentInvoices();
  }, [tenantId]);

  const fetchRecentInvoices = async () => {
    try {
      const data = await base44.entities.Invoice.filter(
        { tenant_id: tenantId },
        "-created_date",
        5
      );
      setInvoices(data);
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (inv) => {
    if (!window.confirm(`Fshi faturën ${inv.invoice_number}?`)) return;
    await base44.entities.Invoice.delete(inv.id);
    toast.success("Fatura u fshi");
    fetchRecentInvoices();
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 h-96 flex items-center justify-center">
        <div className="w-6 h-6 border-3 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-base font-semibold text-foreground">Faturat e Fundit</h3>
        </div>
        <button
          onClick={() => navigate("/invoices")}
          className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
        >
          Shiko të gjitha
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8">Nuk ka faturat e fundit.</p>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <button
                onClick={() => navigate(`/invoices/${inv.id}`)}
                className="text-left flex-1"
              >
                <p className="text-sm font-medium text-foreground">
                  {inv.invoice_number}
                </p>
                <p className="text-xs text-muted-foreground">
                  {inv.client_name}
                </p>
              </button>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    €{(inv.amount || 0).toLocaleString()}
                  </p>
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-1 rounded-full",
                      statusColors[inv.status] || statusColors.draft
                    )}
                  >
                    {inv.status === "paid" && "Paguar"}
                    {inv.status === "sent" && "Dërguar"}
                    {inv.status === "draft" && "Skicë"}
                    {inv.status === "partially_paid" && "Pjes.paguar"}
                    {inv.status === "overdue" && "Vonuar"}
                    {inv.status === "cancelled" && "Anuluar"}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <Eye className="w-4 h-4 mr-2" /> Shiko Faturën
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <Pencil className="w-4 h-4 mr-2" /> Modifiko
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(inv)} className="text-destructive focus:text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" /> Fshi Faturën
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}