import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChart3 } from "lucide-react";

const MONTHS_AL = ["Jan", "Shk", "Mar", "Pri", "Maj", "Qer", "Kor", "Gus", "Sht", "Tet", "Nën", "Dhj"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl shadow-xl p-3 text-sm min-w-[140px]">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-primary" />
        <span className="text-muted-foreground">Të ardhurat</span>
        <span className="font-bold ml-auto">€{payload[0].value.toLocaleString()}</span>
      </div>
    </div>
  );
};

export default function MonthlyRevenueBar() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Invoice.list().then((invoices) => {
      const now = new Date();
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        return { month: d.getMonth(), year: d.getFullYear(), label: MONTHS_AL[d.getMonth()], revenue: 0 };
      });

      invoices.forEach((inv) => {
        const d = new Date(inv.created_date);
        const m = months.find(x => x.month === d.getMonth() && x.year === d.getFullYear());
        if (m) m.revenue += inv.amount || 0;
      });

      setData(months.map(m => ({ name: m.label, revenue: Math.round(m.revenue) })));
      setLoading(false);
    });
  }, []);

  const maxVal = Math.max(...data.map(d => d.revenue), 1);

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Të Ardhurat Mujore</h3>
          <p className="text-xs text-muted-foreground">6 muajt e fundit</p>
        </div>
      </div>

      {loading ? (
        <div className="h-[200px] flex items-center justify-center">
          <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,25%,92%)" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(230,15%,55%)", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(230,15%,55%)", fontSize: 12 }} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} width={46} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(244,75%,60%,0.06)" }} />
              <Bar dataKey="revenue" name="Të ardhurat" radius={[6, 6, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.revenue === maxVal ? "hsl(244,75%,60%)" : "hsl(244,75%,85%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}