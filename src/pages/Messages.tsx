import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

export default function Messages() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard messages
    navigate('/dashboard');
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="text-center space-y-4">
        <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground">Redirecting to messages...</p>
        <Button onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
