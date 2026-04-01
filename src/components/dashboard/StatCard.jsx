import { cn } from "@/lib/utils";

export default function StatCard({ icon: Icon, title, value, description, variant = "default" }) {
  return (
    <div
      className={cn(
        "group relative bg-card rounded-xl border border-border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5",
        variant === "warning" && "border-warning/30 bg-warning/5"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn(
            "text-2xl font-bold tracking-tight",
            variant === "warning" ? "text-warning" : "text-foreground"
          )}>
            {value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300",
          variant === "warning"
            ? "bg-warning/10 text-warning group-hover:bg-warning/20"
            : "bg-primary/10 text-primary group-hover:bg-primary/15"
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}