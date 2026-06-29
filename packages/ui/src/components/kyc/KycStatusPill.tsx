import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, FileX } from 'lucide-react';
import type { KycStatus } from '@mzanzihomes/common/types/kyc';

interface KycStatusPillProps {
  status: KycStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function KycStatusPill({ status, size = 'md' }: KycStatusPillProps) {
  const getStatusConfig = (status: KycStatus) => {
    switch (status) {
      case 'not_started':
        return {
          label: 'Not Started',
          variant: 'secondary' as const,
          icon: FileX,
          className: 'bg-secondary text-secondary-foreground'
        };
      case 'submitted':
        return {
          label: 'In Review',
          variant: 'default' as const,
          icon: Clock,
          className: 'bg-primary text-primary-foreground'
        };
      case 'approved':
        return {
          label: 'Approved',
          variant: 'default' as const,
          icon: CheckCircle,
          className: 'bg-success text-success-foreground'
        };
      case 'declined':
        return {
          label: 'Declined',
          variant: 'destructive' as const,
          icon: XCircle,
          className: 'bg-destructive text-destructive-foreground'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`${config.className} gap-1 ${
      size === 'sm' ? 'text-xs px-2 py-0.5' : 
      size === 'lg' ? 'text-sm px-3 py-1' : 
      'text-xs px-2 py-1'
    }`}>
      <Icon className={`${
        size === 'sm' ? 'h-3 w-3' : 
        size === 'lg' ? 'h-4 w-4' : 
        'h-3 w-3'
      }`} />
      {config.label}
    </Badge>
  );
}