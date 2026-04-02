import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { History, TrendingDown } from 'lucide-react';

export default function QuoteHistory({ clientName }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuoteHistory();
  }, [clientName]);

  const loadQuoteHistory = async () => {
    try {
      const allQuotes = await base44.entities.Quote.filter(
        { client_name: clientName },
        '-created_date',
        50
      );
      setQuotes(allQuotes);
    } catch (error) {
      console.error('Error loading quote history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-xs text-muted-foreground">Shiko historik...</div>;

  if (quotes.length === 0) {
    return <p className="text-xs text-muted-foreground">Asnjë ofertë e mëparshme</p>;
  }

  const prevQuotes = quotes.slice(1, 4);
  const avgAmount = (quotes.reduce((s, q) => s + (q.amount || 0), 0) / quotes.length).toFixed(2);

  return (
    <div className="space-y-2 mt-3 p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <History className="w-4 h-4" /> Historik Kliente
      </div>
      <p className="text-xs text-muted-foreground">
        {quotes.length} ofertat totale | Mesatare: €{avgAmount}
      </p>
      {prevQuotes.length > 0 && (
        <div className="space-y-1 text-xs">
          <p className="font-medium text-muted-foreground">Ofertat e mëparshme:</p>
          {prevQuotes.map((q) => (
            <div key={q.id} className="flex justify-between text-muted-foreground">
              <span>{format(new Date(q.created_date), 'dd MMM yyyy')} - €{(q.amount || 0).toFixed(2)}</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                {q.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}