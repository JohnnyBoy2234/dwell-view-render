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
      console.log('Invoking kyc-create-capture-session with purpose:', purpose);
      const { data, error } = await supabase.functions.invoke('kyc-create-capture-session', {
        body: { purpose }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function error:', error);
        throw new Error(error.message);
      }
      
      if (!data) {
        throw new Error('No data returned from function');
      }
      
      const sessionData = {
        sid: data.sid,
        qrPayload: data.qrPayload,
        deeplink: data.deeplink
      };
      
      console.log('Session data created:', sessionData);
      return sessionData;
    } catch (err) {
      console.error('Error in createCaptureSession:', err);
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
      console.log('Updating KYC profile:', { purpose, filePath });
      
      const columnMap = {
        'id_front': 'id_front_path',
        'selfie': 'selfie_path'
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const updateData = { [columnMap[purpose]]: filePath };
      
      console.log('Updating with data:', { user_id: user.id, ...updateData });
      
      const { error } = await supabase
        .from('kyc_profiles')
        .upsert({
          user_id: user.id,
          ...updateData
        });

      if (error) {
        console.error('Database update error:', error);
        throw new Error(error.message);
      }

      console.log('KYC profile updated successfully');
      toast({
        title: "Success",
        description: `${purpose.replace('_', ' ')} uploaded successfully`,
      });

    } catch (err) {
      console.error('Error in updateKycProfile:', err);
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