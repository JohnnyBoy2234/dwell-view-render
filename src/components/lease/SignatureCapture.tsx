import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas } from "fabric";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface SignatureCaptureProps {
  onSignatureCapture: (signatureDataUrl: string) => void;
  onCancel?: () => void;
  title?: string;
  className?: string;
}

export const SignatureCapture = ({ 
  onSignatureCapture, 
  onCancel, 
  title = "Please sign below",
  className = ""
}: SignatureCaptureProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 600,
      height: 200,
      backgroundColor: "#ffffff",
      isDrawingMode: true,
    });

    // Configure drawing brush
    canvas.freeDrawingBrush.color = "#000000";
    canvas.freeDrawingBrush.width = 2;

    // Track when user starts drawing
    canvas.on('path:created', () => {
      setHasSignature(true);
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  const handleClear = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
    setHasSignature(false);
    toast("Signature cleared");
  };

  const handleSave = () => {
    if (!fabricCanvas || !hasSignature) {
      toast.error("Please provide your signature before saving");
      return;
    }

    const dataUrl = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2
    });

    onSignatureCapture(dataUrl);
    toast.success("Signature captured successfully");
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border border-gray-300 rounded-lg bg-white">
          <canvas 
            ref={canvasRef} 
            className="block cursor-crosshair"
            style={{ touchAction: 'none' }}
          />
        </div>
        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <Button onClick={handleSave} disabled={!hasSignature}>
            Save Signature
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Use your mouse or touch to sign in the box above
        </p>
      </CardContent>
    </Card>
  );
};