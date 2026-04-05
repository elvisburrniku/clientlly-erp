import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useLanguage } from "@/lib/useLanguage";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Shield, Save, Loader2, Users, UserPlus, Trash2 } from "lucide-react";

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
  const [deletingUser, setDeletingUser] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [tenants, setTenants] = useState([]);
  const { t } = useLanguage();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || user?.role === 'owner' || isSuperAdmin;

  const addUserForm = useForm({
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      role: 'user',
      tenant_id: '__own__',
    },
  });

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

  const fetchTenants = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await fetch('/api/admin/tenants', { credentials: 'include' });
      if (res.ok) setTenants(await res.json());
    } catch {}
  }, [isSuperAdmin]);

  useEffect(() => { fetchRoles(); fetchModules(); fetchUsers(); fetchTenants(); }, [fetchRoles, fetchModules, fetchUsers, fetchTenants]);
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

  const deleteUser = async (userId) => {
    if (!window.confirm(t('confirmDeleteUser') || 'Are you sure you want to delete this user?')) return;
    setDeletingUser(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        toast.success(t('userDeleted') || 'User deleted successfully');
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete user');
      }
    } catch {
      toast.error(t('error') || 'Failed to delete user');
    } finally { setDeletingUser(null); }
  };

  const onSubmitAddUser = async (values) => {
    setAddUserLoading(true);
    try {
      const body = { ...values };
      if (!isSuperAdmin || !body.tenant_id || body.tenant_id === '__own__') delete body.tenant_id;
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(t('userCreated') || 'User created successfully');
        setShowAddUser(false);
        addUserForm.reset();
        if (data.id !== user?.id) {
          const sameCurrentTenant = !data.tenant_id || data.tenant_id === user?.tenant_id;
          if (sameCurrentTenant) {
            setUsers(prev => [...prev, data]);
          }
        }
      } else {
        toast.error(data.error || 'Failed to create user');
      }
    } catch {
      toast.error(t('error') || 'Failed to create user');
    } finally { setAddUserLoading(false); }
  };

  const handleDialogClose = (open) => {
    setShowAddUser(open);
    if (!open) addUserForm.reset();
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

  const canDeleteUser = (u) => {
    if (u.role === 'superadmin' && !isSuperAdmin) return false;
    return true;
  };

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

      {isAdmin && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold">{t('userRoleAssignment') || 'User Role Assignment'}</h3>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddUser(true)}
              data-testid="button-add-user"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {t('addUser') || 'Shto Përdorues'}
            </Button>
          </div>
          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="px-5 py-3 text-left text-sm font-medium">{t('user') || 'User'}</th>
                    <th className="px-5 py-3 text-left text-sm font-medium">{t('email') || 'Email'}</th>
                    <th className="px-5 py-3 text-left text-sm font-medium">{t('role') || 'Role'}</th>
                    <th className="px-5 py-3 text-left text-sm font-medium"></th>
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
                      <td className="px-5 py-3">
                        {canDeleteUser(u) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteUser(u.id)}
                            disabled={deletingUser === u.id}
                            data-testid={`button-delete-user-${u.id}`}
                          >
                            {deletingUser === u.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />
                            }
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              {t('noOtherUsers') || 'No other users in this tenant yet.'}
            </div>
          )}
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

      <Dialog open={showAddUser} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addUser') || 'Shto Përdorues'}</DialogTitle>
          </DialogHeader>
          <Form {...addUserForm}>
            <form onSubmit={addUserForm.handleSubmit(onSubmitAddUser)} className="space-y-4">
              <FormField
                control={addUserForm.control}
                name="full_name"
                rules={{ required: t('fullNameRequired') || 'Full name is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fullName') || 'Full Name'}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="input-add-user-full-name"
                        placeholder={t('fullName') || 'Full Name'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addUserForm.control}
                name="email"
                rules={{
                  required: t('emailRequired') || 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t('emailInvalid') || 'Invalid email address' }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('email') || 'Email'}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        data-testid="input-add-user-email"
                        placeholder="email@example.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addUserForm.control}
                name="password"
                rules={{
                  required: t('passwordRequired') || 'Password is required',
                  minLength: { value: 6, message: t('passwordMinLength') || 'Password must be at least 6 characters' }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('password') || 'Password'}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        data-testid="input-add-user-password"
                        placeholder="••••••••"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addUserForm.control}
                name="role"
                rules={{ required: t('roleRequired') || 'Role is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('role') || 'Role'}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-add-user-role">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user" data-testid="option-add-role-user">{t('roleUser') || 'User'}</SelectItem>
                        <SelectItem value="admin" data-testid="option-add-role-admin">{t('roleAdmin') || 'Admin'}</SelectItem>
                        <SelectItem value="owner" data-testid="option-add-role-owner">{t('roleOwner') || 'Owner'}</SelectItem>
                        {isSuperAdmin && (
                          <SelectItem value="superadmin" data-testid="option-add-role-superadmin">{t('roleSuperAdmin') || 'Super Admin'}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isSuperAdmin && tenants.length > 0 && (
                <FormField
                  control={addUserForm.control}
                  name="tenant_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tenant') || 'Tenant'} <span className="text-muted-foreground text-xs">({t('defaultsToOwn') || 'defaults to your tenant'})</span></FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-add-user-tenant">
                            <SelectValue placeholder={t('selectTenant') || 'Own tenant (default)'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__own__" data-testid="option-tenant-own">{t('ownTenant') || 'Own tenant (default)'}</SelectItem>
                          {tenants.map(t2 => (
                            <SelectItem key={t2.id} value={String(t2.id)} data-testid={`option-tenant-${t2.id}`}>
                              {t2.name} ({t2.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogClose(false)}
                  data-testid="button-cancel-add-user"
                >
                  {t('cancel') || 'Cancel'}
                </Button>
                <Button type="submit" disabled={addUserLoading} data-testid="button-submit-add-user">
                  {addUserLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('create') || 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
