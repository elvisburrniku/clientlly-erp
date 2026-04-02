import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

const yearsData = {
  2020: [
    { name: "Jan", revenue: 8200, expenses: 5400, debt: 2800 },
    { name: "Feb", revenue: 9100, expenses: 5800, debt: 3300 },
    { name: "Mar", revenue: 7800, expenses: 5200, debt: 2600 },
    { name: "Apr", revenue: 10200, expenses: 6800, debt: 3400 },
    { name: "May", revenue: 9500, expenses: 6200, debt: 3300 },
    { name: "Jun", revenue: 11500, expenses: 7200, debt: 4300 },
    { name: "Jul", revenue: 12000, expenses: 7500, debt: 4500 },
    { name: "Aug", revenue: 10800, expenses: 7000, debt: 3800 },
    { name: "Sep", revenue: 11200, expenses: 7300, debt: 3900 },
    { name: "Oct", revenue: 12500, expenses: 7800, debt: 4700 },
    { name: "Nov", revenue: 13200, expenses: 8200, debt: 5000 },
    { name: "Dec", revenue: 14500, expenses: 8800, debt: 5700 },
  ],
  2021: [
    { name: "Jan", revenue: 12400, expenses: 8200, debt: 4200 },
    { name: "Feb", revenue: 15600, expenses: 9100, debt: 6500 },
    { name: "Mar", revenue: 11800, expenses: 7800, debt: 4000 },
    { name: "Apr", revenue: 18200, expenses: 10500, debt: 7700 },
    { name: "May", revenue: 16500, expenses: 9800, debt: 6700 },
    { name: "Jun", revenue: 21000, expenses: 12300, debt: 8700 },
    { name: "Jul", revenue: 19500, expenses: 11200, debt: 8300 },
    { name: "Aug", revenue: 17200, expenses: 10100, debt: 7100 },
    { name: "Sep", revenue: 18800, expenses: 10900, debt: 7900 },
    { name: "Oct", revenue: 20200, expenses: 11600, debt: 8600 },
    { name: "Nov", revenue: 21500, expenses: 12400, debt: 9100 },
    { name: "Dec", revenue: 22800, expenses: 13100, debt: 9700 },
  ],
  2022: [
    { name: "Jan", revenue: 16400, expenses: 10200, debt: 6200 },
    { name: "Feb", revenue: 18600, expenses: 11100, debt: 7500 },
    { name: "Mar", revenue: 14800, expenses: 8800, debt: 6000 },
    { name: "Apr", revenue: 22200, expenses: 12500, debt: 9700 },
    { name: "May", revenue: 20500, expenses: 11800, debt: 8700 },
    { name: "Jun", revenue: 25000, expenses: 14300, debt: 10700 },
    { name: "Jul", revenue: 23500, expenses: 13200, debt: 10300 },
    { name: "Aug", revenue: 21200, expenses: 12100, debt: 9100 },
    { name: "Sep", revenue: 22800, expenses: 12900, debt: 9900 },
    { name: "Oct", revenue: 24200, expenses: 13600, debt: 10600 },
    { name: "Nov", revenue: 25500, expenses: 14400, debt: 11100 },
    { name: "Dec", revenue: 26800, expenses: 15100, debt: 11700 },
  ],
  2023: [
    { name: "Jan", revenue: 20400, expenses: 12200, debt: 8200 },
    { name: "Feb", revenue: 22600, expenses: 13100, debt: 9500 },
    { name: "Mar", revenue: 18800, expenses: 10800, debt: 8000 },
    { name: "Apr", revenue: 26200, expenses: 14500, debt: 11700 },
    { name: "May", revenue: 24500, expenses: 13800, debt: 10700 },
    { name: "Jun", revenue: 29000, expenses: 16300, debt: 12700 },
    { name: "Jul", revenue: 27500, expenses: 15200, debt: 12300 },
    { name: "Aug", revenue: 25200, expenses: 14100, debt: 11100 },
    { name: "Sep", revenue: 26800, expenses: 14900, debt: 11900 },
    { name: "Oct", revenue: 28200, expenses: 15600, debt: 12600 },
    { name: "Nov", revenue: 29500, expenses: 16400, debt: 13100 },
    { name: "Dec", revenue: 30800, expenses: 17100, debt: 13700 },
  ],
  2024: [
    { name: "Jan", revenue: 24400, expenses: 14200, debt: 10200 },
    { name: "Feb", revenue: 26600, expenses: 15100, debt: 11500 },
    { name: "Mar", revenue: 22800, expenses: 12800, debt: 10000 },
    { name: "Apr", revenue: 30200, expenses: 16500, debt: 13700 },
    { name: "May", revenue: 28500, expenses: 15800, debt: 12700 },
    { name: "Jun", revenue: 33000, expenses: 18300, debt: 14700 },
    { name: "Jul", revenue: 31500, expenses: 17200, debt: 14300 },
    { name: "Aug", revenue: 29200, expenses: 16100, debt: 13100 },
    { name: "Sep", revenue: 30800, expenses: 16900, debt: 13900 },
    { name: "Oct", revenue: 32200, expenses: 17600, debt: 14600 },
    { name: "Nov", revenue: 33500, expenses: 18400, debt: 15100 },
    { name: "Dec", revenue: 34800, expenses: 19100, debt: 15700 },
  ],
  2025: [
    { name: "Jan", revenue: 28400, expenses: 16200, debt: 12200 },
    { name: "Feb", revenue: 30600, expenses: 17100, debt: 13500 },
    { name: "Mar", revenue: 26800, expenses: 14800, debt: 12000 },
    { name: "Apr", revenue: 34200, expenses: 18500, debt: 15700 },
    { name: "May", revenue: 32500, expenses: 17800, debt: 14700 },
    { name: "Jun", revenue: 37000, expenses: 20300, debt: 16700 },
  ],
};

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
  const years = Object.keys(yearsData).map(Number).sort((a, b) => a - b);
  
  const data = years.map(year => {
    const yearData = yearsData[year];
    const revenue = yearData.reduce((s, m) => s + m.revenue, 0);
    const expenses = yearData.reduce((s, m) => s + m.expenses, 0);
    const debt = yearData.reduce((s, m) => s + m.debt, 0);
    return { name: year.toString(), revenue, expenses, debt };
  });

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
          <p className="text-sm text-muted-foreground ml-10">Të ardhurat, shpenzimet & borxhi</p>
        </div>

      </div>

      {/* Summary pills */}
      <div className="flex gap-3 mb-6">
        {[
          { label: "Të ardhurat", color: "#6366f1", key: "revenue" },
          { label: "Shpenzimet", color: "#f43f5e", key: "expenses" },
          { label: "Borxhi", color: "#f59e0b", key: "debt" },
        ].map(({ label, color, key }) => {
          const total = data.reduce((s, d) => s + d[key], 0);
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
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradDebt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
            <Area type="monotone" dataKey="debt" name="Borxhi" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gradDebt)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}