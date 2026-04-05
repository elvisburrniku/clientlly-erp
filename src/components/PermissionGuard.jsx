import { usePermissions } from "@/lib/usePermissions";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/useLanguage";
import { Shield } from "lucide-react";

export default function PermissionGuard({ module, action = 'can_view', adminOnly = false, children }) {
  const { can, fullAccess, loading } = usePermissions();
  const { user } = useAuth();
  const { t } = useLanguage();

  if (loading) return null;

  if (adminOnly) {
    if (user?.role !== 'admin' && user?.role !== 'owner' && user?.role !== 'superadmin') {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6" data-testid="text-access-denied">
          <Shield className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('accessDenied') || 'Access Denied'}</h2>
          <p className="text-muted-foreground text-center">{t('noPermission') || 'You do not have permission to view this page.'}</p>
        </div>
      );
    }
    return children;
  }

  if (fullAccess || can(module, action)) {
    return children;
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6" data-testid="text-access-denied">
      <Shield className="w-12 h-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">{t('accessDenied') || 'Access Denied'}</h2>
      <p className="text-muted-foreground text-center">{t('noPermission') || 'You do not have permission to view this page.'}</p>
    </div>
  );
}
