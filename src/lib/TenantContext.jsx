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
        setIsLoadingTenant(false);
      }
    }
  }, [isAuthenticated, user, isLoadingAuth]);

  const loadTenant = async () => {
    setIsLoadingTenant(true);
    if (!user?.tenant_id) {
      setNeedsOnboarding(true);
      setIsLoadingTenant(false);
      return;
    }
    const tenants = await base44.entities.Tenant.filter({ id: user.tenant_id });
    if (tenants.length > 0) {
      setTenant(tenants[0]);
      setNeedsOnboarding(false);
    } else {
      setNeedsOnboarding(true);
    }
    setIsLoadingTenant(false);
  };

  const refreshTenant = async () => {
    const currentUser = await base44.auth.me();
    if (currentUser?.tenant_id) {
      const tenants = await base44.entities.Tenant.filter({ id: currentUser.tenant_id });
      if (tenants.length > 0) {
        setTenant(tenants[0]);
        setNeedsOnboarding(false);
      }
    }
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

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used within TenantProvider');
  return context;
};