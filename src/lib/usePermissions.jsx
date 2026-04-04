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

    async function fetchPermissions() {
      try {
        const res = await fetch('/api/permissions/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setPermissions(data.permissions);
          setFullAccess(data.fullAccess);
        }
      } catch {} finally {
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

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) throw new Error('usePermissions must be used within PermissionsProvider');
  return context;
}
