import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CaptureSession {
  sid: string;
  qrPayload: string;
  deeplink: string;
}

export function useKycCapture() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const createCaptureSession = async (purpose: 'id_front' | 'selfie'): Promise<CaptureSession | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('kyc-create-capture-session', {
        body: { purpose }
      });

      if (error) {
        throw new Error(error.message);
      }
      
      return {
        sid: data.sid,
        qrPayload: data.qrPayload,
        deeplink: data.deeplink
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create capture session';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateKycProfile = async (purpose: 'id_front' | 'selfie', filePath: string) => {
    try {
      const columnMap = {
        'id_front': 'id_front_path',
        'selfie': 'selfie_path'
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const updateData = { [columnMap[purpose]]: filePath };
      
      const { error } = await supabase
        .from('kyc_profiles')
        .upsert({
          user_id: user.id,
          ...updateData
        });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Success",
        description: `${purpose.replace('_', ' ')} uploaded successfully`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update KYC profile';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Upload Error", 
        description: errorMessage,
      });
      throw err;
    }
  };

  return {
    createCaptureSession,
    updateKycProfile,
    loading,
    error,
    clearError: () => setError(null)
  };
}