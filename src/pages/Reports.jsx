import { useState } from "react";
import { BarChart3 } from "lucide-react";
import RevenueExpenseChart from "../components/reports/RevenueExpenseChart";
import CategoryFilter from "../components/reports/CategoryFilter";

export default function Reports() {
  const [categoryFilter, setCategoryFilter] = useState("all");

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Analiza</p>
          <h1 className="text-3xl font-bold tracking-tight">Raportet Financiare</h1>
        </div>
        <p className="text-sm text-muted-foreground">Shiko trendet e të ardhurave dhe shpenzimeve përmes grafikëve të avancuar</p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
        <h3 className="text-base font-semibold mb-4">Filtro sipas Kategorisë</h3>
        <CategoryFilter value={categoryFilter} onChange={setCategoryFilter} />
      </div>

      {/* Charts */}
      <RevenueExpenseChart categoryFilter={categoryFilter} />
    </div>
  );
}