import TenantBadgeDisplay from '@/components/payments/TenantBadgeDisplay';
import { useTenantBadges } from '@/hooks/useTenantBadges';

interface ConversationUserDisplayProps {
  userId: string;
  userName: string;
  isLandlord: boolean;
}

export function ConversationUserDisplay({ userId, userName, isLandlord }: ConversationUserDisplayProps) {
  const { data } = useTenantBadges(isLandlord ? userId : undefined);

  return (
    <div className="flex items-center gap-2">
      <p className="font-semibold text-sm truncate">{userName}</p>
      {!isLandlord && data && (data.badges.length > 0 || data.currentYearStars > 0) && (
        <TenantBadgeDisplay
          badges={data.badges}
          currentYearStars={data.currentYearStars}
          size="sm"
          showTooltip={true}
        />
      )}
    </div>
  );
}
