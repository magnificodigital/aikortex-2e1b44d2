import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Download, Check } from "lucide-react";

interface SignatureCanvasProps {
  onSign: (dataUrl: string) => void;
  onClear?: () => void;
  width?: number;
  height?: number;
}

const SignatureCanvas = ({ onSign, onClear, width = 500, height = 200 }: SignatureCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "hsl(var(--background))";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "hsl(var(--foreground))";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasContent(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "hsl(var(--background))";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
    onClear?.();
  }, [onClear]);

  const confirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;
    onSign(canvas.toDataURL("image/png"));
  };

  return (
    <div className="space-y-3">
      <div className="border border-border rounded-lg overflow-hidden bg-background">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="border-t border-dashed border-muted-foreground/30 mx-8" />
        <p className="text-[10px] text-muted-foreground text-center py-1">Assine acima</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clear} className="flex-1">
          <Eraser className="w-3.5 h-3.5 mr-1" /> Limpar
        </Button>
        <Button size="sm" onClick={confirm} disabled={!hasContent} className="flex-1">
          <Check className="w-3.5 h-3.5 mr-1" /> Confirmar Assinatura
        </Button>
      </div>
    </div>
  );
};

export default SignatureCanvas;
