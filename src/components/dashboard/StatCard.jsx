import { cn } from "@/lib/utils";

const palettes = {
  blue:   { icon: "bg-blue-500",    iconRing: "ring-blue-100",    bar: "bg-blue-500",    glow: "bg-blue-50"    },
  rose:   { icon: "bg-rose-500",    iconRing: "ring-rose-100",    bar: "bg-rose-500",    glow: "bg-rose-50"    },
  amber:  { icon: "bg-amber-500",   iconRing: "ring-amber-100",   bar: "bg-amber-500",   glow: "bg-amber-50"   },
  green:  { icon: "bg-emerald-500", iconRing: "ring-emerald-100", bar: "bg-emerald-500", glow: "bg-emerald-50" },
  teal:   { icon: "bg-teal-500",    iconRing: "ring-teal-100",    bar: "bg-teal-500",    glow: "bg-teal-50"    },
  violet: { icon: "bg-violet-500",  iconRing: "ring-violet-100",  bar: "bg-violet-500",  glow: "bg-violet-50"  },
  indigo: { icon: "bg-indigo-500",  iconRing: "ring-indigo-100",  bar: "bg-indigo-500",  glow: "bg-indigo-50"  },
  cyan:   { icon: "bg-cyan-500",    iconRing: "ring-cyan-100",    bar: "bg-cyan-500",    glow: "bg-cyan-50"    },
  purple: { icon: "bg-purple-500",  iconRing: "ring-purple-100",  bar: "bg-purple-500",  glow: "bg-purple-50"  },
  pink:   { icon: "bg-pink-500",    iconRing: "ring-pink-100",    bar: "bg-pink-500",    glow: "bg-pink-50"    },
};

const badgeClasses = {
  green:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
  red:    "bg-rose-50    text-rose-700    border border-rose-200",
  amber:  "bg-amber-50   text-amber-700   border border-amber-200",
  blue:   "bg-blue-50    text-blue-700    border border-blue-200",
  violet: "bg-violet-50  text-violet-700  border border-violet-200",
  muted:  "bg-slate-100  text-slate-500   border border-slate-200",
};

export default function StatCard({ icon: Icon, title, value, description, color = "blue", badge, compact = false }) {
  const p = palettes[color] || palettes.blue;

  if (compact) {
    return (
      <div className={cn(
        "bg-white rounded-xl border border-slate-200 px-4 py-3",
        "hover:shadow-md hover:-translate-y-1 transition-all duration-300 shadow-sm overflow-hidden",
        "flex items-center gap-3 antialiased"
      )}>
        {Icon && (
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ring-2",
            p.icon, p.iconRing
          )} style={{ isolation: "isolate" }}>
            <Icon className="text-white" style={{ width: 14, height: 14, backfaceVisibility: "hidden" }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 truncate">{title}</p>
          <p className="text-lg font-black tracking-tight text-black leading-tight truncate">{value}</p>
        </div>
        {badge && (
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest shrink-0",
            badgeClasses[badge.color] || badgeClasses.muted
          )}>
            {badge.dot && <span className="w-1 h-1 rounded-full bg-current opacity-80" />}
            {badge.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white rounded-2xl border border-slate-200 overflow-hidden",
      "hover:shadow-xl hover:-translate-y-1 transition-all duration-300 shadow-sm antialiased"
    )}>
      {/* colored top accent bar */}
      <div className={cn("h-[3px] w-full", p.bar)} />

      <div className="p-5">
        {/* icon row + badge */}
        <div className="flex items-start justify-between mb-4">
          {Icon && (
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-4",
              p.icon, p.iconRing
            )} style={{ isolation: "isolate" }}>
              <Icon className="text-white" style={{ width: 18, height: 18, backfaceVisibility: "hidden" }} />
            </div>
          )}
          {badge && (
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest",
              badgeClasses[badge.color] || badgeClasses.muted
            )}>
              {badge.dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
              {badge.label}
            </span>
          )}
        </div>

        {/* number + title stacked closely */}
        <p className="text-[2.5rem] font-black tracking-tight text-black leading-none">
          {value}
        </p>
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-400 mt-1.5">
          {title}
        </p>

        {/* description if no badge */}
        {!badge && description && (
          <p className="text-[11px] text-slate-400 mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}
