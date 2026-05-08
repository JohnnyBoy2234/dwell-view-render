// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Custom hook to fetch all properties belonging to a landlord.
 *
 * @param {string | undefined} landlordId - The unique ID of the landlord whose properties are being fetched.
 * @returns {{
 *   properties: any[];
 *   loading: boolean;
 *   error: string | null;
 * }} An object containing:
 * - `properties`: an array of property records
 * - `loading`: whether the properties are still being fetched
 * - `error`: an error message if fetching failed
 *
 * @example
 * ```tsx
 * const { properties, loading, error } = useProperties(user?.id);
 *
 * if (loading) return <Spinner />;
 * if (error) return <ErrorMessage text={error} />;
 *
 * return <PropertyList properties={properties} />;
 * ```
 */

export function useProperties(landlordId?: string) {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!landlordId) return;
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("properties")
          .select("*")
          .eq("landlord_id", landlordId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setProperties(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [landlordId]);

  return { properties, loading, error };
}
