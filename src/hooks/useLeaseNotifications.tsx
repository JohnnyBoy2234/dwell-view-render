import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export function useLeaseNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Subscribe to lease changes
    const leaseSubscription = supabase
      .channel('lease-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leases',
          filter: `or(landlord_user_id.eq.${user.id},tenant_user_id.eq.${user.id})`
        },
        (payload) => {
          handleLeaseNotification(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lease_signatures',
          filter: `signer_user_id.eq.${user.id}`
        },
        (payload) => {
          handleSignatureNotification(payload);
        }
      )
      .subscribe();

    return () => {
      leaseSubscription.unsubscribe();
    };
  }, [user]);

  const handleLeaseNotification = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch (eventType) {
      case 'INSERT':
        if (newRecord.landlord_user_id === user?.id) {
          toast({
            title: "Lease Generated",
            description: "Your lease has been generated successfully",
          });
        } else if (newRecord.tenant_user_id === user?.id) {
          toast({
            title: "New Lease Available",
            description: "A new lease is ready for your review and signature",
          });
        }
        break;
        
      case 'UPDATE':
        if (newRecord.status !== oldRecord.status) {
          handleStatusChange(newRecord, oldRecord);
        }
        break;
    }
  };

  const handleSignatureNotification = (payload: any) => {
    const { eventType, new: newRecord } = payload;
    
    if (eventType === 'UPDATE' && newRecord.signed_at) {
      toast({
        title: "Lease Signed",
        description: `You have successfully signed the lease as ${newRecord.role.toLowerCase()}`,
      });
    }
  };

  const handleStatusChange = (newRecord: any, oldRecord: any) => {
    const isLandlord = newRecord.landlord_user_id === user?.id;
    const isTenant = newRecord.tenant_user_id === user?.id;
    
    if (!isLandlord && !isTenant) return;

    switch (newRecord.status) {
      case 'PENDING_TENANT_SIGNATURE':
        if (isTenant) {
          toast({
            title: "Signature Required",
            description: "The landlord has signed. Your signature is now required.",
          });
        }
        break;
        
      case 'PENDING_LANDLORD_SIGNATURE':
        if (isLandlord) {
          toast({
            title: "Signature Required",
            description: "The tenant has signed. Your signature is now required.",
          });
        }
        break;
        
      case 'COMPLETED':
        toast({
          title: "Lease Completed",
          description: "The lease has been fully executed and is now active.",
        });
        break;
        
      case 'CHANGES_REQUESTED':
        toast({
          title: "Changes Requested",
          description: "One party has requested changes to the lease.",
        });
        break;
        
      case 'CANCELED':
        toast({
          title: "Lease Canceled",
          description: "The lease has been canceled.",
          variant: "destructive",
        });
        break;
    }
  };
}
