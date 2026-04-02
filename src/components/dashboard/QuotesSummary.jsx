import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function QuotesSummary() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const data = await base44.entities.Quote.list('-created_date', 100);
        setQuotes(data);
      } catch (error) {
        console.error('Error fetching quotes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, []);

  const totalQuotes = quotes.length;
  const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length;
  const totalValue = quotes.reduce((sum, q) => sum + (q.amount || 0), 0);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6 animate-pulse">
        <div className="h-12 bg-slate-200 rounded-lg mb-4"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200/60 shadow-sm p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Ofertat</h3>
          </div>
          <p className="text-sm text-slate-600 ml-10">Gjendja e ofertave në ekzekutim</p>
        </div>
        <TrendingUp className="w-5 h-5 text-blue-500" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3.5">
          <p className="text-xs text-slate-600 mb-1">Gjithsej</p>
          <p className="text-2xl font-bold text-slate-900">{totalQuotes}</p>
        </div>
        <div className="bg-white rounded-xl p-3.5">
          <p className="text-xs text-slate-600 mb-1">Të Pranuara</p>
          <p className="text-2xl font-bold text-green-600">{acceptedQuotes}</p>
        </div>
        <div className="bg-white rounded-xl p-3.5">
          <p className="text-xs text-slate-600 mb-1">Vlera</p>
          <p className="text-lg font-bold text-blue-600">€{(totalValue / 1000).toFixed(0)}k</p>
        </div>
      </div>

      {/* Status badges */}
      <div className="mt-4 flex gap-2 flex-wrap">
        {['draft', 'sent', 'accepted'].map(status => {
          const count = quotes.filter(q => q.status === status).length;
          return count > 0 ? (
            <span key={status} className="text-xs font-medium px-2.5 py-1 bg-white rounded-lg text-slate-700">
              {status.charAt(0).toUpperCase() + status.slice(1)}: {count}
            </span>
          ) : null;
        })}
      </div>
    </div>
  );
}