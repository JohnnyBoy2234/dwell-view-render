import React, { useState } from 'react';
import { useMaintenanceTickets } from '@/hooks/useMaintenanceTickets';
import { useMaintenanceStats } from '@/hooks/useMaintenanceStats';
import { useMaintenanceFilters } from '@/hooks/useMaintenanceFilters';
import { MaintenanceTicketCard } from './MaintenanceTicketCard';
import { CreateMaintenanceTicket } from './CreateMaintenanceTicket';
import { BoardHeader } from './BoardHeader';
import { BoardStats } from './BoardStats';
import { OverdueAlert } from './OverdueAlert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { MAINTENANCE_STATUS_COLUMNS, MAINTENANCE_LABELS } from '@/constants/maintenanceConstants';
import type { MaintenanceRequest } from '@/types/maintenance';

interface MaintenanceBoardProps {
  propertyId?: string;
  showCreateButton?: boolean;
}

/**
 * Maintenance board component for tracking and managing maintenance requests
 * Features Kanban-style organization with filtering and statistics
 */
export function MaintenanceBoard({ propertyId, showCreateButton = true }: MaintenanceBoardProps) {
  const { tickets, loading, error } = useMaintenanceTickets(propertyId);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Custom hooks for business logic
  const stats = useMaintenanceStats({ tickets });
  const {
    selectedPriority,
    filteredTickets,
    overdueTickets,
    setSelectedPriority,
    getTicketsByStatus,
  } = useMaintenanceFilters({ tickets });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">{MAINTENANCE_LABELS.LOADING_MESSAGE}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive font-medium">{MAINTENANCE_LABELS.ERROR_LOADING}</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (showCreateForm) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <CreateMaintenanceTicket
          propertyId={propertyId!}
          onTicketCreated={() => setShowCreateForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg">
      <BoardHeader
        selectedPriority={selectedPriority}
        onPriorityChange={setSelectedPriority}
        onCreateClick={() => setShowCreateForm(true)}
        showCreateButton={showCreateButton}
      />

      <BoardStats stats={stats} />

      <OverdueAlert overdueTickets={overdueTickets} />

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {MAINTENANCE_STATUS_COLUMNS.map(column => {
          const columnTickets = getTicketsByStatus(column.status);
          const Icon = column.icon;
          
          return (
            <div key={column.status} className="space-y-4">
              <Card className={`${column.color} border-2 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {column.title}
                    </div>
                    <Badge variant="secondary">{columnTickets.length}</Badge>
                  </CardTitle>
                </CardHeader>
              </Card>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {columnTickets.length === 0 ? (
                  <Card className="border-dashed transform transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <div className="text-sm">{MAINTENANCE_LABELS.NO_TICKETS}</div>
                    </CardContent>
                  </Card>
                ) : (
                  columnTickets.map(ticket => (
                    <MaintenanceTicketCard
                      key={ticket.id}
                      ticket={ticket}
                      showActions={true}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {tickets.length === 0 && (
        <Card className="max-w-md mx-auto transform transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">🔧</div>
            <h3 className="font-semibold mb-2">{MAINTENANCE_LABELS.NO_MAINTENANCE_REQUESTS}</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {MAINTENANCE_LABELS.NO_REQUESTS_DESCRIPTION}
            </p>
            {showCreateButton && (
              <Button onClick={() => setShowCreateForm(true)}>
                {MAINTENANCE_LABELS.CREATE_FIRST_REQUEST}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}