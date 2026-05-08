/**
 * Constants for maintenance board functionality
 */

import { Clock, AlertTriangle } from 'lucide-react';
import type { MaintenanceRequest } from '../types/maintenance';

// Status column configuration
export const MAINTENANCE_STATUS_COLUMNS = [
  { 
    status: 'submitted' as const, 
    title: 'New Requests', 
    color: 'bg-blue-100 border-blue-200',
    icon: Clock
  },
  { 
    status: 'in_progress' as const, 
    title: 'In Progress', 
    color: 'bg-yellow-100 border-yellow-200',
    icon: AlertTriangle
  },
  { 
    status: 'completed' as const, 
    title: 'Completed', 
    color: 'bg-green-100 border-green-200',
    icon: Clock
  },
  { 
    status: 'cancelled' as const, 
    title: 'Cancelled', 
    color: 'bg-gray-100 border-gray-200',
    icon: Clock
  }
] as const;

// Priority options
export const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
] as const;

// SLA (Service Level Agreement) hours by priority
export const SLA_HOURS = {
  urgent: 8,
  high: 8,
  medium: 48,
  low: 120
} as const;

// Maintenance board labels
export const MAINTENANCE_LABELS = {
  TITLE: 'Maintenance Board',
  SUBTITLE: 'Track and manage all maintenance requests',
  NEW_REQUEST: 'New Request',
  TOTAL_TICKETS: 'Total Tickets',
  IN_PROGRESS: 'In Progress',
  OVERDUE: 'Overdue',
  COMPLETED: 'Completed',
  OVERDUE_TICKETS: 'Overdue Tickets',
  NO_TICKETS: 'No tickets',
  NO_MAINTENANCE_REQUESTS: 'No maintenance requests',
  NO_REQUESTS_DESCRIPTION: 'When maintenance issues arise, they\'ll appear here for tracking and resolution.',
  CREATE_FIRST_REQUEST: 'Create First Request',
  LOADING_MESSAGE: 'Loading maintenance tickets...',
  ERROR_LOADING: 'Error loading tickets',
  MORE_OVERDUE: (count: number) => `+${count} more overdue tickets`,
  CREATED_DATE: (date: string) => `Created ${new Date(date).toLocaleDateString()}`,
} as const;

// ARIA labels
export const MAINTENANCE_ARIA_LABELS = {
  PRIORITY_FILTER: 'Filter tickets by priority',
  CREATE_BUTTON: 'Create new maintenance request',
  STATS_CARD: 'Maintenance statistics',
  OVERDUE_ALERT: 'Overdue tickets alert',
} as const;