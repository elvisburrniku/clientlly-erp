import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const TenantContext = createContext();

export const TenantProvider = ({ children }) => {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [isLoadingTenant, setIsLoadingTenant] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth) {
      if (isAuthenticated && user) {
        loadTenant();
      } else {
        setNeedsOnboarding(false);
        setIsLoadingTenant(false);
      }
    }
  }, [isAuthenticated, user, isLoadingAuth]);

  const loadTenant = async () => {
    setIsLoadingTenant(true);
    try {
      if (!user?.tenant_id) {
        setNeedsOnboarding(true);
        setIsLoadingTenant(false);
        return;
      }
      const res = await fetch('/api/tenant/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setTenant(data);
          setNeedsOnboarding(false);
        } else {
          setNeedsOnboarding(true);
        }
      } else {
        if (!user?.tenant_id) {
          setNeedsOnboarding(true);
        }
      }
    } catch {
      if (!user?.tenant_id) {
        setNeedsOnboarding(true);
      }
    } finally {
      setIsLoadingTenant(false);
    }
  };

  const refreshTenant = async () => {
    try {
      const res = await fetch('/api/tenant/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setTenant(data);
          setNeedsOnboarding(false);
        }
      }
    } catch {}
  };

  return (
    <TenantContext.Provider value={{
      tenant,
      isLoadingTenant,
      needsOnboarding,
      refreshTenant,
      tenantId: user?.tenant_id || null,
    }}>
      {children}
    </TenantContext.Provider>
  );
};

const TENANT_FALLBACK = {
  tenant: null,
  isLoadingTenant: true,
  needsOnboarding: false,
  refreshTenant: () => Promise.resolve(),
  tenantId: null,
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  return context || TENANT_FALLBACK;
};