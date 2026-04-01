import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ClientSegmentFilter({ value, onChange }) {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    base44.entities.Client.list("-created_date", 100)
      .then(setClients)
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() => onChange("all")}
        className={cn(
          "text-sm font-medium transition-all",
          value === "all" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
        )}
      >
        Të Gjithë
      </Button>
      <Button
        onClick={() => onChange("vip")}
        className={cn(
          "text-sm font-medium transition-all",
          value === "vip" ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground"
        )}
      >
        VIP
      </Button>
      <Button
        onClick={() => onChange("regular")}
        className={cn(
          "text-sm font-medium transition-all",
          value === "regular" ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground"
        )}
      >
        I Rregullt
      </Button>
      <Button
        onClick={() => onChange("new")}
        className={cn(
          "text-sm font-medium transition-all",
          value === "new" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground"
        )}
      >
        I Ri
      </Button>
    </div>
  );
}