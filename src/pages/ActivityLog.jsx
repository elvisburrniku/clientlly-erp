import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/useLanguage";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Plus, Pencil, Trash2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

const actionIcons = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
};

const actionColors = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
};

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(0);
  const { t } = useLanguage();
  const pageSize = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: pageSize.toString(), offset: (page * pageSize).toString() });
      if (entityFilter !== 'all') params.set('entity_type', entityFilter);
      if (actionFilter !== 'all') params.set('action', actionFilter);
      const res = await fetch(`/api/activity-logs?${params}`, { credentials: 'include' });
      if (res.ok) setLogs(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, [entityFilter, actionFilter, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const entityTypes = ['Client', 'Invoice', 'Expense', 'Product', 'Supplier', 'Payment', 'CashTransaction', 'Quote', 'Transfer'];

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-activity-log-title">{t('activityLog') || 'Activity Log'}</h1>
            <p className="text-sm text-muted-foreground">{t('activityLogDescription') || 'Track all changes made in the system'}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} data-testid="button-refresh-logs">
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('refresh') || 'Refresh'}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]" data-testid="select-entity-filter">
            <SelectValue placeholder={t('allEntities') || 'All Entities'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allEntities') || 'All Entities'}</SelectItem>
            {entityTypes.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px]" data-testid="select-action-filter">
            <SelectValue placeholder={t('allActions') || 'All Actions'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allActions') || 'All Actions'}</SelectItem>
            <SelectItem value="create">{t('created') || 'Created'}</SelectItem>
            <SelectItem value="update">{t('updated') || 'Updated'}</SelectItem>
            <SelectItem value="delete">{t('deleted') || 'Deleted'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground" data-testid="text-no-activity-logs">
            {t('noActivityLogs') || 'No activity logs found'}
          </div>
        ) : (
          <ScrollArea className="max-h-[600px]">
            <div className="divide-y">
              {logs.map((log) => {
                const ActionIcon = actionIcons[log.action] || Activity;
                return (
                  <div key={log.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-accent/30 transition-colors" data-testid={`activity-log-${log.id}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>
                      <ActionIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{log.user_name || log.user_email}</span>
                        {' '}
                        <span className="text-muted-foreground">
                          {log.action === 'create' && (t('created') || 'created')}
                          {log.action === 'update' && (t('updated') || 'updated')}
                          {log.action === 'delete' && (t('deleted') || 'deleted')}
                        </span>
                        {' '}
                        <span className="font-medium">{log.entity_name}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(log.created_at)}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">{log.entity_type}</Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => setPage(p => p - 1)}
          data-testid="button-prev-page"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('previous') || 'Previous'}
        </Button>
        <span className="text-sm text-muted-foreground" data-testid="text-page-number">{t('page') || 'Page'} {page + 1}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={logs.length < pageSize}
          onClick={() => setPage(p => p + 1)}
          data-testid="button-next-page"
        >
          {t('next') || 'Next'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
