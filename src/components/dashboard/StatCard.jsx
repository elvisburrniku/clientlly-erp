import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({ icon: Icon, title, value, description, variant = "default", color = "blue", trend }) {
  const colorMap = {
    blue:   { bg: "bg-blue-50",   icon: "bg-blue-500",   text: "text-blue-600",   ring: "ring-blue-100" },
    violet: { bg: "bg-violet-50", icon: "bg-violet-500", text: "text-violet-600", ring: "ring-violet-100" },
    rose:   { bg: "bg-rose-50",   icon: "bg-rose-500",   text: "text-rose-600",   ring: "ring-rose-100" },
    teal:   { bg: "bg-teal-50",   icon: "bg-teal-500",   text: "text-teal-600",   ring: "ring-teal-100" },
    amber:  { bg: "bg-amber-50",  icon: "bg-amber-500",  text: "text-amber-600",  ring: "ring-amber-100" },
    green:  { bg: "bg-emerald-50",icon: "bg-emerald-500",text: "text-emerald-600",ring: "ring-emerald-100" },
  };

  const c = variant === "warning" ? colorMap.amber : (colorMap[color] || colorMap.blue);

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl border bg-white p-6 transition-all duration-300",
      "hover:shadow-lg hover:-translate-y-0.5 shadow-sm border-border/60"
    )}>
      {/* Top accent line */}
      <div className={cn("absolute top-0 left-0 right-0 h-0.5", c.icon)} />

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight text-foreground leading-none">
            {value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ring-4",
          c.icon, c.ring
        )}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}