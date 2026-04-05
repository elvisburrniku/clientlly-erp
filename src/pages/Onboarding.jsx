import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Mail, ShieldAlert } from "lucide-react";

function ContactAdminView() {
  const [adminInfo, setAdminInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tenant/admin-contact', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setAdminInfo(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-border p-8 w-full max-w-md text-center">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
            <ShieldAlert className="w-7 h-7 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-contact-admin-title">Hapësira e Punës Nuk Është Aktive</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Hapësira e punës për llogarinë tuaj nuk është e konfiguruar ende. Kontaktoni administratorin për ta aktivizuar.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        ) : adminInfo?.adminEmail ? (
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Kontaktoni administratorin:</p>
            {adminInfo.adminName && (
              <p className="text-base font-semibold" data-testid="text-admin-name">{adminInfo.adminName}</p>
            )}
            <a
              href={`mailto:${adminInfo.adminEmail}`}
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
              data-testid="link-admin-email"
            >
              <Mail className="w-4 h-4" />
              {adminInfo.adminEmail}
            </a>
          </div>
        ) : (
          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-sm text-muted-foreground" data-testid="text-no-admin">
              Nuk u gjet asnjë administrator. Kontaktoni mbështetjen teknike.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Onboarding() {
  const { user, isLoadingAuth, checkAppState } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", code: "", phone: "", address: "", nipt: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth) {
      if (!user) {
        base44.auth.redirectToLogin(window.location.href);
      } else if (user.tenant_id) {
        navigate("/", { replace: true });
      }
    }
  }, [user, isLoadingAuth, navigate]);

  if (isLoadingAuth || !user || redirecting) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user.role !== 'superadmin' && user.role !== 'admin' && user.role !== 'owner') {
    return <ContactAdminView />;
  }

  if (user.tenant_id) {
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

    try {
      const res = await fetch('/api/onboarding/create-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          phone: form.phone,
          address: form.address,
          nipt: form.nipt,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error === 'Code already taken' ? "Ky kod është i zënë. Zgjidh një tjetër." : (data.error || "Gabim"));
        setLoading(false);
        return;
      }

      setRedirecting(true);
      const refreshedUser = await checkAppState();
      if (refreshedUser?.tenant_id) {
        navigate("/", { replace: true });
      } else {
        setRedirecting(false);
        setError("Kompania u krijua, por ndodhi një gabim gjatë ngarkimit. Rifresko faqen.");
      }
    } catch {
      setError("Gabim gjatë krijimit të kompanisë.");
    }
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
            <Input className="mt-1" placeholder="p.sh. ABC Company SH.P.K" value={form.name} onChange={handleNameChange} data-testid="input-company-name" />
          </div>
          <div>
            <Label>Kodi Unik *</Label>
            <Input className="mt-1" placeholder="abc-company" value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} data-testid="input-company-code" />
            <p className="text-xs text-muted-foreground mt-1">Kodi identifikon punëdhënësin tënd në sistem.</p>
          </div>
          <div>
            <Label>NIPT</Label>
            <Input className="mt-1" placeholder="p.sh. J12345678A" value={form.nipt} onChange={(e) => setForm(f => ({ ...f, nipt: e.target.value }))} data-testid="input-nipt" />
          </div>
          <div>
            <Label>Telefon</Label>
            <Input className="mt-1" placeholder="+355 69 123 4567" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} data-testid="input-phone" />
          </div>
          <div>
            <Label>Adresa</Label>
            <Input className="mt-1" placeholder="Rruga, Qyteti" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} data-testid="input-address" />
          </div>

          {error && <p className="text-sm text-destructive" data-testid="text-error">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit">
            {loading ? "Duke krijuar..." : "Krijo Kompaninë"}
          </Button>
        </form>
      </div>
    </div>
  );
}
