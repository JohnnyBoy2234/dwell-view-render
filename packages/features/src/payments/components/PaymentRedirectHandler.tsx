import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PAYMENT_SUCCESS_PATH = '/payment-success';
const PAYMENT_FAILED_PATH = '/payment-failed';
const FAILURE_REASONS = new Set(['error', 'cancelled', 'payment_failed']);

/**
 * Handles provider callbacks that sometimes drop the intended route path and only preserve query params.
 * When we detect a CallPay reference on the wrong path we push the user to the correct confirmation screen
 * so the subscription activation logic can run without asking them to refresh manually.
 */
export function PaymentRedirectHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const reference = searchParams.get('reference');

    // Nothing to do if there's no payment reference in the URL
    if (!reference) {
      return;
    }

    const provider = searchParams.get('provider');
    const reason = (searchParams.get('reason') || '').toLowerCase();
    const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';

    const isOnSuccessPage = normalizedPath === PAYMENT_SUCCESS_PATH;
    const isOnFailedPage = normalizedPath === PAYMENT_FAILED_PATH;

    if (provider === 'callpay' && !isOnSuccessPage) {
      navigate(`${PAYMENT_SUCCESS_PATH}${location.search}`, { replace: true });
      return;
    }

    if (reason && FAILURE_REASONS.has(reason) && !isOnFailedPage) {
      navigate(`${PAYMENT_FAILED_PATH}${location.search}`, { replace: true });
    }
  }, [location, navigate]);

  return null;
}

