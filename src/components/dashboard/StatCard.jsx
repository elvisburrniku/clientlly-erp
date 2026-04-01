import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

export default function StatCard({ icon: Icon, title, value, description, variant = "default", trend }) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5",
      variant === "warning"
        ? "bg-amber-50 border-amber-200/70"
        : "bg-card border-border"
    )}>
      {/* Subtle background accent */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 opacity-5",
        variant === "warning" ? "bg-amber-500" : "bg-primary"
      )} />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className={cn(
            "text-xs font-semibold uppercase tracking-widest",
            variant === "warning" ? "text-amber-600" : "text-muted-foreground"
          )}>
            {title}
          </p>
          <p className={cn(
            "text-3xl font-bold tracking-tight mt-2",
            variant === "warning" ? "text-amber-700" : "text-foreground"
          )}>
            {value}
          </p>
          {description && (
            <p className={cn(
              "text-xs mt-1",
              variant === "warning" ? "text-amber-500" : "text-muted-foreground"
            )}>
              {description}
            </p>
          )}
        </div>
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
          variant === "warning"
            ? "bg-amber-100 text-amber-600"
            : "bg-primary/10 text-primary"
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}