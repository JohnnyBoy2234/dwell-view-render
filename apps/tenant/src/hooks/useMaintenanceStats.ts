import { useMemo } from 'react';
import { SLA_HOURS } from '@/constants/maintenanceConstants';
import type { MaintenanceRequest } from '@/types/maintenance';

export interface MaintenanceStats {
  totalTickets: number;
  inProgressTickets: number;
  overdueTickets: number;
  completedTickets: number;
}

export interface MaintenanceStatsConfig {
  tickets: MaintenanceRequest[];
}

/**
 * Hook to calculate maintenance board statistics
 */
export function useMaintenanceStats({ tickets }: MaintenanceStatsConfig): MaintenanceStats {
  return useMemo(() => {
    const now = new Date();
    
    const inProgressTickets = tickets.filter(ticket => ticket.status === 'in_progress').length;
    const completedTickets = tickets.filter(ticket => ticket.status === 'completed').length;
    
    const overdueTickets = tickets.filter(ticket => {
      if (ticket.status === 'completed' || ticket.status === 'cancelled') return false;
      
      const createdAt = new Date(ticket.created_at);
      const slaHours = SLA_HOURS[ticket.priority as keyof typeof SLA_HOURS] || SLA_HOURS.low;
      const slaDeadline = new Date(createdAt.getTime() + (slaHours * 60 * 60 * 1000));
      
      return now > slaDeadline;
    }).length;

    return {
      totalTickets: tickets.length,
      inProgressTickets,
      overdueTickets,
      completedTickets,
    };
  }, [tickets]);
}