import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import { TenantProvider, useTenant } from "@/lib/TenantContext";
import { useAuth } from "@/lib/AuthContext";
import { useEffect } from "react";

function TenantGate() {
  const { needsOnboarding, isLoadingTenant, tenant } = useTenant();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoadingTenant && needsOnboarding && user?.role !== "superadmin") {
      navigate("/onboarding");
    }
  }, [needsOnboarding, isLoadingTenant, user]);

  if (isLoadingAuth || isLoadingTenant) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (tenant?.status === "suspended") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-8">
          <h2 className="text-2xl font-bold text-destructive mb-2">Llogaria e Suspenduar</h2>
          <p className="text-muted-foreground">Llogaria e kompanisë suaj është suspenduar. Kontaktoni administratorin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto">
          <div className="animate-fade-in min-h-full" style={{ background: "linear-gradient(135deg, #f1f5f9 0%, #ede9fe 40%, #ddd6fe 100%)" }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AppLayout() {
  return (
    <TenantProvider>
      <TenantGate />
    </TenantProvider>
  );
}