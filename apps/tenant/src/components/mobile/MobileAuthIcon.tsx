import { User, Fingerprint, Smartphone } from 'lucide-react';
import { useMobile } from '@/hooks/useMobile';

/**
 * Component to render the appropriate authentication icon based on platform
 */
export function MobileAuthIcon() {
  const { isIOS, isAndroid } = useMobile();

  if (isIOS) return <User className="h-8 w-8" />;
  if (isAndroid) return <Fingerprint className="h-8 w-8" />;
  return <Smartphone className="h-8 w-8" />;
}