import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Menaxho llogarinë dhe preferencat</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <h3 className="text-base font-semibold">Profili</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Emri</Label>
            <Input value={user?.full_name || ""} disabled className="mt-1.5 bg-muted/50" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="mt-1.5 bg-muted/50" />
          </div>
          <div>
            <Label>Roli</Label>
            <Input value={user?.role || "staff"} disabled className="mt-1.5 bg-muted/50 capitalize" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="text-base font-semibold">Aksionet</h3>
        <Button variant="outline" onClick={() => base44.auth.logout()} className="text-destructive border-destructive/20 hover:bg-destructive/5">
          Dil nga llogaria
        </Button>
      </div>
    </div>
  );
}