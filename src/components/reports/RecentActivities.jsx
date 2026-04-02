import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, TrendingDown, Users, Clock } from "lucide-react";
import moment from "moment";

export default function RecentActivities() {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    const [invoices, expenses, clients] = await Promise.all([
      base44.entities.Invoice.list("-created_date", 10),
      base44.entities.Expense.list("-created_date", 10),
      base44.entities.Client.list("-created_date", 10),
    ]);

    const combined = [
      ...invoices.map((inv) => ({
        type: 'invoice',
        title: `Fatura ${inv.invoice_number}`,
        description: `${inv.client_name} - €${inv.amount.toFixed(2)}`,
        date: inv.created_date,
        icon: FileText,
        color: 'blue',
      })),
      ...expenses.map((exp) => ({
        type: 'expense',
        title: `Shpenzim`,
        description: `${exp.description || 'Pa përshkrim'} - €${exp.amount.toFixed(2)}`,
        date: exp.created_date,
        icon: TrendingDown,
        color: 'rose',
      })),
      ...clients.map((cli) => ({
        type: 'client',
        title: `Klient i ri`,
        description: cli.name,
        date: cli.created_date,
        icon: Users,
        color: 'violet',
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

    setActivities(combined);
  };

  const colorMap = {
    blue: 'bg-blue-100 text-blue-700',
    rose: 'bg-rose-100 text-rose-700',
    violet: 'bg-violet-100 text-violet-700',
  };

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-base font-semibold">Aktivitetet e Fundit</h3>
      </div>

      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nuk ka aktivitet të ri.</p>
        ) : (
          activities.map((activity, idx) => {
            const Icon = activity.icon;
            return (
              <div key={idx} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                <div className={`p-2 rounded-lg shrink-0 ${colorMap[activity.color]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{moment(activity.date).fromNow()}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}