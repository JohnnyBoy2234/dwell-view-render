import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Messages } from '@mzanzihomes/features/pages';
import { EnhancedDashboardLayout } from '@mzanzihomes/ui/components/dashboard/EnhancedDashboardLayout';

export default function TenantMessages() {
  const { user, isLandlord } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isLandlord) {
      navigate('/dashboard');
      return;
    }
  }, [user, isLandlord, navigate]);

  return (
    <EnhancedDashboardLayout title="Messages">
      <Messages />
    </EnhancedDashboardLayout>
  );
}
