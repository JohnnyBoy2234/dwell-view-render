import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Messages from '@/pages/Messages';
import { TenantLayout } from '@/components/dashboard/TenantLayout';

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
    <TenantLayout title="Messages">
      <Messages />
    </TenantLayout>
  );
}
