import { MiniNavbar } from '@/components/ui/mini-navbar';
import { PrivacyPolicyContent } from '@mzanzihomes/ui/components/pages/legal/PrivacyPolicyContent';

export default function PrivacyPolicy() {
  return (
    <>
      <MiniNavbar />
      <div className="pt-28 sm:pt-24 min-h-screen bg-gray-50">
        <PrivacyPolicyContent />
      </div>
    </>
  );
}
