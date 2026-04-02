import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";

export default function Onboarding() {
  const { user, isLoadingAuth } = useAuth();
  const [form, setForm] = useState({ name: "", code: "", phone: "", address: "", nipt: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      base44.auth.redirectToLogin(window.location.href);
    }
  }, [user, isLoadingAuth]);

  if (isLoadingAuth || !user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  const generateCode = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 30);
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm(f => ({ ...f, name, code: generateCode(name) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.code.trim()) {
      setError("Emri dhe kodi janë të detyrueshëm.");
      return;
    }
    setLoading(true);

    // Check code uniqueness
    const existing = await base44.entities.Tenant.filter({ code: form.code });
    if (existing.length > 0) {
      setError("Ky kod është i zënë. Zgjidh një tjetër.");
      setLoading(false);
      return;
    }

    // Create tenant
    const tenant = await base44.entities.Tenant.create({
      name: form.name,
      code: form.code,
      owner_email: user.email,
      status: "active",
      plan: "free",
      phone: form.phone,
      address: form.address,
      nipt: form.nipt,
    });

    // Update user with tenant_id
    await base44.auth.updateMe({
      tenant_id: tenant.id,
      tenant_name: tenant.name,
    });

    window.location.href = "/";
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-border p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Krijo Kompaninë Tënde</h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">Konfiguro hapësirën e punës për kompaninë tënde.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Emri i Kompanisë *</Label>
            <Input className="mt-1" placeholder="p.sh. ABC Company SH.P.K" value={form.name} onChange={handleNameChange} />
          </div>
          <div>
            <Label>Kodi Unik *</Label>
            <Input className="mt-1" placeholder="abc-company" value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} />
            <p className="text-xs text-muted-foreground mt-1">Kodi identifikon punëdhënësin tënd në sistem.</p>
          </div>
          <div>
            <Label>NIPT</Label>
            <Input className="mt-1" placeholder="p.sh. J12345678A" value={form.nipt} onChange={(e) => setForm(f => ({ ...f, nipt: e.target.value }))} />
          </div>
          <div>
            <Label>Telefon</Label>
            <Input className="mt-1" placeholder="+355 69 123 4567" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <Label>Adresa</Label>
            <Input className="mt-1" placeholder="Rruga, Qyteti" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Duke krijuar..." : "Krijo Kompaninë"}
          </Button>
        </form>
      </div>
    </div>
  );
}