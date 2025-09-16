import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { SignatureData, ESignatureSession } from '@/types/lease';

export function useESignature() {
  const { user } = useAuth();
  const [signing, setSigning] = useState(false);
  const [signatureSession, setSignatureSession] = useState<ESignatureSession | null>(null);

  const createSignatureSession = async (contractId: string, signerRole: 'landlord' | 'tenant'): Promise<ESignatureSession | null> => {
    if (!user) return null;

    try {
      setSigning(true);
      const { data, error } = await supabase.functions.invoke('create-signature-session', {
        body: { contractId, signerRole }
      });

      if (error) throw error;

      const session: ESignatureSession = {
        contract_id: contractId,
        signer_role: signerRole,
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      };

      setSignatureSession(session);
      return session;
    } catch (err) {
      console.error('Error creating signature session:', err);
      toast.error('Failed to create signature session');
      return null;
    } finally {
      setSigning(false);
    }
  };

  const captureSignature = async (
    contractId: string,
    signatureDataUrl: string,
    consentAcknowledged: boolean
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      setSigning(true);

      // Get user's IP and user agent
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      const userAgent = navigator.userAgent;

      // Create signature hash
      const signatureHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(signatureDataUrl + Date.now())
      );
      const hashArray = Array.from(new Uint8Array(signatureHash));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Get geolocation if available
      let geolocation = undefined;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          geolocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        } catch {
          // Geolocation failed, continue without it
        }
      }

      const signatureData: SignatureData = {
        signature_image_url: signatureDataUrl,
        signature_hash: hashHex,
        signed_at: new Date().toISOString(),
        ip_address: ipData.ip,
        user_agent: userAgent,
        geolocation,
        consent_acknowledged: consentAcknowledged
      };

      // Sign contract via edge function
      const { data, error } = await supabase.functions.invoke('sign-lease-contract', {
        body: { contractId, signatureData }
      });

      if (error) throw error;

      toast.success('Contract signed successfully');
      return true;
    } catch (err) {
      console.error('Error capturing signature:', err);
      toast.error('Failed to sign contract');
      return false;
    } finally {
      setSigning(false);
    }
  };

  const verifySignature = async (contractId: string, signatureHash: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-signature', {
        body: { contractId, signatureHash }
      });

      if (error) throw error;
      return data.isValid;
    } catch (err) {
      console.error('Error verifying signature:', err);
      return false;
    }
  };

  const getSignatureAuditTrail = async (contractId: string) => {
    try {
      const { data, error } = await supabase
        .from('signature_audit')
        .select('*')
        .eq('lease_contract_id', contractId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching signature audit trail:', err);
      return [];
    }
  };

  return {
    signing,
    signatureSession,
    createSignatureSession,
    captureSignature,
    verifySignature,
    getSignatureAuditTrail
  };
}