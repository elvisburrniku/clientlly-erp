import { cn } from "@/lib/utils";

const colorMap = {
  blue:   { strip: "bg-blue-500",   badge: "bg-blue-50 text-blue-600 border-blue-200",   icon: "bg-blue-50 text-blue-500"   },
  violet: { strip: "bg-violet-500", badge: "bg-violet-50 text-violet-600 border-violet-200", icon: "bg-violet-50 text-violet-500" },
  rose:   { strip: "bg-rose-500",   badge: "bg-rose-50 text-rose-600 border-rose-200",   icon: "bg-rose-50 text-rose-500"   },
  teal:   { strip: "bg-teal-500",   badge: "bg-teal-50 text-teal-600 border-teal-200",   icon: "bg-teal-50 text-teal-500"   },
  amber:  { strip: "bg-amber-500",  badge: "bg-amber-50 text-amber-600 border-amber-200",  icon: "bg-amber-50 text-amber-500"  },
  green:  { strip: "bg-emerald-500",badge: "bg-emerald-50 text-emerald-600 border-emerald-200",icon: "bg-emerald-50 text-emerald-500"},
  indigo: { strip: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-600 border-indigo-200", icon: "bg-indigo-50 text-indigo-500" },
  pink:   { strip: "bg-pink-500",   badge: "bg-pink-50 text-pink-600 border-pink-200",   icon: "bg-pink-50 text-pink-500"   },
  cyan:   { strip: "bg-cyan-500",   badge: "bg-cyan-50 text-cyan-600 border-cyan-200",   icon: "bg-cyan-50 text-cyan-500"   },
  purple: { strip: "bg-purple-500", badge: "bg-purple-50 text-purple-600 border-purple-200", icon: "bg-purple-50 text-purple-500" },
};

export default function StatCard({ icon: Icon, title, value, description, color = "blue", badge }) {
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={cn(
      "group relative bg-white rounded-2xl border border-border/50 overflow-hidden",
      "shadow-sm hover:shadow-lg hover:-translate-y-1",
      "transition-all duration-300 ease-out"
    )}>
      {/* top colour strip */}
      <div className={cn("h-1 w-full", c.strip)} />

      <div className="p-5">
        {/* header: title + icon */}
        <div className="flex items-start justify-between mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground leading-none pt-0.5">
            {title}
          </p>
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", c.icon)}>
            <Icon className="w-4 h-4" />
          </div>
        </div>

        {/* big number */}
        <p className="text-[2rem] font-black tracking-tight text-foreground leading-none mb-4">
          {value}
        </p>

        {/* bottom row: badge + description */}
        <div className="flex items-center gap-2 flex-wrap">
          {badge && (
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
              badge.color === "green"  && "bg-emerald-50 text-emerald-600 border-emerald-200",
              badge.color === "red"    && "bg-rose-50 text-rose-600 border-rose-200",
              badge.color === "amber"  && "bg-amber-50 text-amber-600 border-amber-200",
              badge.color === "blue"   && "bg-blue-50 text-blue-600 border-blue-200",
              badge.color === "muted"  && "bg-muted text-muted-foreground border-border",
              badge.color === "violet" && "bg-violet-50 text-violet-600 border-violet-200",
            )}>
              {badge.dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
              {badge.label}
            </span>
          )}
          {description && (
            <p className="text-[11px] text-muted-foreground leading-snug">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
