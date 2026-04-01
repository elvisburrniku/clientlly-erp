import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { cn } from "@/lib/utils";

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

export default function RevenueChart() {
  const [activeFilter, setActiveFilter] = useState("month");
  const currentFilter = filters.find((f) => f.key === activeFilter);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Pasqyra Financiare</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Të ardhurat, shpenzimet & fitimi</p>
        </div>
        <div className="flex bg-muted rounded-lg p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                activeFilter === f.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={currentFilter.data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" vertical={false} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'hsl(215, 16%, 47%)', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'hsl(215, 16%, 47%)', fontSize: 12 }}
              tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(214, 32%, 91%)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: '13px',
              }}
              formatter={(value) => [`€${value.toLocaleString()}`, undefined]}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }}
            />
            <Bar dataKey="revenue" name="Të ardhurat" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Shpenzimet" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="profit" name="Fitimi" fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}