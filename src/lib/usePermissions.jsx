import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const PermissionsContext = createContext();

export function PermissionsProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState(null);
  const [fullAccess, setFullAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    const isAdminRole = user.role === 'admin' || user.role === 'owner' || user.role === 'superadmin';

    async function fetchPermissions() {
      try {
        const res = await fetch('/api/permissions/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setPermissions(data.permissions);
          setFullAccess(data.fullAccess);
        } else {
          if (isAdminRole) {
            setFullAccess(true);
          }
        }
      } catch {
        if (isAdminRole) {
          setFullAccess(true);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, [isAuthenticated, user]);

  const can = (module, action = 'can_view') => {
    if (fullAccess) return true;
    if (!permissions) return false;
    return !!permissions[module]?.[action];
  };

  const canView = (module) => can(module, 'can_view');
  const canCreate = (module) => can(module, 'can_create');
  const canEdit = (module) => can(module, 'can_edit');
  const canDelete = (module) => can(module, 'can_delete');

  return (
    <PermissionsContext.Provider value={{ permissions, fullAccess, loading, can, canView, canCreate, canEdit, canDelete }}>
      {children}
    </PermissionsContext.Provider>
  );
}

const PERMISSIONS_FALLBACK = {
  permissions: null,
  fullAccess: false,
  loading: true,
  can: () => false,
  canView: () => false,
  canCreate: () => false,
  canEdit: () => false,
  canDelete: () => false,
};

export function usePermissions() {
  const context = useContext(PermissionsContext);
  return context || PERMISSIONS_FALLBACK;
}
