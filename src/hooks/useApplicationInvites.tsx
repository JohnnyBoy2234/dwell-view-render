import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ApplicationInvite {
  id: string;
  token: string;
  property_id: string;
  landlord_id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  expires_at: string;
  used_at?: string | null;
}

export interface InviteWithDetails extends ApplicationInvite {
  property?: {
    id: string;
    title: string;
    location: string;
    images: string[] | null;
  } | null;
  landlord?: {
    user_id: string;
    display_name: string | null;
  } | null;
}

export const useApplicationInvites = () => {
  const { user } = useAuth();
  const [invites, setInvites] = useState<InviteWithDetails[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) fetchInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchInvites = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1) Load invites for this tenant
      const { data: invitesData, error: invitesError } = await supabase
        .from("application_invites")
        .select("*")
        .eq("tenant_id", user.id)
        .eq("status", "invited")
        .order("created_at", { ascending: false });

      if (invitesError) throw invitesError;
      const list = (invitesData || []) as ApplicationInvite[];

      if (list.length === 0) {
        setInvites([]);
        return;
      }

      const propertyIds = Array.from(new Set(list.map((i) => i.property_id)));
      const landlordIds = Array.from(new Set(list.map((i) => i.landlord_id)));

      // 2) Load properties
      const { data: propsData, error: propsError } = await supabase
        .from("properties")
        .select("id, title, location, images")
        .in("id", propertyIds);
      if (propsError) throw propsError;

      // 3) Load landlord profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", landlordIds);
      if (profilesError) throw profilesError;

      const propsById = new Map((propsData || []).map((p: any) => [p.id, p]));
      const profById = new Map((profilesData || []).map((p: any) => [p.user_id, p]));

      const enriched: InviteWithDetails[] = list.map((inv) => ({
        ...inv,
        property: propsById.get(inv.property_id) || null,
        landlord: profById.get(inv.landlord_id) || null,
      }));

      setInvites(enriched);
    } catch (e) {
      console.error("Failed to fetch application invites", e);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  };

  return { invites, loading, refresh: fetchInvites };
};
