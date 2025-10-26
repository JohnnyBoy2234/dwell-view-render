import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  defaultPath?: string;
  className?: string;
  variant?: 'ghost' | 'outline' | 'default' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function BackButton({ 
  defaultPath, 
  className = '', 
  variant = 'ghost',
  size = 'default'
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else if (defaultPath) {
      navigate(defaultPath);
    } else {
      navigate('/');
    }
  };

  return (
    <Button 
      variant={variant}
      size={size}
      onClick={handleBack}
      className={`flex items-center gap-2 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline">Back</span>
    </Button>
  );
}
