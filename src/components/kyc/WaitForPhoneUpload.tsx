import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Smartphone, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WaitForPhoneUploadProps {
  sid: string;
  onUploaded: (filePath: string) => void;
  onExpired: () => void;
}

export function WaitForPhoneUpload({ sid, onUploaded, onExpired }: WaitForPhoneUploadProps) {
  const [status, setStatus] = useState<'waiting' | 'uploaded' | 'expired'>('waiting');
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to realtime channel for this session
    const channel = supabase.channel(`kyc_capture:${sid}`, {
      config: { broadcast: { self: false } }
    });

    channel.on('broadcast', { event: 'status' }, (payload) => {
      console.log('Received broadcast for session:', sid, 'payload:', payload);
      
      if (payload?.status === 'uploaded' && payload?.filePath) {
        console.log('File uploaded successfully:', payload.filePath);
        setStatus('uploaded');
        onUploaded(payload.filePath);
        toast({
          title: "Photo received!",
          description: "Your photo has been uploaded successfully.",
        });
      } else if (payload?.status === 'expired') {
        console.log('Session expired for session:', sid);
        setStatus('expired');
        onExpired();
      } else {
        console.log('Unknown broadcast payload:', payload);
      }
    });

    channel.subscribe((status) => {
      console.log('Channel subscription status:', status);
    });

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus('expired');
          onExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [sid, onUploaded, onExpired, toast]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === 'expired') {
    return (
      <Alert className="border-destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>QR code expired. Generate a new one to continue.</span>
          <Button size="sm" variant="outline" onClick={onExpired}>
            Generate New QR
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'uploaded') {
    return (
      <Alert className="border-success">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Photo received successfully! Processing...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      <Smartphone className="h-4 w-4" />
      <AlertDescription className="space-y-2">
        <div className="flex items-center justify-between">
          <span>Waiting for your phone upload...</span>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatTime(timeLeft)}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Scan the QR code with your phone, take a photo, and it will appear here automatically.
        </div>
      </AlertDescription>
    </Alert>
  );
}