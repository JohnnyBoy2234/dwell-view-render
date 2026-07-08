// @ts-nocheck
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@mzanzihomes/supabase/client';

// Continuing an unlisted draft (e.g. via the "Publish" button) passes
// ?propertyId=... so the wizard can load and finish that existing row
// instead of starting blank and inserting a duplicate.
export function useExistingProperty() {
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('propertyId');
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(!!propertyId);

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('Failed to load existing property', error);
        } else {
          setProperty(data);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  return { propertyId, property, loading };
}
