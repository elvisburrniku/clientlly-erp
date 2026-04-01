import { Truck } from "lucide-react";

export default function Suppliers() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Furnitorët</h1>
        <p className="text-sm text-muted-foreground mt-1">Menaxhimi i furnitorëve</p>
      </div>
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <Truck className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">Moduli i furnitorëve do të aktivizohet së shpejti</p>
      </div>
    </div>
  );
}