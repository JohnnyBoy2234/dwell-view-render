import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface GateStatus {
  emailVerified: boolean;
  kycStatus: 'not_started' | 'submitted' | 'approved' | 'declined';
  canRequestViewing: boolean;
}

export function useGateStatus() {
  const { user } = useAuth();
  const [gateStatus, setGateStatus] = useState<GateStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkGateStatus = async () => {
    if (!user) {
      setGateStatus(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('check_user_gate_status', { _user_id: user.id })
        .single();

      if (error) throw error;

      setGateStatus({
        emailVerified: data.email_verified,
        kycStatus: data.kyc_status as any,
        canRequestViewing: data.can_request_viewing
      });
    } catch (error) {
      console.error('Error checking gate status:', error);
      // Fallback to basic checks
      setGateStatus({
        emailVerified: !!user.email_confirmed_at,
        kycStatus: 'not_started',
        canRequestViewing: false
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkGateStatus();
  }, [user]);

  return {
    gateStatus,
    loading,
    refresh: checkGateStatus
  };
}