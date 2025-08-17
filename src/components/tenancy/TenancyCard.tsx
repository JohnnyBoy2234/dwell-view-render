import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, User, MapPin, Edit, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface Tenancy {
  id: string;
  property_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number;
  status: string;
  lease_document_url?: string;
  notes?: string;
  property_title: string;
  tenant_name: string;
  tenant_email: string;
}

interface TenancyCardProps {
  tenancy: Tenancy;
  onEdit: (tenancy: Tenancy) => void;
  onViewLease?: (url: string) => void;
}

export function TenancyCard({ tenancy, onEdit, onViewLease }: TenancyCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'ended':
        return 'secondary';
      case 'terminated':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const isExpiringSoon = () => {
    const endDate = new Date(tenancy.end_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{tenancy.property_title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(tenancy.status)}>
              {tenancy.status}
            </Badge>
            {isExpiringSoon() && (
              <Badge variant="destructive">Expires Soon</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tenant Info */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{tenancy.tenant_name}</span>
          <span className="text-muted-foreground">({tenancy.tenant_email})</span>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Start: {format(new Date(tenancy.start_date), 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>End: {format(new Date(tenancy.end_date), 'MMM dd, yyyy')}</span>
          </div>
        </div>

        {/* Financial Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>Rent: R{tenancy.monthly_rent.toLocaleString()}/month</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>Deposit: R{tenancy.security_deposit.toLocaleString()}</span>
          </div>
        </div>

        {/* Notes */}
        {tenancy.notes && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">{tenancy.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(tenancy)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {tenancy.lease_document_url && onViewLease && (
            <Button variant="outline" size="sm" onClick={() => onViewLease(tenancy.lease_document_url!)}>
              <FileText className="h-4 w-4 mr-2" />
              View Lease
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}