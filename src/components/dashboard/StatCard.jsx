import { cn } from "@/lib/utils";

const palettes = {
  blue:   { border: "border-blue-100",   badge: { green: "bg-green-50 text-green-700", red: "bg-red-50 text-red-700", amber: "bg-amber-50 text-amber-700", blue: "bg-blue-50 text-blue-700", muted: "bg-slate-100 text-slate-500", violet: "bg-violet-50 text-violet-700" } },
  rose:   { border: "border-rose-100",   badge: {} },
  amber:  { border: "border-amber-100",  badge: {} },
  green:  { border: "border-green-100",  badge: {} },
  teal:   { border: "border-teal-100",   badge: {} },
  violet: { border: "border-violet-100", badge: {} },
};

const badgeClasses = {
  green:  "bg-green-50  text-green-700  border border-green-200",
  red:    "bg-red-50    text-red-700    border border-red-200",
  amber:  "bg-amber-50  text-amber-700  border border-amber-200",
  blue:   "bg-blue-50   text-blue-700   border border-blue-200",
  violet: "bg-violet-50 text-violet-700 border border-violet-200",
  muted:  "bg-slate-100 text-slate-500  border border-slate-200",
};

export default function StatCard({ icon: Icon, title, value, description, color = "blue", badge }) {
  return (
    <div className={cn(
      "bg-white rounded-2xl border border-slate-200/80 p-6",
      "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 shadow-sm"
    )}>
      {/* label row */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          {title}
        </p>
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-slate-400" />
          </div>
        )}
      </div>

      {/* big number */}
      <p className="text-[2.75rem] font-black tracking-tight text-slate-900 leading-none mb-5">
        {value}
      </p>

      {/* bottom: badge + description */}
      <div className="flex items-center gap-2 flex-wrap min-h-[22px]">
        {badge && (
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest",
            badgeClasses[badge.color] || badgeClasses.muted
          )}>
            {badge.dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
            {badge.label}
          </span>
        )}
        {description && !badge && (
          <p className="text-xs text-slate-400">{description}</p>
        )}
      </div>
    </div>
  );
}
