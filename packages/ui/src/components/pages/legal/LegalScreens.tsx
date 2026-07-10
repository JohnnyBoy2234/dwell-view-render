import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PrivacyPolicyContent } from './PrivacyPolicyContent';
import { TermsOfServiceContent } from './TermsOfServiceContent';

// In-app legal pages for the tenant and landlord apps (the public web app wraps
// the same content components with its marketing navbar instead).
function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ minHeight: '100dvh' }}>
      <header
        className="h-14 flex items-center gap-3 px-3 sm:px-4 border-b border-white/10 sticky z-40 backdrop-blur-md"
        style={{
          // Sits below the tenant rent-due banner when it's visible (var is 0px otherwise)
          top: 'var(--rent-banner-h, 0px)',
          background: 'rgba(10,10,20,0.78)',
        }}
      >
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/15 transition-colors text-gray-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-base font-bold text-white truncate">{title}</h1>
      </header>
      {children}
    </div>
  );
}

export function PrivacyPolicyScreen() {
  return (
    <LegalShell title="Privacy Policy">
      <PrivacyPolicyContent />
    </LegalShell>
  );
}

export function TermsOfServiceScreen() {
  return (
    <LegalShell title="Terms & Conditions">
      <TermsOfServiceContent />
    </LegalShell>
  );
}
