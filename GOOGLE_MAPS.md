# Google Maps Places API Setup Guide

## Overview
SwiftRent now integrates with Google Maps Places API for enhanced address autocomplete functionality. This provides users with intelligent location suggestions while searching for properties.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to "APIs & Services" → "Library"
4. Search for "Places API" and enable it
5. Also enable "Maps JavaScript API" if you plan to add map features

## Step 2: Generate API Key

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the generated API key
4. Click on the key to configure it

## Step 3: Secure Your API Key

### Restrict by HTTP Referrers (Recommended for web apps)
```
https://yourdomain.com/*
https://www.yourdomain.com/*
https://localhost:3000/* (for development)
https://*.lovableproject.com/* (for Lovable preview)
```

### Restrict by API
- Places API
- Maps JavaScript API (if needed)

## Step 4: Configure in SwiftRent

### Development
1. Copy `.env.example` to `.env.local`
2. Add your API key:
```bash
GOOGLE_MAPS_API_KEY=your_api_key_here
```

### Production
Add the API key to your hosting environment variables:
- Vercel: Add to Environment Variables in project settings
- Netlify: Add to Environment Variables in site settings
- Other hosts: Follow their environment variable documentation

## Step 5: Update the API Key in Code

In `src/components/ui/enhanced-address-autocomplete.tsx`, replace the placeholder key:

```typescript
// Replace this line:
const apiKey = 'AIzaSyBGFQJi_ZnLyM-9LN4CNSUFYy1MwkGlwF0';

// With:
const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'your_fallback_key';
```

## Features Enabled

### Address Autocomplete
- Intelligent location suggestions
- South Africa region restriction
- City, suburb, and street-level suggestions
- Fallback to regular input if API fails

### Error Handling
- Graceful degradation if API is unavailable
- Loading states during API initialization
- User-friendly error messages

## API Usage & Billing

### Places API Pricing (as of 2024)
- Autocomplete (per session): $0.017
- Place Details: $0.017
- Monthly credit: $200 (covers ~11,700 sessions)

### Optimization Tips
1. **Session Tokens**: Implemented to reduce costs
2. **Region Restriction**: Limited to South Africa
3. **Field Restriction**: Only essential fields requested
4. **Fallback**: Graceful degradation to prevent broken UX

## Testing

### Verify Integration
1. Open SwiftRent homepage
2. Click in the location search field
3. Type "Cape Town" - you should see suggestions
4. Select a suggestion - the field should populate

### Fallback Testing
1. Temporarily disable your API key
2. Reload the page
3. Verify the location field still works as a regular input

## Troubleshooting

### Common Issues

**No suggestions appearing:**
- Check API key is correct
- Verify Places API is enabled
- Check browser console for errors
- Ensure domain is whitelisted

**API key error:**
- Verify the key in Google Cloud Console
- Check HTTP referrer restrictions
- Ensure Places API is enabled

**Loading issues:**
- Check network connectivity
- Verify HTTPS (required for geolocation)
- Clear browser cache

### Error Messages
```javascript
// Network error
"Failed to load Google Maps API"

// Invalid API key
"Google Maps API authentication failed"

// Quota exceeded
"Google Maps API quota exceeded"
```

## Security Best Practices

1. **Never expose API keys in client-side code for production**
2. **Use HTTP referrer restrictions**
3. **Monitor API usage regularly**
4. **Set up billing alerts**
5. **Rotate keys periodically**

## Future Enhancements

### Possible Additions
1. **Full Maps Integration**: Property location display
2. **Distance Calculations**: Commute time estimates
3. **Neighborhood Data**: Area insights and demographics
4. **Property Clustering**: Group nearby properties
5. **Street View**: Property exterior views

### Additional APIs to Consider
- **Maps JavaScript API**: For interactive maps
- **Distance Matrix API**: For commute calculations
- **Geocoding API**: For address validation
- **Street View Static API**: For property images

## Support

For Google Maps API issues:
- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
- [Google Maps Platform Support](https://developers.google.com/maps/support)

For SwiftRent integration issues:
- Check browser console for JavaScript errors
- Verify network requests in browser DevTools
- Test with different browsers and devices