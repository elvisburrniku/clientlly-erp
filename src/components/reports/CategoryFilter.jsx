import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CategoryFilter({ value, onChange }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    base44.entities.Product.list("-created_date", 100)
      .then(setProducts)
      .catch(() => {});
  }, []);

  const uniqueTypes = Array.from(new Set(products.map(p => p.type))).filter(Boolean);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() => onChange("all")}
        className={cn(
          "text-sm font-medium transition-all",
          value === "all" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
        )}
      >
        Të Gjitha
      </Button>
      {uniqueTypes.map(type => (
        <Button
          key={type}
          onClick={() => onChange(type)}
          className={cn(
            "text-sm font-medium transition-all",
            value === type ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          {type === "product" ? "Produktet" : "Shërbimet"}
        </Button>
      ))}
    </div>
  );
}