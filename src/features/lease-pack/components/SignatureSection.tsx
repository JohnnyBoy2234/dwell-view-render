import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Person } from "../types";
import { EmbeddedSignatureCapture } from "./EmbeddedSignatureCapture";

interface SignatureSectionProps {
  title: string;
  signer?: Person;
  onSignature: (data: { pngPath?: string; typedName?: string }) => void;
  disabled?: boolean;
}

export function SignatureSection({ title, signer, onSignature, disabled }: SignatureSectionProps) {
  const [typedName, setTypedName] = useState(signer?.fullName || "");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureMethod, setSignatureMethod] = useState<"draw" | "type">("draw");

  const handleSignatureCapture = (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
  };

  const handleComplete = () => {
    console.log('Signature completion attempt:', { 
      method: signatureMethod, 
      typedName, 
      hasDrawnSignature: !!signatureDataUrl 
    });

    if (!typedName.trim()) {
      alert("Please enter your full legal name");
      return;
    }

    if (signatureMethod === "type") {
      console.log('Completing with typed signature');
      onSignature({ 
        typedName: typedName.trim(),
        pngPath: undefined // Clear any previous drawn signature
      });
    } else if (signatureMethod === "draw") {
      if (!signatureDataUrl) {
        alert("Please provide your drawn signature");
        return;
      }
      console.log('Completing with drawn signature');
      onSignature({ 
        pngPath: signatureDataUrl, 
        typedName: typedName.trim()
      });
    }
  };

  const isValid = (signatureMethod === "type" && typedName.trim()) || 
                  (signatureMethod === "draw" && signatureDataUrl && typedName.trim());

  if (disabled) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">Signature completed</div>
        <div className="bg-success/10 p-4 rounded-lg text-success text-sm font-medium">
          ✓ Signed electronically
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signer-name">Full Legal Name</Label>
        <Input
          id="signer-name"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder="Enter your full legal name"
          required
        />
        <p className="text-xs text-muted-foreground">
          This must match your ID document exactly
        </p>
      </div>

      <Tabs value={signatureMethod} onValueChange={(value: any) => setSignatureMethod(value)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="draw">Draw Signature</TabsTrigger>
          <TabsTrigger value="type">Type Signature</TabsTrigger>
        </TabsList>
        
        <TabsContent value="draw" className="space-y-4">
          <EmbeddedSignatureCapture
            onSignatureCapture={handleSignatureCapture}
            className="w-full"
          />
        </TabsContent>
        
        <TabsContent value="type" className="space-y-4">
          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
            <div className="text-3xl font-script text-primary mb-2" style={{ fontFamily: 'cursive' }}>
              {typedName || "Your name will appear here"}
            </div>
            <p className="text-sm text-muted-foreground">
              Your typed name will serve as your electronic signature
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <Button onClick={handleComplete} disabled={!isValid} className="w-full">
        Confirm Signature
      </Button>
    </div>
  );
}