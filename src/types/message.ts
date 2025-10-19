/**
 * Type definitions for message-related components
 */

export interface MessageProfile {
  display_name: string;
}

export interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_by_landlord?: boolean;
  read_by_tenant?: boolean;
  optimistic?: boolean;
  profiles?: MessageProfile | null;
  message_type?: string | null;
  attachment_url?: string | null;
  viewing_proposal_id?: string | null;
}

export interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  isLandlord?: boolean;
  showTime?: boolean;
}

export type MessageRole = 'landlord' | 'tenant';

export interface PreScreeningData {
  moveInDate: Date;
  monthlyIncome: number;
  rentalHistory: 'clean' | 'late' | 'evicted' | 'first';
  message: string;
}

export const formatPreScreeningMessage = (data: PreScreeningData, propertyTitle: string): string => {
  const moveInDate = new Date(data.moveInDate).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const formattedIncome = `R${data.monthlyIncome.toLocaleString()}`;
  
  const rentalHistoryText = {
    clean: 'No, I have a clean rental history',
    late: 'Yes, I have been late on rent before',
    evicted: 'Yes, I have been evicted before',
    first: 'This is my first rental',
  }[data.rentalHistory];
  
  return `${data.message}

📋 **Pre-Screening Information:**

📅 **Desired Move-in Date:** ${moveInDate}
💰 **Monthly Income:** ${formattedIncome}
🏠 **Rental History:** ${rentalHistoryText}

Looking forward to hearing from you!`;
};