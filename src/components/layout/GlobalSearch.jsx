import { useState, useEffect, useRef, useCallback } from "react";
import { Search, FileText, Users, Package, Truck, DollarSign, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/useLanguage";
import { cn } from "@/lib/utils";

const typeIcons = {
  client: Users,
  invoice: FileText,
  product: Package,
  supplier: Truck,
  expense: DollarSign,
};

const typeRoutes = {
  client: (r) => `/client-detail/${r.id}`,
  invoice: (r) => `/invoices/${r.id}`,
  product: () => `/products`,
  supplier: () => `/suppliers`,
  expense: () => `/expenses`,
};

const typeLabels = {
  client: 'Client',
  invoice: 'Invoice',
  product: 'Product',
  supplier: 'Supplier',
  expense: 'Expense',
};

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const debounceRef = useRef(null);

  const search = useCallback(async (term) => {
    if (!term || term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setSelectedIdx(-1);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result) => {
    const route = typeRoutes[result.type]?.(result);
    if (route) navigate(route);
    setQuery("");
    setIsOpen(false);
    setResults([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIdx]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          data-testid="input-global-search"
          placeholder={t('searchPlaceholder') || 'Search clients, invoices, products...'}
          className="w-full h-9 pl-9 pr-8 rounded-xl border border-border bg-muted/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-accent rounded"
            onClick={() => { setQuery(""); setResults([]); }}
            data-testid="button-clear-search"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {isOpen && (query.length >= 2) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {loading ? (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">{t('searching') || 'Searching...'}</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center" data-testid="text-no-search-results">{t('noResults') || 'No results found'}</div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              {results.map((result, idx) => {
                const Icon = typeIcons[result.type] || FileText;
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    data-testid={`search-result-${result.type}-${result.id}`}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-accent transition-colors",
                      idx === selectedIdx && "bg-accent"
                    )}
                    onClick={() => handleSelect(result)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.label}</p>
                      {result.sub && <p className="text-xs text-muted-foreground truncate">{result.sub}</p>}
                    </div>
                    <span className="text-[10px] uppercase text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
                      {typeLabels[result.type] || result.type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
