import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function LowStockAlert() {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLowStock();
  }, []);

  const loadLowStock = async () => {
    try {
      const inventory = await base44.entities.Inventory.list("-created_date", 100);
      const low = inventory.filter(item => item.quantity <= item.min_quantity);
      setLowStockItems(low.sort((a, b) => a.quantity - b.quantity));
    } catch (err) {
      console.error("Error loading inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || lowStockItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-amber-900 mb-3">
            {lowStockItems.length} Produkte me Stok të Ulët
          </h3>
          <div className="space-y-2 mb-4">
            {lowStockItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm bg-white rounded-lg p-3">
                <div>
                  <p className="font-medium text-amber-900">{item.product_name}</p>
                  <p className="text-xs text-amber-700">
                    {item.quantity} {item.unit} (Min: {item.min_quantity} {item.unit})
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="inline-block px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                    {Math.round((item.quantity / item.min_quantity) * 100)}%
                  </span>
                </div>
              </div>
            ))}
            {lowStockItems.length > 5 && (
              <p className="text-xs text-amber-700 px-3">+{lowStockItems.length - 5} të tjera...</p>
            )}
          </div>
          <Link to="/inventory">
            <Button variant="outline" size="sm" className="gap-2 text-amber-700 border-amber-200 hover:bg-amber-100">
              <Plus className="w-4 h-4" /> Riformo Inventarin
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}