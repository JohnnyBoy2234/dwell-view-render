import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Messages } from '@mzanzihomes/features/pages';

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

  // Messages ships its own full-screen header — wrapping it in the
  // dashboard layout would render the "Messages" title twice
  return <Messages />;
}
