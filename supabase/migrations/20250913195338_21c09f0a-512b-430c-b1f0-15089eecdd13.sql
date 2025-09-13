-- Create helper function to insert lease agreements
CREATE OR REPLACE FUNCTION public.insert_lease_agreement(
  p_property_id UUID,
  p_landlord_id UUID,
  p_tenant_id UUID DEFAULT NULL,
  p_lease_data JSONB DEFAULT '{}'::jsonb,
  p_pdf_url TEXT DEFAULT NULL,
  p_pdf_path TEXT DEFAULT NULL,
  p_html_content TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  property_id UUID,
  landlord_id UUID,
  tenant_id UUID,
  status TEXT,
  lease_data JSONB,
  pdf_url TEXT,
  pdf_path TEXT,
  html_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_lease_id UUID;
BEGIN
  INSERT INTO public.lease_agreements (
    property_id,
    landlord_id,
    tenant_id,
    lease_data,
    pdf_url,
    pdf_path,
    html_content,
    status
  ) VALUES (
    p_property_id,
    p_landlord_id,
    p_tenant_id,
    p_lease_data,
    p_pdf_url,
    p_pdf_path,
    p_html_content,
    'draft'
  )
  RETURNING lease_agreements.id INTO new_lease_id;
  
  RETURN QUERY
  SELECT 
    la.id,
    la.property_id,
    la.landlord_id,
    la.tenant_id,
    la.status,
    la.lease_data,
    la.pdf_url,
    la.pdf_path,
    la.html_content,
    la.created_at,
    la.updated_at
  FROM public.lease_agreements la
  WHERE la.id = new_lease_id;
END;
$$;