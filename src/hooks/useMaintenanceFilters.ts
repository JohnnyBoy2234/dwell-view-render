import { useState, useMemo } from 'react';
import { SLA_HOURS } from '@/constants/maintenanceConstants';
import type { MaintenanceRequest } from '@/types/maintenance';

export interface MaintenanceFilters {
  selectedPriority: string | null;
  filteredTickets: MaintenanceRequest[];
  overdueTickets: MaintenanceRequest[];
  setSelectedPriority: (priority: string | null) => void;
  getTicketsByStatus: (status: MaintenanceRequest['status']) => MaintenanceRequest[];
}

export interface MaintenanceFiltersConfig {
  tickets: MaintenanceRequest[];
}

/**
 * Hook to manage maintenance board filtering and ticket categorization
 */
export function useMaintenanceFilters({ tickets }: MaintenanceFiltersConfig): MaintenanceFilters {
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);

  const filteredTickets = useMemo(() => {
    return selectedPriority 
      ? tickets.filter(ticket => ticket.priority === selectedPriority)
      : tickets;
  }, [tickets, selectedPriority]);

  const overdueTickets = useMemo(() => {
    const now = new Date();
    return filteredTickets.filter(ticket => {
      if (ticket.status === 'completed' || ticket.status === 'cancelled') return false;
      
      const createdAt = new Date(ticket.created_at);
      const slaHours = SLA_HOURS[ticket.priority as keyof typeof SLA_HOURS] || SLA_HOURS.low;
      const slaDeadline = new Date(createdAt.getTime() + (slaHours * 60 * 60 * 1000));
      
      return now > slaDeadline;
    });
  }, [filteredTickets]);

  const getTicketsByStatus = (status: MaintenanceRequest['status']) => {
    return filteredTickets.filter(ticket => ticket.status === status);
  };

  return {
    selectedPriority,
    filteredTickets,
    overdueTickets,
    setSelectedPriority,
    getTicketsByStatus,
  };
}