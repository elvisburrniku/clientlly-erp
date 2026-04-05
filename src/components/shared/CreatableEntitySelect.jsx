import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const defaultFindSelectedItem = (items, value) => {
  if (value === null || value === undefined || value === "") return null;
  return items.find(item =>
    item?.id === value ||
    String(item?.id) === String(value) ||
    item?.code === value ||
    item?.name === value
  ) || null;
};

const defaultFilterItem = (item, query) => {
  const haystack = [
    item?.name,
    item?.code,
    item?.email,
    item?.category,
    item?.subcategory,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
};

export default function CreatableEntitySelect({
  value,
  items = [],
  onSelect,
  onCreate,
  onItemsChange,
  renderSelected,
  renderOptions,
  renderCreateFields,
  findSelectedItem = defaultFindSelectedItem,
  filterItem = defaultFilterItem,
  placeholder = "Zgjedh...",
  searchPlaceholder = "Kërko...",
  emptyMessage = "Nuk u gjet asnjë rezultat",
  addLabel = "Shto të ri",
  createTitle = "Shto të ri",
  createButtonLabel = "Shto",
  widthClassName = "w-80",
  maxHeightClassName = "max-h-72",
  initialDraft = {},
  canCreate = () => true,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  const [creating, setCreating] = useState(false);
  const rootRef = useRef(null);

  const selectedItem = useMemo(() => findSelectedItem(items, value), [items, value, findSelectedItem]);

  useEffect(() => {
    const handleClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
        setShowAdd(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredItems = query ? items.filter((item) => filterItem(item, query)) : items;

  const closeAndReset = () => {
    setOpen(false);
    setQuery("");
    setShowAdd(false);
  };

  const handleSelect = (item) => {
    onSelect?.(item);
    closeAndReset();
  };

  const handleCreate = async () => {
    if (!canCreate(draft) || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(draft);
      if (created && onItemsChange) {
        onItemsChange([...items, created]);
      }
      if (created) {
        onSelect?.(created);
      }
      setDraft(initialDraft);
      closeAndReset();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setQuery("");
          setShowAdd(false);
        }}
        className={cn(
          "w-full flex items-center justify-between gap-2 h-9 px-3 rounded-md border border-input bg-transparent text-sm shadow-sm transition-colors hover:bg-accent",
          open && "ring-1 ring-ring border-ring"
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selectedItem ? (
            renderSelected ? renderSelected(selectedItem, value) : <span className="truncate text-foreground">{selectedItem.name}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className={cn("absolute z-50 mt-1 bg-white border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100", widthClassName)}>
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className={cn("overflow-y-auto", maxHeightClassName)}>
            {renderOptions ? (
              renderOptions({ items: filteredItems, selectedItem, selectItem: handleSelect, query, emptyMessage })
            ) : (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</div>
            )}
          </div>

          <div className="border-t border-border p-2">
            {!showAdd ? (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> {addLabel}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{createTitle}</div>
                {renderCreateFields({ draft, setDraft, creating })}
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating || !canCreate(draft)}
                    className="flex-1 h-8 text-sm bg-primary text-primary-foreground rounded-md font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                  >
                    {creating ? "Duke shtuar..." : createButtonLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdd(false);
                      setDraft(initialDraft);
                    }}
                    className="flex-1 h-8 text-sm border border-input rounded-md hover:bg-muted transition-colors"
                  >
                    Anulo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
