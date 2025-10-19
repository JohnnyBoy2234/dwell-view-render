import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface GateStatus {
  emailVerified: boolean;
  kycStatus: 'not_started' | 'submitted' | 'approved' | 'declined';
  canRequestViewing: boolean;
}

export function useGateStatus() {
  const { user } = useAuth();
  const [gateStatus, setGateStatus] = useState<GateStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGateStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check email verification
        const emailVerified = !!user.email_confirmed_at;

        // Check KYC status from kyc_profiles table
        const { data: kycData, error: kycError } = await supabase
          .from('kyc_profiles')
          .select('status')
          .eq('user_id', user.id)
          .maybeSingle();

        if (kycError) {
          console.error('Error fetching KYC status:', kycError);
        }

        const kycStatus = (kycData?.status as GateStatus['kycStatus']) || 'not_started';
        const canRequestViewing = emailVerified && kycStatus === 'approved';

        setGateStatus({
          emailVerified,
          kycStatus,
          canRequestViewing,
        });
      } catch (error) {
        console.error('Error fetching gate status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGateStatus();
  }, [user]);

  return { gateStatus, loading };
}
