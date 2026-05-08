import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, Shield } from 'lucide-react';
import type { KycStatus } from '@/types/kyc';

interface KycStatusIndicatorProps {
  status: KycStatus;
  className?: string;
}

export function KycStatusIndicator({ status, className }: KycStatusIndicatorProps) {
  const getStatusDisplay = () => {
    switch (status) {
      case 'not_started':
        return {
          label: 'Not Started',
          variant: 'secondary' as const,
          icon: Shield
        };
      case 'submitted':
        return {
          label: 'In Review',
          variant: 'default' as const,
          icon: Clock
        };
      case 'approved':
        return {
          label: 'Verified',
          variant: 'default' as const,
          icon: CheckCircle
        };
      case 'declined':
        return {
          label: 'Declined',
          variant: 'destructive' as const,
          icon: XCircle
        };
      default:
        return {
          label: 'Unknown',
          variant: 'secondary' as const,
          icon: Shield
        };
    }
  };

  const { label, variant, icon: Icon } = getStatusDisplay();

  return (
    <Badge variant={variant} className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}