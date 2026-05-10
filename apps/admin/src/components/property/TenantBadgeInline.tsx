import { useTenantBadges } from '@/hooks/useTenantBadges';
import TenantBadgeDisplay from '@/components/payments/TenantBadgeDisplay';

interface TenantBadgeInlineProps {
  tenantId: string;
  tenantName: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function TenantBadgeInline({ tenantId, tenantName, size = 'sm' }: TenantBadgeInlineProps) {
  const { data } = useTenantBadges(tenantId);

  return (
    <div className="flex items-center gap-2">
      <span className="font-medium truncate">{tenantName}</span>
      {data && (data.badges.length > 0 || data.currentYearStars > 0) && (
        <TenantBadgeDisplay
          badges={data.badges}
          currentYearStars={data.currentYearStars}
          size={size}
          showTooltip={true}
        />
      )}
    </div>
  );
}
