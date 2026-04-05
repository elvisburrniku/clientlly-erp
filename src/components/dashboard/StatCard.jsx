import { cn } from "@/lib/utils";

const colorMap = {
  blue:   { accent: "bg-blue-500",   soft: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-100" },
  violet: { accent: "bg-violet-500", soft: "bg-violet-50", text: "text-violet-600", border: "border-violet-100" },
  rose:   { accent: "bg-rose-500",   soft: "bg-rose-50",   text: "text-rose-600",   border: "border-rose-100" },
  teal:   { accent: "bg-teal-500",   soft: "bg-teal-50",   text: "text-teal-600",   border: "border-teal-100" },
  amber:  { accent: "bg-amber-500",  soft: "bg-amber-50",  text: "text-amber-600",  border: "border-amber-100" },
  green:  { accent: "bg-emerald-500",soft: "bg-emerald-50",text: "text-emerald-600",border: "border-emerald-100" },
  indigo: { accent: "bg-indigo-500", soft: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
  pink:   { accent: "bg-pink-500",   soft: "bg-pink-50",   text: "text-pink-600",   border: "border-pink-100" },
  cyan:   { accent: "bg-cyan-500",   soft: "bg-cyan-50",   text: "text-cyan-600",   border: "border-cyan-100" },
  purple: { accent: "bg-purple-500", soft: "bg-purple-50", text: "text-purple-600", border: "border-purple-100" },
};

export default function StatCard({ icon: Icon, title, value, description, color = "blue" }) {
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={cn(
      "group relative bg-white rounded-2xl border border-border/50 p-5",
      "shadow-sm hover:shadow-md hover:-translate-y-0.5",
      "transition-all duration-300 overflow-hidden cursor-pointer"
    )}>
      {/* left colour bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl", c.accent)} />

      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            {title}
          </p>
          <p className={cn("text-2xl font-bold tracking-tight leading-none", c.text)}>
            {value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-2 leading-snug">
              {description}
            </p>
          )}
        </div>
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          c.soft, "border", c.border,
          "group-hover:scale-110 transition-transform duration-300"
        )}>
          <Icon className={cn("w-5 h-5", c.text)} />
        </div>
      </div>
    </div>
  );
}
