import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SupportMessage {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  category: 'general' | 'technical' | 'billing' | 'property' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  admin_response?: string;
  admin_responded_at?: string;
  admin_responded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupportMessage {
  subject: string;
  message: string;
  category: 'general' | 'technical' | 'billing' | 'property' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export function useSupportMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchMessages = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching support messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const createMessage = async (messageData: CreateSupportMessage) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from('support_messages')
        .insert({
          user_id: user.id,
          subject: messageData.subject,
          message: messageData.message,
          category: messageData.category,
          priority: messageData.priority || 'medium'
        })
        .select()
        .single();

      if (error) throw error;
      
      // Refresh messages
      await fetchMessages();
      return data;
    } catch (error) {
      console.error('Error creating support message:', error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const updateMessage = async (id: string, updates: Partial<SupportMessage>) => {
    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from('support_messages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Refresh messages
      await fetchMessages();
      return data;
    } catch (error) {
      console.error('Error updating support message:', error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [user]);

  return {
    messages,
    loading,
    submitting,
    createMessage,
    updateMessage,
    fetchMessages
  };
}

export function useAdminSupportMessages() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchAllMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_messages')
        .select(`
          *,
          profiles:user_id (
            display_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching all support messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const respondToMessage = async (id: string, response: string, adminUserId: string) => {
    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from('support_messages')
        .update({
          admin_response: response,
          admin_responded_at: new Date().toISOString(),
          admin_responded_by: adminUserId,
          status: 'resolved'
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Refresh messages
      await fetchAllMessages();
      return data;
    } catch (error) {
      console.error('Error responding to support message:', error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const updateMessageStatus = async (id: string, status: SupportMessage['status']) => {
    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from('support_messages')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Refresh messages
      await fetchAllMessages();
      return data;
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchAllMessages();
  }, []);

  return {
    messages,
    loading,
    submitting,
    respondToMessage,
    updateMessageStatus,
    fetchAllMessages
  };
}
