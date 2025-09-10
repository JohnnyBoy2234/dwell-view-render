import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { KycProfile, KycAuditLog } from '@/types/kyc';

export function useKyc() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [kycProfile, setKycProfile] = useState<KycProfile | null>(null);
  const [auditLogs, setAuditLogs] = useState<KycAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchKycProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('kyc_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setKycProfile(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading KYC profile",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('kyc_audit')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const uploadFile = async (file: File, kind: 'id_doc' | 'id_front' | 'selfie') => {
    if (!user) throw new Error('User not authenticated');
    
    setUploading(true);
    
    try {
      // Validate file
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload JPEG, PNG, or WebP images.');
      }
      
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      // Create file path
      const timestamp = new Date().toISOString();
      const fileName = `${kind}_${timestamp}.${file.name.split('.').pop()}`;
      const filePath = `kyc/${user.id}/${fileName}`;

      // Upload to storage
      const { data, error } = await supabase.storage
        .from('kyc-uploads')
        .upload(filePath, file, {
          cacheControl: 'private, max-age=60',
          upsert: false
        });

      if (error) throw error;

      // Update or create KYC profile
      const pathField = kind === 'selfie' ? 'selfie_path' : 
                       kind === 'id_front' ? 'id_front_path' : 'id_doc_path';
      
      const updateData = {
        user_id: user.id,
        [pathField]: data.path,
        status: 'not_started' as const
      };

      const { error: profileError } = await supabase
        .from('kyc_profiles')
        .upsert(updateData);

      if (profileError) throw profileError;

      // Create audit log
      await supabase.rpc('create_kyc_audit_log', {
        _user_id: user.id,
        _action: 'uploaded',
        _metadata: {
          file_kind: kind,
          file_path: data.path,
          file_size: file.size,
          file_type: file.type
        }
      });

      // Log telemetry event
      await supabase.rpc('log_event', {
        _user_id: user.id,
        _name: 'kyc_uploaded',
        _properties: {
          file_kind: kind,
          file_size: file.size,
          file_type: file.type
        }
      });

      const description = kind === 'selfie' ? 'selfie' :
                         kind === 'id_front' ? 'front of ID' : 'ID document';
      
      toast({
        title: "File uploaded successfully",
        description: `Your ${description} has been uploaded.`,
      });

      await fetchKycProfile();
      return data.path;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const submitForReview = async () => {
    if (!user || !kycProfile?.selfie_path || !kycProfile?.id_front_path) {
      throw new Error('Front ID and selfie with ID are required');
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('kyc_profiles')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Create audit log
      await supabase.rpc('create_kyc_audit_log', {
        _user_id: user.id,
        _action: 'submitted',
        _metadata: {
          ip_address: await getClientIP(),
          user_agent: navigator.userAgent
        }
      });

      // Log telemetry event
      await supabase.rpc('log_event', {
        _user_id: user.id,
        _name: 'kyc_submitted',
        _properties: {
          submitted_at: new Date().toISOString()
        }
      });

      // Trigger notification to admins
      await fetch('/api/kyc/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      });

      toast({
        title: "Submitted for review",
        description: "Your identity verification has been submitted. You'll be notified once reviewed.",
      });

      await fetchKycProfile();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error.message,
      });
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const resubmit = async () => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Clear existing files if any
      const filesToRemove = [];
      if (kycProfile?.id_doc_path) filesToRemove.push(kycProfile.id_doc_path);
      if (kycProfile?.id_front_path) filesToRemove.push(kycProfile.id_front_path);
      if (kycProfile?.selfie_path) filesToRemove.push(kycProfile.selfie_path);
      
      if (filesToRemove.length > 0) {
        await supabase.storage
          .from('kyc-uploads')
          .remove(filesToRemove);
      }

      // Reset profile
      const { error } = await supabase
        .from('kyc_profiles')
        .update({
          status: 'not_started',
          id_doc_path: null,
          id_front_path: null,
          selfie_path: null,
          notes: null,
          reviewed_by: null,
          reviewed_at: null,
          submitted_at: null
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Create audit log
      await supabase.rpc('create_kyc_audit_log', {
        _user_id: user.id,
        _action: 'resubmit_request'
      });

      toast({
        title: "Reset successful",
        description: "You can now upload new documents for verification.",
      });

      await fetchKycProfile();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: error.message,
      });
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      fetchKycProfile();
      fetchAuditLogs();
    }
  }, [user]);

  return {
    kycProfile,
    auditLogs,
    loading,
    uploading,
    submitting,
    uploadFile,
    submitForReview,
    resubmit,
    refresh: fetchKycProfile
  };
}

// Helper function to get client IP (simplified)
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
}