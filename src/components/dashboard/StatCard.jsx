import { cn } from "@/lib/utils";

const palettes = {
  blue:   { icon: "bg-blue-500",    iconRing: "ring-blue-100",    iconText: "text-white" },
  rose:   { icon: "bg-rose-500",    iconRing: "ring-rose-100",    iconText: "text-white" },
  amber:  { icon: "bg-amber-500",   iconRing: "ring-amber-100",   iconText: "text-white" },
  green:  { icon: "bg-emerald-500", iconRing: "ring-emerald-100", iconText: "text-white" },
  teal:   { icon: "bg-teal-500",    iconRing: "ring-teal-100",    iconText: "text-white" },
  violet: { icon: "bg-violet-500",  iconRing: "ring-violet-100",  iconText: "text-white" },
  indigo: { icon: "bg-indigo-500",  iconRing: "ring-indigo-100",  iconText: "text-white" },
  cyan:   { icon: "bg-cyan-500",    iconRing: "ring-cyan-100",    iconText: "text-white" },
  purple: { icon: "bg-purple-500",  iconRing: "ring-purple-100",  iconText: "text-white" },
  pink:   { icon: "bg-pink-500",    iconRing: "ring-pink-100",    iconText: "text-white" },
};

const badgeClasses = {
  green:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
  red:    "bg-rose-50    text-rose-700    border border-rose-200",
  amber:  "bg-amber-50   text-amber-700   border border-amber-200",
  blue:   "bg-blue-50    text-blue-700    border border-blue-200",
  violet: "bg-violet-50  text-violet-700  border border-violet-200",
  muted:  "bg-slate-100  text-slate-500   border border-slate-200",
};

export default function StatCard({ icon: Icon, title, value, description, color = "blue", badge }) {
  const p = palettes[color] || palettes.blue;

  return (
    <div className={cn(
      "bg-white rounded-2xl border border-slate-200/80 p-5",
      "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 shadow-sm overflow-hidden"
    )}>
      {/* header: label + icon */}
      <div className="flex items-start justify-between mb-4 gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 leading-tight pt-0.5">
          {title}
        </p>
        {Icon && (
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-4",
            p.icon, p.iconRing
          )}>
            <Icon className={cn("w-4.5 h-4.5", p.iconText)} style={{ width: 18, height: 18 }} />
          </div>
        )}
      </div>

      {/* big number */}
      <p className="text-[2.6rem] font-black tracking-tight text-slate-900 leading-none mb-4">
        {value}
      </p>

      {/* badge / description */}
      <div className="flex items-center gap-2 flex-wrap min-h-[22px]">
        {badge ? (
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest",
            badgeClasses[badge.color] || badgeClasses.muted
          )}>
            {badge.dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
            {badge.label}
          </span>
        ) : description ? (
          <p className="text-[11px] text-slate-400">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
