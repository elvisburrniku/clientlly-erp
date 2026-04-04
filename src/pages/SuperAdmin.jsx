import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2, Users, ShieldCheck, Ban, Trash2, Database, CheckCircle2, Loader2, AlertCircle, X, ChevronDown, ChevronUp
} from "lucide-react";
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

const dbStatusConfig = {
  none: { label: "No Database", color: "bg-slate-100 text-slate-500", icon: null },
  provisioning: { label: "Provisioning...", color: "bg-amber-100 text-amber-700", icon: "loader" },
  active: { label: "Database Active", color: "bg-emerald-100 text-emerald-700", icon: "check" },
  failed: { label: "Failed", color: "bg-rose-100 text-rose-700", icon: "alert" },
};

function DatabaseStatusBadge({ status }) {
  const cfg = dbStatusConfig[status] || dbStatusConfig.none;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.icon === "loader" && <Loader2 className="w-3 h-3 animate-spin" />}
      {cfg.icon === "check" && <CheckCircle2 className="w-3 h-3" />}
      {cfg.icon === "alert" && <AlertCircle className="w-3 h-3" />}
      {cfg.label}
    </span>
  );
}

function ProgressLog({ entries }) {
  const bottomRef = useRef(null);
  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  return (
    <div className="bg-slate-900 text-slate-100 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-1">
      {entries.map((e, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-slate-500 shrink-0">{moment(e.time).format("HH:mm:ss")}</span>
          <span className={e.message.startsWith("Error") ? "text-rose-400" : "text-slate-100"}>{e.message}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

export default function SuperAdmin() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbStatuses, setDbStatuses] = useState({});
  const [activeJob, setActiveJob] = useState(null);
  const [jobProgress, setJobProgress] = useState([]);
  const [expandedLog, setExpandedLog] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    if (user?.role !== "superadmin") return;
    loadTenants();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [user]);

  const loadTenants = async () => {
    setLoading(true);
    const data = await base44.entities.Tenant.list("-created_date", 200);
    setTenants(data);
    setLoading(false);
    await loadDbStatuses();
  };

  const loadDbStatuses = async () => {
    try {
      const res = await fetch("/api/superadmin/tenants/database-status", { credentials: "include" });
      if (!res.ok) return;
      const rows = await res.json();
      const map = {};
      for (const row of rows) {
        map[row.id] = row;
      }
      setDbStatuses(map);
    } catch {}
  };

  const startPolling = (tenantId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/superadmin/tenants/${tenantId}/database-job`, { credentials: "include" });
        if (!res.ok) return;
        const job = await res.json();
        setJobProgress(job.progress || []);
        if (job.status === "active" || job.status === "failed" || job.status === "none") {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setActiveJob(prev => prev === tenantId ? null : prev);
          await loadDbStatuses();
          setDbStatuses(prev => ({
            ...prev,
            [tenantId]: { ...prev[tenantId], database_status: job.status },
          }));
        }
      } catch {}
    }, 3000);
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

  const createDatabase = async (tenant) => {
    setConfirming(null);
    setActiveJob(tenant.id);
    setJobProgress([]);
    setExpandedLog(tenant.id);

    setDbStatuses(prev => ({
      ...prev,
      [tenant.id]: { ...prev[tenant.id], database_status: "provisioning" },
    }));

    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}/create-database`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        setActiveJob(null);
        setDbStatuses(prev => ({
          ...prev,
          [tenant.id]: { ...prev[tenant.id], database_status: "failed" },
        }));
        alert(`Error: ${data.error}`);
        return;
      }
      startPolling(tenant.id);
    } catch (err) {
      setActiveJob(null);
      alert(`Error: ${err.message}`);
    }
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

  const totalWithDb = Object.values(dbStatuses).filter(d => d.database_status === "active").length;

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Super Admin</p>
        <h1 className="text-3xl font-bold tracking-tight">Menaxhimi i Tenantëve</h1>
        <p className="text-sm text-muted-foreground mt-1">Shiko dhe menaxho të gjitha kompanitë në sistem.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Gjithsej", value: tenants.length, color: "blue" },
          { label: "Aktiv", value: tenants.filter(t => t.status === "active").length, color: "emerald" },
          { label: "Suspendu", value: tenants.filter(t => t.status === "suspended").length, color: "amber" },
          { label: "Anuluar", value: tenants.filter(t => t.status === "cancelled").length, color: "rose" },
          { label: "DB Personale", value: totalWithDb, color: "violet" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-border/60 shadow-sm p-4">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

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
                  <th className="text-left p-4 font-semibold text-muted-foreground">Database</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Krijuar</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => {
                  const dbInfo = dbStatuses[tenant.id];
                  const dbStatus = dbInfo?.database_status || "none";
                  const isProvisioning = dbStatus === "provisioning" || activeJob === tenant.id;
                  const showLog = expandedLog === tenant.id && (isProvisioning || dbStatus === "active" || dbStatus === "failed");
                  const showConfirm = confirming === tenant.id;

                  return (
                    <React.Fragment key={tenant.id}>
                      <tr className="border-b border-border/50 hover:bg-muted/20 transition-colors">
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
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <DatabaseStatusBadge status={dbStatus} />
                              {(dbStatus === "active" || dbStatus === "failed") && jobProgress.length > 0 && activeJob === tenant.id && (
                                <button
                                  onClick={() => setExpandedLog(prev => prev === tenant.id ? null : tenant.id)}
                                  className="text-muted-foreground hover:text-foreground"
                                  data-testid={`toggle-log-${tenant.id}`}
                                >
                                  {expandedLog === tenant.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              )}
                            </div>
                            {dbStatus === "active" && dbInfo?.supabase_project_id && (
                              <span className="text-xs font-mono text-muted-foreground" data-testid={`project-ref-${tenant.id}`}>
                                ref: {dbInfo.supabase_project_id}
                              </span>
                            )}
                            {dbStatus === "active" && dbInfo?.database_provisioned_at && (
                              <span className="text-xs text-muted-foreground" data-testid={`provisioned-at-${tenant.id}`}>
                                {moment(dbInfo.database_provisioned_at).format("DD MMM YYYY")}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{moment(tenant.created_date).format("DD MMM YYYY")}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {tenant.status === "active" ? (
                              <Button size="sm" variant="outline" onClick={() => updateStatus(tenant, "suspended")} className="text-amber-600 border-amber-200 hover:bg-amber-50" data-testid={`suspend-${tenant.id}`}>
                                Suspendo
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => updateStatus(tenant, "active")} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" data-testid={`activate-${tenant.id}`}>
                                Aktivizo
                              </Button>
                            )}
                            {dbStatus === "none" || dbStatus === "failed" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isProvisioning}
                                onClick={() => setConfirming(tenant.id)}
                                className="text-violet-600 border-violet-200 hover:bg-violet-50"
                                data-testid={`create-db-${tenant.id}`}
                              >
                                <Database className="w-3 h-3 mr-1" />
                                {dbStatus === "failed" ? "Retry DB" : "Create DB"}
                              </Button>
                            ) : isProvisioning ? (
                              <Button size="sm" variant="outline" disabled className="text-amber-600 border-amber-200" onClick={() => setExpandedLog(prev => prev === tenant.id ? null : tenant.id)} data-testid={`provisioning-${tenant.id}`}>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Provisioning
                              </Button>
                            ) : null}
                            <Button size="sm" variant="ghost" onClick={() => deleteTenant(tenant)} className="text-destructive hover:bg-destructive/10" data-testid={`delete-${tenant.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {showConfirm && (
                        <tr key={`confirm-${tenant.id}`} className="bg-violet-50 border-b border-border/50">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="font-semibold text-violet-900">Krijo Database Personale për <span className="font-bold">{tenant.name}</span>?</p>
                                <p className="text-sm text-violet-700 mt-0.5">
                                  Kjo do të krijojë një projekt Supabase të ri, do të ekzekutojë migrimet e schemës dhe do të kopjojë të gjitha të dhënat e tenantit. Ky proces mund të zgjasë 2–5 minuta.
                                </p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Button size="sm" variant="outline" onClick={() => setConfirming(null)} data-testid={`cancel-confirm-${tenant.id}`}>
                                  <X className="w-3 h-3 mr-1" /> Anulo
                                </Button>
                                <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={() => createDatabase(tenant)} data-testid={`confirm-create-db-${tenant.id}`}>
                                  <Database className="w-3 h-3 mr-1" /> Konfirmo
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {showLog && jobProgress.length > 0 && (
                        <tr key={`log-${tenant.id}`} className="bg-slate-950 border-b border-border/50">
                          <td colSpan={8} className="px-6 py-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Migration Log</p>
                              <button onClick={() => setExpandedLog(null)} className="text-slate-500 hover:text-slate-300" data-testid={`close-log-${tenant.id}`}>
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <ProgressLog entries={jobProgress} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
