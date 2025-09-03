import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const DocuSignRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Extract the authorization code and state from URL parameters
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('DocuSign authorization error:', error);
      navigate('/enhancedtenantdashboard?error=' + encodeURIComponent(error));
      return;
    }

    if (code && state) {
      // Redirect to our callback page with the parameters
      const callbackUrl = `/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
      navigate(callbackUrl);
    } else {
      // No code or state, redirect to dashboard
      navigate('/enhancedtenantdashboard');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing DocuSign authorization...</p>
      </div>
    </div>
  );
};

export default DocuSignRedirect;
