import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Offer {
  id: string;
  listing_id: string;
  landlord_id: string;
  tenant_id: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  terms_json: {
    rent: number;
    deposit: number;
    start: string;
    end: string;
    address: string;
    landlord_name?: string;
    tenant_name?: string;
    payment_day?: number;
    utilities_included?: boolean;
    notes?: string;
    [key: string]: any;
  };
  created_at: string;
  expires_at?: string;
  updated_at: string;
}

export function useOffers(propertyId?: string) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchOffers = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (propertyId) {
        query = query.eq('listing_id', propertyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOffers((data || []) as Offer[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching offers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  };

  const createOffer = async (offerData: {
    listing_id: string;
    tenant_id: string;
    terms_json: Offer['terms_json'];
    expires_at?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('offers')
      .insert({
        ...offerData,
        landlord_id: user.id,
        status: 'sent'
      })
      .select()
      .single();

    if (error) throw error;
    
    // Refresh offers list
    fetchOffers();
    
    return data;
  };

  const updateOfferStatus = async (offerId: string, status: Offer['status']) => {
    const { error } = await supabase
      .from('offers')
      .update({ status })
      .eq('id', offerId);

    if (error) throw error;
    
    // Refresh offers list
    fetchOffers();
  };

  const acceptOffer = async (offerId: string, autoCreateLease = true) => {
    // Update offer status
    await updateOfferStatus(offerId, 'accepted');

    if (autoCreateLease) {
      // Convert offer to lease
      const response = await supabase.functions.invoke('offer-to-lease', {
        body: { 
          offerId, 
          autoSendForSignature: true 
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create lease');
      }

      return response.data;
    }
  };

  const declineOffer = async (offerId: string) => {
    await updateOfferStatus(offerId, 'declined');
  };

  useEffect(() => {
    fetchOffers();
  }, [user, propertyId]);

  return {
    offers,
    loading,
    error,
    createOffer,
    acceptOffer,
    declineOffer,
    updateOfferStatus,
    refetch: fetchOffers
  };
}