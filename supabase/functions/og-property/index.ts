import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Social media crawler User-Agents
const CRAWLER_USER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'WhatsApp',
  'LinkedInBot',
  'Pinterest',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'vkShare',
  'Viber',
];

serve(async (req) => {
  const url = new URL(req.url);
  const userAgent = req.headers.get('user-agent') || '';
  
  // Extract property ID from the path: /og-property/property/{id}
  const pathMatch = url.pathname.match(/\/og-property\/property\/([a-zA-Z0-9-]+)/);
  
  if (!pathMatch) {
    return new Response('Property ID required', { status: 400 });
  }
  
  const propertyId = pathMatch[1];
  
  // Check if this is a social media crawler
  const isCrawler = CRAWLER_USER_AGENTS.some(agent => 
    userAgent.toLowerCase().includes(agent.toLowerCase())
  );
  
  if (!isCrawler) {
    // Redirect normal users to the actual page
    const redirectUrl = `https://rentlekker.com/property/${propertyId}`;
    return Response.redirect(redirectUrl, 302);
  }
  
  // Fetch property data for crawlers
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: property, error } = await supabase
    .from('properties')
    .select(`
      id,
      title,
      description,
      location,
      price,
      bedrooms,
      bathrooms,
      property_type,
      images
    `)
    .eq('id', propertyId)
    .single();
  
  if (error || !property) {
    console.error('Property not found:', error);
    return new Response('Property not found', { status: 404 });
  }
  
  // Get the first property image or fallback to logo
  const propertyImage = property.images && property.images.length > 0 
    ? property.images[0] 
    : 'https://rentlekker.com/apple-touch-icon.png';
  
  // Make sure image URL is absolute
  const absoluteImageUrl = propertyImage.startsWith('http') 
    ? propertyImage 
    : `${supabaseUrl}/storage/v1/object/public/property-images/${propertyImage}`;
  
  // Format price
  const formattedPrice = new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
  }).format(property.price);
  
  // Create description
  const ogDescription = `${property.bedrooms} bed, ${property.bathrooms} bath ${property.property_type} in ${property.location} for ${formattedPrice}/month. ${property.description?.slice(0, 100) || ''}`;
  
  // Return HTML with Open Graph meta tags
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${property.title} - RentLekker</title>
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://rentlekker.com/property/${property.id}" />
  <meta property="og:title" content="${property.title} - ${formattedPrice}/month" />
  <meta property="og:description" content="${ogDescription}" />
  <meta property="og:image" content="${absoluteImageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="RentLekker" />
  <meta property="og:locale" content="en_ZA" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="https://rentlekker.com/property/${property.id}" />
  <meta name="twitter:title" content="${property.title} - ${formattedPrice}/month" />
  <meta name="twitter:description" content="${ogDescription}" />
  <meta name="twitter:image" content="${absoluteImageUrl}" />
  
  <!-- Redirect for browsers that somehow reach this -->
  <meta http-equiv="refresh" content="0;url=https://rentlekker.com/property/${property.id}" />
</head>
<body>
  <p>Redirecting to <a href="https://rentlekker.com/property/${property.id}">${property.title}</a>...</p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});
