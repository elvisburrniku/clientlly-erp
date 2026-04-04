import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/useLanguage";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Save, Loader2, Users } from "lucide-react";

const MODULE_LABELS = {
  dashboard: 'Dashboard',
  invoices: 'Invoices',
  quotes: 'Quotes',
  expenses: 'Expenses',
  products: 'Products',
  clients: 'Clients',
  suppliers: 'Suppliers',
  cashbox: 'Cashbox',
  transfers: 'Transfers',
  debtors: 'Debtors',
  cash_handover: 'Cash Handover',
  reports: 'Reports',
  royalties: 'Royalties',
  inventory: 'Inventory',
  settings: 'Settings',
  report_templates: 'Report Templates',
  reminders: 'Reminders',
  activity_log: 'Activity Log',
  users: 'Users',
};

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [updatingUser, setUpdatingUser] = useState(null);
  const { t } = useLanguage();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/roles', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
        if (data.length > 0 && !selectedRole) setSelectedRole(data[0]);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch('/api/permissions/modules', { credentials: 'include' });
      if (res.ok) setModules(await res.json());
    } catch {}
  }, []);

  const fetchPermissions = useCallback(async (roleId) => {
    try {
      const res = await fetch(`/api/roles/${roleId}/permissions`, { credentials: 'include' });
      if (res.ok) setPermissions(await res.json());
    } catch {}
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/entities/User', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.filter(u => u.id !== user?.id));
      }
    } catch {}
  }, [isAdmin, user?.id]);

  useEffect(() => { fetchRoles(); fetchModules(); fetchUsers(); }, [fetchRoles, fetchModules, fetchUsers]);
  useEffect(() => { if (selectedRole) fetchPermissions(selectedRole.id); }, [selectedRole, fetchPermissions]);

  const getPermForModule = (module) => {
    return permissions.find(p => p.module === module) || { module, can_view: false, can_create: false, can_edit: false, can_delete: false };
  };

  const togglePermission = (module, action) => {
    setPermissions(prev => {
      const existing = prev.find(p => p.module === module);
      if (existing) {
        return prev.map(p => p.module === module ? { ...p, [action]: !p[action] } : p);
      }
      return [...prev, { module, can_view: false, can_create: false, can_edit: false, can_delete: false, [action]: true }];
    });
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const permsToSave = modules.map(m => {
        const p = getPermForModule(m);
        return { module: m, can_view: !!p.can_view, can_create: !!p.can_create, can_edit: !!p.can_edit, can_delete: !!p.can_delete };
      }).filter(p => p.can_view || p.can_create || p.can_edit || p.can_delete);

      const res = await fetch(`/api/roles/${selectedRole.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ permissions: permsToSave }),
      });
      if (res.ok) {
        toast.success(t('permissionsSaved') || 'Permissions saved successfully');
      } else {
        toast.error(t('error') || 'Failed to save permissions');
      }
    } catch {
      toast.error(t('error') || 'Failed to save permissions');
    } finally { setSaving(false); }
  };

  const updateUserRole = async (userId, newRole) => {
    setUpdatingUser(userId);
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        toast.success(t('roleUpdated') || 'User role updated');
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update role');
      }
    } catch {
      toast.error(t('error') || 'Failed to update role');
    } finally { setUpdatingUser(null); }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const assignableRoles = roles.filter(r => {
    if (isSuperAdmin) return true;
    return r.name !== 'superadmin';
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-role-management-title">{t('roleManagement') || 'Role Management'}</h1>
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin
              ? (t('roleManagementDescription') || 'Configure permissions for each role')
              : (t('roleManagementReadOnly') || 'View permissions and assign roles to users')
            }
          </p>
        </div>
      </div>

      {isAdmin && users.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/30 flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold">{t('userRoleAssignment') || 'User Role Assignment'}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="px-5 py-3 text-left text-sm font-medium">{t('user') || 'User'}</th>
                  <th className="px-5 py-3 text-left text-sm font-medium">{t('email') || 'Email'}</th>
                  <th className="px-5 py-3 text-left text-sm font-medium">{t('role') || 'Role'}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium" data-testid={`text-user-name-${u.id}`}>{u.full_name || u.email}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{u.email}</td>
                    <td className="px-5 py-3">
                      <Select
                        value={u.role}
                        onValueChange={(val) => updateUserRole(u.id, val)}
                        disabled={updatingUser === u.id}
                      >
                        <SelectTrigger className="w-[140px]" data-testid={`select-role-${u.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableRoles.map(r => (
                            <SelectItem key={r.name} value={r.name} data-testid={`option-role-${r.name}`}>
                              {r.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        {roles.map(role => (
          <Button
            key={role.id}
            variant={selectedRole?.id === role.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedRole(role)}
            data-testid={`button-role-${role.name}`}
          >
            {role.display_name}
            {role.is_system && <Badge variant="secondary" className="ml-2 text-[10px]">System</Badge>}
          </Button>
        ))}
      </div>

      {selectedRole && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
            <div>
              <h3 className="font-semibold" data-testid="text-selected-role">{selectedRole.display_name}</h3>
              <p className="text-xs text-muted-foreground">{selectedRole.description}</p>
            </div>
            {isSuperAdmin && (
              <Button size="sm" onClick={savePermissions} disabled={saving} data-testid="button-save-permissions">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {t('save') || 'Save'}
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="px-5 py-3 text-left text-sm font-medium">{t('module') || 'Module'}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">{t('view') || 'View'}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">{t('create') || 'Create'}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">{t('edit') || 'Edit'}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">{t('delete') || 'Delete'}</th>
                </tr>
              </thead>
              <tbody>
                {modules.map(mod => {
                  const perm = getPermForModule(mod);
                  return (
                    <tr key={mod} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium">{MODULE_LABELS[mod] || mod}</td>
                      <td className="px-4 py-3 text-center">
                        <Checkbox
                          checked={!!perm.can_view}
                          onCheckedChange={() => togglePermission(mod, 'can_view')}
                          disabled={!isSuperAdmin}
                          data-testid={`checkbox-${mod}-view`}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Checkbox
                          checked={!!perm.can_create}
                          onCheckedChange={() => togglePermission(mod, 'can_create')}
                          disabled={!isSuperAdmin}
                          data-testid={`checkbox-${mod}-create`}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Checkbox
                          checked={!!perm.can_edit}
                          onCheckedChange={() => togglePermission(mod, 'can_edit')}
                          disabled={!isSuperAdmin}
                          data-testid={`checkbox-${mod}-edit`}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Checkbox
                          checked={!!perm.can_delete}
                          onCheckedChange={() => togglePermission(mod, 'can_delete')}
                          disabled={!isSuperAdmin}
                          data-testid={`checkbox-${mod}-delete`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
