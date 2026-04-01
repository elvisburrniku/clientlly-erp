import { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import RevenueExpenseChart from "../components/reports/RevenueExpenseChart";
import CategoryFilter from "../components/reports/CategoryFilter";
import ClientSegmentFilter from "../components/reports/ClientSegmentFilter";
import ReportPDFExport from "../components/reports/ReportPDFExport";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import moment from "moment";

export default function Reports() {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [clientSegment, setClientSegment] = useState("all");
  const [dateFrom, setDateFrom] = useState(() => moment().subtract(12, 'months').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(() => moment().format('YYYY-MM-DD'));
  const [chartData, setChartData] = useState([]);

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

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-base font-semibold mb-4">Filtro sipas Kategorisë</h3>
          <CategoryFilter value={categoryFilter} onChange={setCategoryFilter} />
        </div>
        <div className="border-t border-border pt-6">
          <h3 className="text-base font-semibold mb-4">Filtro sipas Segmentit të Klientëve</h3>
          <ClientSegmentFilter value={clientSegment} onChange={setClientSegment} />
        </div>
        <div className="border-t border-border pt-6">
          <h3 className="text-base font-semibold mb-4">Zgjedh Periudhën</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Nga Data</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Deri më Data</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <ReportPDFExport dateFrom={dateFrom} dateTo={dateTo} categoryFilter={categoryFilter} chartData={chartData} />
        </div>
      </div>

      {/* Charts */}
      <RevenueExpenseChart categoryFilter={categoryFilter} clientSegment={clientSegment} onDataChange={setChartData} />
    </div>
  );
}