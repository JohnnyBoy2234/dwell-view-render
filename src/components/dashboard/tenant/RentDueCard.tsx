import React from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface RentDueCardProps {
  rentDue: {
    amount: number;
    dueDate: string;
    status: 'paid' | 'pending' | 'overdue';
    tenancyId: string;
  } | null;
  onMakePayment: () => void;
}

export function RentDueCard({ rentDue, onMakePayment }: RentDueCardProps) {
  const getStatusIcon = () => {
    if (!rentDue) return <Calendar className="h-5 w-5 text-muted-foreground" />;
    
    switch (rentDue.status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-success-green" />;
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-earth-warm" />;
    }
  };

  const getStatusBadgeVariant = () => {
    if (!rentDue) return 'secondary';
    
    switch (rentDue.status) {
      case 'paid':
        return 'default';
      case 'overdue':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = () => {
    if (!rentDue) return 'No payment due';
    
    switch (rentDue.status) {
      case 'paid':
        return 'Paid';
      case 'overdue':
        return 'Overdue';
      default:
        return 'Due';
    }
  };

  return (
    <Card className="hover-scale cursor-pointer shadow-medium border-ocean-blue/20 bg-gradient-to-br from-white to-earth-light/20 animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getStatusIcon()}
          Rent Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rentDue ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Amount Due:</span>
              <span className="text-xl font-bold text-ocean-blue">
                R{rentDue.amount.toLocaleString()}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Due Date:</span>
              <span className="font-medium">
                {format(new Date(rentDue.dueDate), 'MMM dd, yyyy')}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={getStatusBadgeVariant()}>
                {getStatusText()}
              </Badge>
            </div>
            
            {rentDue.status !== 'paid' && (
              <Button 
                onClick={onMakePayment}
                className="w-full bg-gradient-to-r from-ocean-blue to-ocean-blue-dark hover:from-ocean-blue-dark hover:to-ocean-blue text-white shadow-soft transition-all duration-300"
              >
                Make Payment
              </Button>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-success-green mx-auto mb-3" />
            <p className="text-muted-foreground">No outstanding rent payments</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}