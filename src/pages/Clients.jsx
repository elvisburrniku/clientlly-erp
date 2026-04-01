import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Pencil, MoreHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const emptyForm = () => ({
  name: "",
  email: "",
  phone: "",
  classification: "new",
  notes: "",
});

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    const data = await base44.entities.Client.list("-created_date", 100);
    setClients(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name || !form.email) return;
    setSubmitting(true);
    await base44.entities.Client.create(form);
    setDialogOpen(false);
    setForm(emptyForm());
    setSubmitting(false);
    toast.success("Klienti u krijua");
    loadClients();
  };

  const handleUpdate = async () => {
    if (!editClient) return;
    setSubmitting(true);
    await base44.entities.Client.update(editClient.id, form);
    setEditClient(null);
    setForm(emptyForm());
    setSubmitting(false);
    toast.success("Klienti u ndryshua");
    loadClients();
  };

  const handleDelete = async (client) => {
    if (!window.confirm(`Fshi klientin ${client.name}?`)) return;
    await base44.entities.Client.delete(client.id);
    toast.success("Klienti u fshi");
    loadClients();
  };

  const openEdit = (client) => {
    setForm({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      classification: client.classification || "new",
      notes: client.notes || "",
    });
    setEditClient(client);
  };

  const classificationBadge = (classification) => {
    const styles = {
      regular: "bg-blue-100 text-blue-700",
      vip: "bg-amber-100 text-amber-700",
      new: "bg-emerald-100 text-emerald-700",
    };
    const labels = { regular: "I Rregullt", vip: "VIP", new: "I Ri" };
    return (
      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", styles[classification])}>
        {labels[classification] || classification}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const stats = {
    total: clients.length,
    vip: clients.filter(c => c.classification === "vip").length,
    regular: clients.filter(c => c.classification === "regular").length,
    new: clients.filter(c => c.classification === "new").length,
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Menaxhimi</p>
          <h1 className="text-3xl font-bold tracking-tight">Klientët</h1>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Shto Klient
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gjithsej</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">VIP</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{stats.vip}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">I Rregullt</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{stats.regular}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">I Ri</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.new}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-semibold text-sm">{clients.length} klientë</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Emri</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Email</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Telefon</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Klasifikimi</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Shpenzuar</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-6 py-3.5">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                        <Users className="w-7 h-7 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">Nuk ka klientë</p>
                    </div>
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold">{client.name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{client.email}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{client.phone || "—"}</td>
                    <td className="px-6 py-4">{classificationBadge(client.classification)}</td>
                    <td className="px-6 py-4 text-sm font-medium">€{(client.total_spent || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openEdit(client)}>
                            <Pencil className="w-4 h-4 mr-2" /> Modifiko
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(client)} className="text-destructive focus:text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Fshi
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shto Klient të Ri</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Emri *</Label>
              <Input placeholder="Emri i klientit" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" placeholder="email@domain.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input placeholder="+355 6X XXX XXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Klasifikimi</Label>
              <Select value={form.classification} onValueChange={(v) => setForm({ ...form, classification: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">I Ri</SelectItem>
                  <SelectItem value="regular">I Rregullt</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shënime</Label>
              <Textarea placeholder="Shënime opsionale..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulo</Button>
            <Button onClick={handleCreate} disabled={submitting || !form.name || !form.email}>
              {submitting ? "Duke krijuar..." : "Krijo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editClient} onOpenChange={(o) => { if (!o) { setEditClient(null); setForm(emptyForm()); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifiko Klientin — {editClient?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Emri *</Label>
              <Input placeholder="Emri i klientit" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" placeholder="email@domain.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input placeholder="+355 6X XXX XXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Klasifikimi</Label>
              <Select value={form.classification} onValueChange={(v) => setForm({ ...form, classification: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">I Ri</SelectItem>
                  <SelectItem value="regular">I Rregullt</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shënime</Label>
              <Textarea placeholder="Shënime opsionale..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditClient(null); setForm(emptyForm()); }}>Anulo</Button>
            <Button onClick={handleUpdate} disabled={submitting || !form.name || !form.email}>
              {submitting ? "Duke ruajtur..." : "Ruaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}