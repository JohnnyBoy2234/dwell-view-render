import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PenTool, Type, Upload, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: (signatureBase64: string) => void;
  role: 'LANDLORD' | 'TENANT';
  loading?: boolean;
}

export function SignatureModal({ isOpen, onClose, onSign, role, loading = false }: SignatureModalProps) {
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [signature, setSignature] = useState<string>('');
  const [typedSignature, setTypedSignature] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const { toast } = useToast();

  // Clear signature when modal opens
  useEffect(() => {
    if (isOpen) {
      setSignature('');
      setTypedSignature('');
      setUploadedFile(null);
      setPreviewUrl('');
      setActiveTab('draw');
      clearCanvas();
    }
  }, [isOpen]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const saveCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataURL = canvas.toDataURL('image/png');
      setSignature(dataURL);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
        toast({
          title: "Invalid file type",
          description: "Please upload a PNG or JPEG image",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 2MB",
          variant: "destructive",
        });
        return;
      }

      setUploadedFile(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setPreviewUrl(result);
        setSignature(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateTypedSignature = () => {
    if (!typedSignature.trim()) {
      toast({
        title: "Signature required",
        description: "Please enter your signature",
        variant: "destructive",
      });
      return;
    }

    // Create a canvas to render the typed signature
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 100;

    // Set background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set font and style
    ctx.font = 'italic 24px cursive';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw signature
    ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);

    const dataURL = canvas.toDataURL('image/png');
    setSignature(dataURL);
  };

  const handleSign = () => {
    if (!signature) {
      toast({
        title: "Signature required",
        description: "Please create a signature first",
        variant: "destructive",
      });
      return;
    }

    // Convert data URL to base64
    const base64 = signature.split(',')[1];
    onSign(base64);
  };

  const getCurrentSignature = () => {
    switch (activeTab) {
      case 'draw':
        return signature;
      case 'type':
        return signature;
      case 'upload':
        return signature;
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sign as {role === 'LANDLORD' ? 'Landlord' : 'Tenant'}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="draw" className="flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Draw
            </TabsTrigger>
            <TabsTrigger value="type" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Type
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="space-y-4">
            <div className="space-y-2">
              <Label>Draw your signature</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={200}
                  className="border border-gray-200 rounded cursor-crosshair bg-white"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearCanvas}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button size="sm" onClick={saveCanvasSignature}>
                  <Check className="h-4 w-4 mr-2" />
                  Save Signature
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="type" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="typed-signature">Type your signature</Label>
              <Input
                id="typed-signature"
                placeholder="Enter your signature"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
              />
              <Button onClick={generateTypedSignature} disabled={!typedSignature.trim()}>
                Generate Signature
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signature-upload">Upload signature image</Label>
              <Input
                id="signature-upload"
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileUpload}
              />
              <p className="text-sm text-muted-foreground">
                Upload a PNG or JPEG image (max 2MB) with transparent background
              </p>
              {previewUrl && (
                <div className="mt-4">
                  <Label>Preview:</Label>
                  <img src={previewUrl} alt="Signature preview" className="max-w-full h-32 object-contain border rounded" />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {getCurrentSignature() && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <Label>Signature Preview:</Label>
            <img src={getCurrentSignature()} alt="Signature" className="max-w-full h-20 object-contain" />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSign} disabled={!getCurrentSignature() || loading}>
            {loading ? 'Signing...' : 'Sign Lease'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
