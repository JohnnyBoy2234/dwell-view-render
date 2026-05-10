import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function Applications() {
  const navigate = useNavigate();
  const { isLandlord } = useAuth();

  useEffect(() => {
    // Redirect to appropriate dashboard based on user role
    if (isLandlord) {
      navigate('/enhancedlandlorddashboard', { replace: true });
    } else {
      navigate('/enhancedtenantdashboard', { replace: true });
    }
  }, [isLandlord, navigate]);

  // Show nothing while redirecting
  return null;
}