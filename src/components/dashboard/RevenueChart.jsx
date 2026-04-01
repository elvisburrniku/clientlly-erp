import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

const monthlyData = [
  { name: "Jan", revenue: 12400, expenses: 8200, profit: 4200 },
  { name: "Feb", revenue: 15600, expenses: 9100, profit: 6500 },
  { name: "Mar", revenue: 11800, expenses: 7800, profit: 4000 },
  { name: "Apr", revenue: 18200, expenses: 10500, profit: 7700 },
  { name: "May", revenue: 16500, expenses: 9800, profit: 6700 },
  { name: "Jun", revenue: 21000, expenses: 12300, profit: 8700 },
];

const dailyData = [
  { name: "Hën", revenue: 1800, expenses: 900, profit: 900 },
  { name: "Mar", revenue: 2200, expenses: 1100, profit: 1100 },
  { name: "Mër", revenue: 1600, expenses: 800, profit: 800 },
  { name: "Enj", revenue: 2800, expenses: 1500, profit: 1300 },
  { name: "Pre", revenue: 3200, expenses: 1800, profit: 1400 },
];

const yearlyData = [
  { name: "2021", revenue: 95000, expenses: 62000, profit: 33000 },
  { name: "2022", revenue: 128000, expenses: 78000, profit: 50000 },
  { name: "2023", revenue: 156000, expenses: 92000, profit: 64000 },
  { name: "2024", revenue: 189000, expenses: 108000, profit: 81000 },
];

const filters = [
  { key: "today", label: "Sot", data: dailyData },
  { key: "month", label: "Muaji", data: monthlyData },
  { key: "year", label: "Viti", data: yearlyData },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl shadow-xl p-4 text-sm min-w-[160px]">
      <p className="font-semibold text-foreground mb-3">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-semibold text-foreground">€{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export default function RevenueChart() {
  const [activeFilter, setActiveFilter] = useState("month");
  const currentFilter = filters.find((f) => f.key === activeFilter);

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Pasqyra Financiare</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-10">Të ardhurat, shpenzimet & fitimi</p>
        </div>
        <div className="flex bg-muted/80 rounded-xl p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200",
                activeFilter === f.key
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 mb-6">
        {[
          { label: "Të ardhurat", color: "#6366f1", key: "revenue" },
          { label: "Shpenzimet", color: "#f43f5e", key: "expenses" },
          { label: "Fitimi", color: "#10b981", key: "profit" },
        ].map(({ label, color, key }) => {
          const total = currentFilter.data.reduce((s, d) => s + d[key], 0);
          return (
            <div key={key} className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="text-xs font-bold text-foreground">€{total.toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={currentFilter.data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,25%,92%)" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(230,15%,55%)', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(230,15%,55%)', fontSize: 12 }}
              tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" name="Të ardhurat" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradRevenue)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            <Area type="monotone" dataKey="expenses" name="Shpenzimet" stroke="#f43f5e" strokeWidth={2.5} fill="url(#gradExpenses)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            <Area type="monotone" dataKey="profit" name="Fitimi" stroke="#10b981" strokeWidth={2.5} fill="url(#gradProfit)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}