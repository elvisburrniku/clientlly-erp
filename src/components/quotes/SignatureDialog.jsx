import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export default function SignatureDialog({ open, onOpenChange, onSignatureSaved }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState(null);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left || e.touches?.[0]?.clientX - rect.left;
    const y = e.clientY - rect.top || e.touches?.[0]?.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left || e.touches?.[0]?.clientX - rect.left;
    const y = e.clientY - rect.top || e.touches?.[0]?.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature(null);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL('image/png');
    setSignature(signatureData);
    onSignatureSaved(signatureData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nënshkruaj Ofertën Digjitalisht</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vizatoni nënshkrimin tuaj në kutinë më poshtë
          </p>
          
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="border-2 border-border rounded-lg bg-white cursor-crosshair w-full"
          />
          
          <div className="flex gap-2 justify-between">
            <Button
              variant="outline"
              onClick={clearSignature}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" /> Fshi
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Anulo
              </Button>
              <Button onClick={saveSignature}>
                Ruaj Nënshkrimin
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}