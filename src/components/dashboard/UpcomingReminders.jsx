import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, AlertCircle } from "lucide-react";
import moment from "moment";

export default function UpcomingReminders() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Reminder.list("-created_date", 10)
      .then(data => {
        const now = new Date();
        const upcoming = data.filter(r => {
          if (!r.is_active) return false;
          const dueDate = new Date(r.due_date);
          const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
          if (r.reminder_type === "before_due") return daysUntil <= (r.days_before || 3) && daysUntil > 0;
          if (r.reminder_type === "on_due") return daysUntil === 0;
          if (r.reminder_type === "after_due") return daysUntil < 0;
          return false;
        });
        setReminders(upcoming.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (reminders.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Kujtesat e Afërta</p>
      <div className="space-y-2">
        {reminders.map(r => (
          <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
            <Bell className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{r.invoice_number}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.client_name}</p>
              <p className="text-xs text-muted-foreground">Afati: {moment(r.due_date).format("DD MMM")}</p>
            </div>
            <span className="text-xs font-semibold text-primary shrink-0">€{(r.amount || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}