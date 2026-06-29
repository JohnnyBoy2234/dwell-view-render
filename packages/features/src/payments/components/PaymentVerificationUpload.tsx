import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Upload, Loader2 } from 'lucide-react';
import { usePaymentVerification } from '../hooks/usePaymentVerification';
import StarCelebrationModal from './StarCelebrationModal';
import BadgeUnlockModal from './BadgeUnlockModal';

interface PaymentVerificationUploadProps {
  tenancyId: string;
  expectedAmount: number;
}

export default function PaymentVerificationUpload({ 
  tenancyId, 
  expectedAmount 
}: PaymentVerificationUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showStarModal, setShowStarModal] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  
  const { uploading, verifying, uploadAndVerifyProof } = usePaymentVerification();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const result = await uploadAndVerifyProof(selectedFile, tenancyId, expectedAmount);
    
    if (result) {
      setVerificationResult(result);
      
      if (result.starAwarded) {
        setShowStarModal(true);
      }
      
      if (result.badgeUnlocked) {
        setTimeout(() => {
          setShowStarModal(false);
          setShowBadgeModal(true);
        }, 3000);
      }
      
      setSelectedFile(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>AI Payment Verification</CardTitle>
          <CardDescription>
            Upload your proof of payment and our AI will automatically verify it
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="proof">Select proof of payment</Label>
            <Input
              id="proof"
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              disabled={uploading || verifying}
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading || verifying}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying with AI...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload & Verify
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {verificationResult && (
        <>
          <StarCelebrationModal
            open={showStarModal}
            onClose={() => setShowStarModal(false)}
            wasEarly={false}
            currentStars={8}
            totalStarsNeeded={12}
          />
          
          <BadgeUnlockModal
            open={showBadgeModal}
            onClose={() => setShowBadgeModal(false)}
            badgeYear={new Date().getFullYear()}
            starsCount={12}
          />
        </>
      )}
    </>
  );
}
