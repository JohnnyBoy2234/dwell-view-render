import { MiniNavbar } from '@/components/ui/mini-navbar';
import { TermsOfServiceContent } from '@mzanzihomes/ui/components/pages/legal/TermsOfServiceContent';

export default function TermsOfService() {
  return (
    <>
      <MiniNavbar />
      <div className="pt-28 sm:pt-24 min-h-screen bg-gray-50">
        <TermsOfServiceContent />
      </div>
    </>
  );
}
