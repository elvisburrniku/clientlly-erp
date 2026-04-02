import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, ShieldCheck, Ban, Trash2 } from "lucide-react";
import moment from "moment";

const statusColor = {
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-amber-100 text-amber-700",
  cancelled: "bg-rose-100 text-rose-700",
};

const planColor = {
  free: "bg-slate-100 text-slate-600",
  starter: "bg-blue-100 text-blue-700",
  pro: "bg-violet-100 text-violet-700",
};

export default function SuperAdmin() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== "superadmin") return;
    loadTenants();
  }, [user]);

  const loadTenants = async () => {
    setLoading(true);
    const data = await base44.entities.Tenant.list("-created_date", 200);
    setTenants(data);
    setLoading(false);
  };

  const updateStatus = async (tenant, status) => {
    await base44.entities.Tenant.update(tenant.id, { status });
    setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, status } : t));
  };

  const deleteTenant = async (tenant) => {
    if (!confirm(`Fshi tenancin "${tenant.name}"? Kjo veprim është i pakthyeshëm.`)) return;
    await base44.entities.Tenant.delete(tenant.id);
    setTenants(prev => prev.filter(t => t.id !== tenant.id));
  };

  if (user?.role !== "superadmin") {
    return (
      <div className="p-10 text-center">
        <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-lg font-semibold">Qasje e Ndaluar</p>
        <p className="text-sm text-muted-foreground">Vetëm super administratorët mund ta shikojnë këtë faqe.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Super Admin</p>
        <h1 className="text-3xl font-bold tracking-tight">Menaxhimi i Tenantëve</h1>
        <p className="text-sm text-muted-foreground mt-1">Shiko dhe menaxho të gjitha kompanitë në sistem.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Gjithsej", value: tenants.length, icon: Building2, color: "blue" },
          { label: "Aktiv", value: tenants.filter(t => t.status === "active").length, icon: ShieldCheck, color: "emerald" },
          { label: "Suspendu", value: tenants.filter(t => t.status === "suspended").length, icon: Ban, color: "amber" },
          { label: "Anuluar", value: tenants.filter(t => t.status === "cancelled").length, icon: Trash2, color: "rose" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-border/60 shadow-sm p-4">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Duke ngarkuar...</div>
        ) : tenants.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">Nuk ka tenantë të regjistruar.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Kompania</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Kodi</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Pronari</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Statusi</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Plani</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Krijuar</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium">{tenant.name}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">{tenant.code}</td>
                    <td className="p-4 text-muted-foreground">{tenant.owner_email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[tenant.status]}`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${planColor[tenant.plan]}`}>
                        {tenant.plan}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">{moment(tenant.created_date).format("DD MMM YYYY")}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {tenant.status === "active" ? (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(tenant, "suspended")} className="text-amber-600 border-amber-200 hover:bg-amber-50">
                            Suspendo
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(tenant, "active")} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                            Aktivizo
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteTenant(tenant)} className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}