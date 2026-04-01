import { AlertTriangle } from "lucide-react";

export default function UndeliveredCashAlert({ users }) {
  if (!users || users.length === 0) return null;

  return (
    <div className="bg-warning/5 border border-warning/20 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4.5 h-4.5 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground">Kesh i pa dorëzuar</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {users.length} përdorues kanë para të pa dorëzuara
          </p>
          <div className="mt-3 space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium">{u.full_name || u.email}</span>
                <span className="text-warning font-semibold">€{(u.cash_on_hand || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}