import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Search, MoreHorizontal, Trash2, Eye, Edit2, Users, Building2, Briefcase, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const emptyEmployee = () => ({
  first_name: "", last_name: "", email: "", phone: "", address: "", city: "",
  date_of_birth: "", gender: "", id_number: "", department_id: "", department_name: "",
  position_id: "", position_title: "", hire_date: new Date().toISOString().split("T")[0],
  contract_type: "full_time", contract_end_date: "", base_salary: 0,
  bank_account: "", emergency_contact: "", emergency_phone: "", notes: "", status: "active",
  user_id: "",
});

const emptyDept = () => ({ name: "", description: "", manager_name: "" });
const emptyPosition = () => ({ title: "", department_id: "", department_name: "", description: "" });

export default function Employees() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [activeTab, setActiveTab] = useState("employees");
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  const [empDialogOpen, setEmpDialogOpen] = useState(false);
  const [empForm, setEmpForm] = useState(emptyEmployee());
  const [editingEmpId, setEditingEmpId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [deptForm, setDeptForm] = useState(emptyDept());
  const [editingDeptId, setEditingDeptId] = useState(null);

  const [posDialogOpen, setPosDialogOpen] = useState(false);
  const [posForm, setPosForm] = useState(emptyPosition());
  const [editingPosId, setEditingPosId] = useState(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [emps, depts, poss, usrs] = await Promise.all([
        base44.entities.Employee.filter({ tenant_id: tenantId }, "-created_at"),
        base44.entities.Department.filter({ tenant_id: tenantId }, "-created_at"),
        base44.entities.JobPosition.filter({ tenant_id: tenantId }, "-created_at"),
        base44.entities.User.filter({ tenant_id: tenantId }, "-created_at"),
      ]);
      setEmployees(emps);
      setDepartments(depts);
      setPositions(poss);
      setUsers(usrs);
    } catch (e) { toast.error("Gabim në ngarkim"); }
    setLoading(false);
  };

  const availableUsers = users.filter(u => !employees.some(emp => emp.user_id === u.id && emp.id !== editingEmpId));

  const filteredEmployees = employees.filter(e => {
    const matchSearch = !search || `${e.first_name} ${e.last_name} ${e.email}`.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "all" || e.department_id === deptFilter;
    return matchSearch && matchDept;
  });

  const handleSaveEmployee = async () => {
    if (!empForm.first_name || !empForm.last_name) { toast.error("Emri dhe mbiemri janë të detyrueshme"); return; }
    setSubmitting(true);
    try {
      const data = { ...empForm, tenant_id: tenantId };
      if (editingEmpId) {
        await base44.entities.Employee.update(editingEmpId, data);
        toast.success("Punonjësi u përditësua");
      } else {
        await base44.entities.Employee.create(data);
        toast.success("Punonjësi u shtua");
      }
      setEmpDialogOpen(false);
      setEmpForm(emptyEmployee());
      setEditingEmpId(null);
      loadAll();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleDeleteEmployee = async (id) => {
    if (!confirm("Jeni të sigurt?")) return;
    try {
      await base44.entities.Employee.delete(id);
      toast.success("U fshi");
      loadAll();
    } catch (e) { toast.error(e.message); }
  };

  const handleSaveDept = async () => {
    if (!deptForm.name) { toast.error("Emri i departamentit kërkohet"); return; }
    setSubmitting(true);
    try {
      const data = { ...deptForm, tenant_id: tenantId };
      if (editingDeptId) {
        await base44.entities.Department.update(editingDeptId, data);
        toast.success("Departamenti u përditësua");
      } else {
        await base44.entities.Department.create(data);
        toast.success("Departamenti u shtua");
      }
      setDeptDialogOpen(false);
      setDeptForm(emptyDept());
      setEditingDeptId(null);
      loadAll();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleDeleteDept = async (id) => {
    if (!confirm("Jeni të sigurt?")) return;
    try { await base44.entities.Department.delete(id); toast.success("U fshi"); loadAll(); }
    catch (e) { toast.error(e.message); }
  };

  const handleSavePos = async () => {
    if (!posForm.title) { toast.error("Titulli kërkohet"); return; }
    setSubmitting(true);
    try {
      const data = { ...posForm, tenant_id: tenantId };
      if (editingPosId) {
        await base44.entities.JobPosition.update(editingPosId, data);
        toast.success("Pozicioni u përditësua");
      } else {
        await base44.entities.JobPosition.create(data);
        toast.success("Pozicioni u shtua");
      }
      setPosDialogOpen(false);
      setPosForm(emptyPosition());
      setEditingPosId(null);
      loadAll();
    } catch (e) { toast.error(e.message); }
    setSubmitting(false);
  };

  const handleDeletePos = async (id) => {
    if (!confirm("Jeni të sigurt?")) return;
    try { await base44.entities.JobPosition.delete(id); toast.success("U fshi"); loadAll(); }
    catch (e) { toast.error(e.message); }
  };

  const statusBadge = (status) => {
    const colors = { active: "bg-green-100 text-green-700", inactive: "bg-gray-100 text-gray-600", terminated: "bg-red-100 text-red-700" };
    const labels = { active: "Aktiv", inactive: "Joaktiv", terminated: "Ndërprerë" };
    return <Badge className={cn("text-xs", colors[status] || colors.active)}>{labels[status] || status}</Badge>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Burimet Njerëzore</h1>
          <p className="text-sm text-slate-500 mt-1">Menaxho punonjësit, departamentet dhe pozicionet</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="employees" data-testid="tab-employees"><Users className="w-4 h-4 mr-1" /> Punonjësit ({employees.length})</TabsTrigger>
          <TabsTrigger value="departments" data-testid="tab-departments"><Building2 className="w-4 h-4 mr-1" /> Departamentet ({departments.length})</TabsTrigger>
          <TabsTrigger value="positions" data-testid="tab-positions"><Briefcase className="w-4 h-4 mr-1" /> Pozicionet ({positions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Kërko punonjës..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="input-search-employees" />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-48" data-testid="select-dept-filter"><SelectValue placeholder="Departamenti" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Të gjitha</SelectItem>
                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => { setEmpForm(emptyEmployee()); setEditingEmpId(null); setEmpDialogOpen(true); }} data-testid="button-add-employee">
              <Plus className="w-4 h-4 mr-1" /> Shto Punonjës
            </Button>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Punonjësi</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Departamenti</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Pozicioni</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Llogaria</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Kontrata</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Statusi</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Paga Bazë</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 cursor-pointer" data-testid={`row-employee-${emp.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                          {emp.first_name?.[0]}{emp.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-slate-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{emp.department_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.position_title || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {users.find(u => u.id === emp.user_id)?.full_name || users.find(u => u.id === emp.user_id)?.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {{full_time: "Kohë e plotë", part_time: "Kohë e pjesshme", contract: "Kontratë"}[emp.contract_type] || emp.contract_type}
                    </td>
                    <td className="px-4 py-3">{statusBadge(emp.status)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {Number(emp.base_salary || 0).toLocaleString()} ALL
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" data-testid={`button-menu-employee-${emp.id}`}><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedEmployee(emp); setProfileOpen(true); }} data-testid={`button-view-employee-${emp.id}`}>
                            <Eye className="w-4 h-4 mr-2" /> Shiko Profilin
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEmpForm({...emp}); setEditingEmpId(emp.id); setEmpDialogOpen(true); }} data-testid={`button-edit-employee-${emp.id}`}>
                            <Edit2 className="w-4 h-4 mr-2" /> Modifiko
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteEmployee(emp.id)} data-testid={`button-delete-employee-${emp.id}`}>
                            <Trash2 className="w-4 h-4 mr-2" /> Fshi
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Nuk ka punonjës</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="departments">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setDeptForm(emptyDept()); setEditingDeptId(null); setDeptDialogOpen(true); }} data-testid="button-add-department">
              <Plus className="w-4 h-4 mr-1" /> Shto Departament
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map(d => (
              <div key={d.id} className="bg-white rounded-xl border p-5" data-testid={`card-department-${d.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Building2 className="w-5 h-5 text-blue-600" /></div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{d.name}</h3>
                      {d.manager_name && <p className="text-xs text-slate-500">Menaxher: {d.manager_name}</p>}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setDeptForm({...d}); setEditingDeptId(d.id); setDeptDialogOpen(true); }}><Edit2 className="w-4 h-4 mr-2" /> Modifiko</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteDept(d.id)}><Trash2 className="w-4 h-4 mr-2" /> Fshi</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {d.description && <p className="text-sm text-slate-500 mt-3">{d.description}</p>}
                <p className="text-xs text-slate-400 mt-2">{employees.filter(e => e.department_id === d.id).length} punonjës</p>
              </div>
            ))}
            {departments.length === 0 && <p className="col-span-3 text-center text-slate-400 py-12">Nuk ka departamente</p>}
          </div>
        </TabsContent>

        <TabsContent value="positions">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setPosForm(emptyPosition()); setEditingPosId(null); setPosDialogOpen(true); }} data-testid="button-add-position">
              <Plus className="w-4 h-4 mr-1" /> Shto Pozicion
            </Button>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Titulli</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Departamenti</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Përshkrimi</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {positions.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50" data-testid={`row-position-${p.id}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">{p.title}</td>
                    <td className="px-4 py-3 text-slate-600">{p.department_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{p.description || "—"}</td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setPosForm({...p}); setEditingPosId(p.id); setPosDialogOpen(true); }}><Edit2 className="w-4 h-4 mr-2" /> Modifiko</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeletePos(p.id)}><Trash2 className="w-4 h-4 mr-2" /> Fshi</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {positions.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400">Nuk ka pozicione</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Employee Dialog */}
      <Dialog open={empDialogOpen} onOpenChange={setEmpDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmpId ? "Modifiko Punonjësin" : "Shto Punonjës të Ri"}</DialogTitle>
            <DialogDescription>Plotëso të dhënat e punonjësit</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Emri *</Label><Input value={empForm.first_name} onChange={e => setEmpForm({...empForm, first_name: e.target.value})} data-testid="input-first-name" /></div>
            <div><Label>Mbiemri *</Label><Input value={empForm.last_name} onChange={e => setEmpForm({...empForm, last_name: e.target.value})} data-testid="input-last-name" /></div>
            <div><Label>Email</Label><Input type="email" value={empForm.email} onChange={e => setEmpForm({...empForm, email: e.target.value})} data-testid="input-email" /></div>
            <div><Label>Telefoni</Label><Input value={empForm.phone} onChange={e => setEmpForm({...empForm, phone: e.target.value})} data-testid="input-phone" /></div>
            <div><Label>Adresa</Label><Input value={empForm.address} onChange={e => setEmpForm({...empForm, address: e.target.value})} /></div>
            <div><Label>Qyteti</Label><Input value={empForm.city} onChange={e => setEmpForm({...empForm, city: e.target.value})} /></div>
            <div><Label>Datëlindja</Label><Input type="date" value={empForm.date_of_birth} onChange={e => setEmpForm({...empForm, date_of_birth: e.target.value})} /></div>
            <div><Label>Gjinia</Label>
              <Select value={empForm.gender} onValueChange={v => setEmpForm({...empForm, gender: v})}>
                <SelectTrigger><SelectValue placeholder="Zgjidh" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Mashkull</SelectItem>
                  <SelectItem value="female">Femër</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Nr. Identifikimi</Label><Input value={empForm.id_number} onChange={e => setEmpForm({...empForm, id_number: e.target.value})} /></div>
            <div><Label>Departamenti</Label>
              <Select value={empForm.department_id} onValueChange={v => {
                const dept = departments.find(d => d.id === v);
                setEmpForm({...empForm, department_id: v, department_name: dept?.name || ""});
              }}>
                <SelectTrigger><SelectValue placeholder="Zgjidh departamentin" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Pozicioni</Label>
              <Select value={empForm.position_id} onValueChange={v => {
                const pos = positions.find(p => p.id === v);
                setEmpForm({...empForm, position_id: v, position_title: pos?.title || ""});
              }}>
                <SelectTrigger><SelectValue placeholder="Zgjidh pozicionin" /></SelectTrigger>
                <SelectContent>
                  {positions.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Llogaria e Sistemit</Label>
              <Select value={empForm.user_id || "none"} onValueChange={v => setEmpForm({...empForm, user_id: v === "none" ? "" : v})}>
                <SelectTrigger><SelectValue placeholder="Pa llogari" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Pa llogari</SelectItem>
                  {availableUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">Vetëm punonjësit me llogari mund të hyjnë në sistem.</p>
            </div>
            <div><Label>Data e Punësimit</Label><Input type="date" value={empForm.hire_date} onChange={e => setEmpForm({...empForm, hire_date: e.target.value})} /></div>
            <div><Label>Lloji i Kontratës</Label>
              <Select value={empForm.contract_type} onValueChange={v => setEmpForm({...empForm, contract_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Kohë e plotë</SelectItem>
                  <SelectItem value="part_time">Kohë e pjesshme</SelectItem>
                  <SelectItem value="contract">Kontratë</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Paga Bazë (ALL)</Label><Input type="number" value={empForm.base_salary} onChange={e => setEmpForm({...empForm, base_salary: parseFloat(e.target.value) || 0})} data-testid="input-salary" /></div>
            <div><Label>Llogaria Bankare</Label><Input value={empForm.bank_account} onChange={e => setEmpForm({...empForm, bank_account: e.target.value})} /></div>
            <div><Label>Kontakt Emergjence</Label><Input value={empForm.emergency_contact} onChange={e => setEmpForm({...empForm, emergency_contact: e.target.value})} /></div>
            <div><Label>Telefon Emergjence</Label><Input value={empForm.emergency_phone} onChange={e => setEmpForm({...empForm, emergency_phone: e.target.value})} /></div>
            <div><Label>Statusi</Label>
              <Select value={empForm.status} onValueChange={v => setEmpForm({...empForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="inactive">Joaktiv</SelectItem>
                  <SelectItem value="terminated">Ndërprerë</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Shënime</Label><Textarea value={empForm.notes} onChange={e => setEmpForm({...empForm, notes: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSaveEmployee} disabled={submitting} data-testid="button-save-employee">{submitting ? "Duke ruajtur..." : "Ruaj"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Dialog */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDeptId ? "Modifiko Departamentin" : "Shto Departament"}</DialogTitle>
            <DialogDescription>Plotëso të dhënat e departamentit</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Emri *</Label><Input value={deptForm.name} onChange={e => setDeptForm({...deptForm, name: e.target.value})} data-testid="input-dept-name" /></div>
            <div><Label>Menaxheri</Label><Input value={deptForm.manager_name} onChange={e => setDeptForm({...deptForm, manager_name: e.target.value})} /></div>
            <div><Label>Përshkrimi</Label><Textarea value={deptForm.description} onChange={e => setDeptForm({...deptForm, description: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSaveDept} disabled={submitting} data-testid="button-save-department">{submitting ? "Duke ruajtur..." : "Ruaj"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Position Dialog */}
      <Dialog open={posDialogOpen} onOpenChange={setPosDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPosId ? "Modifiko Pozicionin" : "Shto Pozicion"}</DialogTitle>
            <DialogDescription>Plotëso të dhënat e pozicionit</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Titulli *</Label><Input value={posForm.title} onChange={e => setPosForm({...posForm, title: e.target.value})} data-testid="input-pos-title" /></div>
            <div><Label>Departamenti</Label>
              <Select value={posForm.department_id} onValueChange={v => {
                const dept = departments.find(d => d.id === v);
                setPosForm({...posForm, department_id: v, department_name: dept?.name || ""});
              }}>
                <SelectTrigger><SelectValue placeholder="Zgjidh" /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Përshkrimi</Label><Textarea value={posForm.description} onChange={e => setPosForm({...posForm, description: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPosDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleSavePos} disabled={submitting} data-testid="button-save-position">{submitting ? "Duke ruajtur..." : "Ruaj"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Profili i Punonjësit</DialogTitle>
            <DialogDescription>Detajet e plota</DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
                  {selectedEmployee.first_name?.[0]}{selectedEmployee.last_name?.[0]}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{selectedEmployee.first_name} {selectedEmployee.last_name}</h3>
                  <p className="text-sm text-slate-500">{selectedEmployee.position_title || "Pa pozicion"}</p>
                  {statusBadge(selectedEmployee.status)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Email:</span> <span className="font-medium">{selectedEmployee.email || "—"}</span></div>
                <div><span className="text-slate-500">Telefoni:</span> <span className="font-medium">{selectedEmployee.phone || "—"}</span></div>
                <div><span className="text-slate-500">Departamenti:</span> <span className="font-medium">{selectedEmployee.department_name || "—"}</span></div>
                <div><span className="text-slate-500">Llogaria:</span> <span className="font-medium">{users.find(u => u.id === selectedEmployee.user_id)?.full_name || users.find(u => u.id === selectedEmployee.user_id)?.email || "—"}</span></div>
                <div><span className="text-slate-500">Kontrata:</span> <span className="font-medium">{{full_time:"Kohë e plotë",part_time:"Kohë e pjesshme",contract:"Kontratë"}[selectedEmployee.contract_type]}</span></div>
                <div><span className="text-slate-500">Data Punësimit:</span> <span className="font-medium">{selectedEmployee.hire_date ? moment(selectedEmployee.hire_date).format("DD/MM/YYYY") : "—"}</span></div>
                <div><span className="text-slate-500">Paga Bazë:</span> <span className="font-medium">{Number(selectedEmployee.base_salary || 0).toLocaleString()} ALL</span></div>
                <div><span className="text-slate-500">Adresa:</span> <span className="font-medium">{selectedEmployee.address || "—"}, {selectedEmployee.city || ""}</span></div>
                <div><span className="text-slate-500">Nr. ID:</span> <span className="font-medium">{selectedEmployee.id_number || "—"}</span></div>
                <div><span className="text-slate-500">Kontakt Emergjence:</span> <span className="font-medium">{selectedEmployee.emergency_contact || "—"}</span></div>
                <div><span className="text-slate-500">Llogaria Bankare:</span> <span className="font-medium">{selectedEmployee.bank_account || "—"}</span></div>
              </div>
              {selectedEmployee.notes && <div className="text-sm"><span className="text-slate-500">Shënime:</span> <p className="mt-1">{selectedEmployee.notes}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
