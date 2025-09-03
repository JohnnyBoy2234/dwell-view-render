import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const DocuSignCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authorization...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if we're on the root domain and have URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code') || searchParams.get('code');
        const state = urlParams.get('state') || searchParams.get('state');
        const error = urlParams.get('error') || searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`Authorization failed: ${error}`);
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('Missing authorization code or state');
          return;
        }

        // Exchange authorization code for access token
        const { data, error: tokenError } = await supabase.functions.invoke('docusign-oauth-callback', {
          body: { code, state }
        });

        if (tokenError) {
          throw tokenError;
        }

        const accessToken = (data as any)?.access_token;
        if (!accessToken) {
          throw new Error('No access token received');
        }

        // Parse the state to get tenancy info
        const stateData = JSON.parse(atob(state));
        const { tenancyId, role } = stateData;

        // Now get the signing URL using the access token
        const { data: signingData, error: signingError } = await supabase.functions.invoke('get-docusign-recipient-view-oauth', {
          body: { 
            tenancyId, 
            role, 
            accessToken,
            returnUrl: window.location.origin + '/enhancedtenantdashboard'
          }
        });

        if (signingError) {
          throw signingError;
        }

        const signingUrl = (signingData as any)?.signingUrl;
        if (!signingUrl) {
          throw new Error('No signing URL received');
        }

        // Redirect to DocuSign signing
        window.location.href = signingUrl;

      } catch (error: any) {
        console.error('Callback error:', error);
        setStatus('error');
        setMessage(error.message || 'An error occurred during authorization');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  const handleRetry = () => {
    navigate('/enhancedtenantdashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
            DocuSign Authorization
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-4">{message}</p>
          
          {status === 'loading' && (
            <p className="text-sm text-gray-500">
              Please wait while we process your authorization...
            </p>
          )}
          
          {status === 'error' && (
            <Button onClick={handleRetry} className="w-full">
              Return to Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocuSignCallback;
