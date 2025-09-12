import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMaintenanceTickets } from '@/hooks/useMaintenanceTickets';
import { MaintenanceTicketCard } from './MaintenanceTicketCard';
import { CreateMaintenanceTicket } from './CreateMaintenanceTicket';
import { Plus, Filter, Clock, AlertTriangle } from 'lucide-react';
import type { MaintenanceRequest } from '@/types/maintenance';

interface MaintenanceBoardProps {
  propertyId?: string;
  showCreateButton?: boolean;
}

export function MaintenanceBoard({ propertyId, showCreateButton = true }: MaintenanceBoardProps) {
  const { tickets, loading, error } = useMaintenanceTickets(propertyId);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);

  const statusColumns = [
    { 
      status: 'submitted' as const, 
      title: 'New Requests', 
      color: 'bg-blue-100 border-blue-200',
      icon: <Clock className="h-4 w-4" />
    },
    { 
      status: 'in_progress' as const, 
      title: 'In Progress', 
      color: 'bg-yellow-100 border-yellow-200',
      icon: <AlertTriangle className="h-4 w-4" />
    },
    { 
      status: 'completed' as const, 
      title: 'Completed', 
      color: 'bg-green-100 border-green-200',
      icon: <Clock className="h-4 w-4" />
    },
    { 
      status: 'cancelled' as const, 
      title: 'Cancelled', 
      color: 'bg-gray-100 border-gray-200',
      icon: <Clock className="h-4 w-4" />
    }
  ];

  const filteredTickets = selectedPriority 
    ? tickets.filter(ticket => ticket.priority === selectedPriority)
    : tickets;

  const getTicketsByStatus = (status: MaintenanceRequest['status']) => {
    return filteredTickets.filter(ticket => ticket.status === status);
  };

  const getOverdueTickets = () => {
    const now = new Date();
    return filteredTickets.filter(ticket => {
      if (ticket.status === 'completed' || ticket.status === 'cancelled') return false;
      
      const createdAt = new Date(ticket.created_at);
      const slaHours = ticket.priority === 'high' || ticket.priority === 'emergency' ? 8 :
                     ticket.priority === 'medium' ? 48 : 120;
      const slaDeadline = new Date(createdAt.getTime() + (slaHours * 60 * 60 * 1000));
      
      return now > slaDeadline;
    });
  };

  const overdueTickets = getOverdueTickets();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading maintenance tickets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive font-medium">Error loading tickets</p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Maintenance Board</h2>
          <p className="text-muted-foreground">
            Track and manage all maintenance requests
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <select
              value={selectedPriority || ''}
              onChange={(e) => setSelectedPriority(e.target.value || null)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="">All Priorities</option>
              <option value="emergency">Emergency</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {showCreateButton && (
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Request
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{tickets.length}</div>
            <div className="text-sm text-muted-foreground">Total Tickets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {getTicketsByStatus('in_progress').length}
            </div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{overdueTickets.length}</div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {getTicketsByStatus('completed').length}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alerts */}
      {overdueTickets.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Overdue Tickets ({overdueTickets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueTickets.slice(0, 3).map(ticket => (
                <div key={ticket.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <span className="font-medium">{ticket.title}</span>
                    <Badge variant="destructive" className="ml-2">{ticket.priority}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Created {new Date(ticket.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {overdueTickets.length > 3 && (
                <p className="text-sm text-muted-foreground">
                  +{overdueTickets.length - 3} more overdue tickets
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statusColumns.map(column => {
          const columnTickets = getTicketsByStatus(column.status);
          
          return (
            <div key={column.status} className="space-y-4">
              <Card className={`${column.color} border-2`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {column.icon}
                      {column.title}
                    </div>
                    <Badge variant="secondary">{columnTickets.length}</Badge>
                  </CardTitle>
                </CardHeader>
              </Card>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {columnTickets.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <div className="text-sm">No tickets</div>
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
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">🔧</div>
            <h3 className="font-semibold mb-2">No maintenance requests</h3>
            <p className="text-muted-foreground text-sm mb-4">
              When maintenance issues arise, they'll appear here for tracking and resolution.
            </p>
            {showCreateButton && (
              <Button onClick={() => setShowCreateForm(true)}>
                Create First Request
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}