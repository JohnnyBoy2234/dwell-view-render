# SwiftRent Real-Time Notification System

## Overview

A comprehensive real-time notification system for the SwiftRent dashboard that provides instant updates for landlords and tenants without page refreshes.

## Features

### ✅ Real-time Updates
- **WebSocket Integration**: Uses Supabase Realtime for instant notifications
- **Fallback Polling**: Automatically falls back to 30-second polling if WebSocket fails
- **Connection Status**: Monitors connection health and provides feedback

### ✅ Notification Panel
- **Bell Icon**: Prominent notification bell in dashboard header
- **Red Badge**: Shows unread notification count (99+ for large numbers)
- **Dropdown Panel**: Clean, organized notification list with newest first
- **Responsive Design**: Works on desktop and mobile devices

### ✅ Mark as Read/Unread
- **Click to Read**: Clicking a notification marks it as read
- **Context Menu**: Right-click or menu button for additional actions
- **Manual Toggle**: Users can manually mark notifications as unread
- **Bulk Actions**: "Mark all as read" functionality

### ✅ Persistence
- **Database Storage**: All read/unread states saved in Supabase
- **Reload Safe**: State persists across browser refreshes and sessions
- **User-Specific**: Each user sees only their own notifications

### ✅ SwiftRent Theme
- **Consistent Styling**: Matches the existing dashboard design
- **Color Coding**: Different colors for notification types and priorities
- **Glass Effects**: Backdrop blur and transparency effects
- **Smooth Animations**: Hover effects and transitions

## Database Schema

### Notifications Table
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('lease', 'maintenance', 'application', 'payment', 'viewing', 'system')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    action_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Row Level Security (RLS)
- Users can only view their own notifications
- Users can create, update, and delete their own notifications
- System can create notifications for any user (for cross-user events)

## Components

### 1. NotificationBell (`src/components/notifications/NotificationBell.tsx`)
- Main notification component with bell icon and badge
- Dropdown panel with notification list
- Context menu for individual notification actions
- Real-time updates and state management

### 2. useNotifications Hook (`src/hooks/useNotifications.tsx`)
- Manages notification state and real-time subscriptions
- Provides functions for CRUD operations
- Handles WebSocket connections and fallback polling
- Error handling and loading states

### 3. NotificationService (`src/services/notificationService.ts`)
- Service class for creating notifications
- Pre-built functions for common notification types
- Bulk notification creation support
- Type-safe notification creation

### 4. Notification Helpers (`src/utils/notificationHelpers.ts`)
- Helper functions for common notification scenarios
- Organized by notification type (lease, maintenance, etc.)
- Easy-to-use functions for developers

## Notification Types

### 📄 Lease Notifications
- Lease generated
- Lease ready for signature
- Lease signed
- Lease changes requested

### 🔧 Maintenance Notifications
- New maintenance request
- Maintenance status updates
- Emergency maintenance alerts

### 📋 Application Notifications
- New rental application
- Application status updates
- Application approved/rejected

### 💳 Payment Notifications
- Payment received
- Payment reminders
- Late payment alerts

### 👁️ Viewing Notifications
- New viewing request
- Viewing confirmed
- Viewing cancelled

### ⚙️ System Notifications
- Welcome messages
- System updates
- Feature announcements

## Usage Examples

### Creating a Notification
```typescript
import { NotificationService } from '@/services/notificationService';

// Simple notification
await NotificationService.createNotification({
  user_id: 'user-uuid',
  title: 'New Message',
  message: 'You have received a new message.',
  type: 'system',
  priority: 'normal'
});

// Lease notification with action URL
await NotificationService.createLeaseNotification(
  'user-uuid',
  'Lease Ready',
  'Your lease is ready for signature.',
  'high',
  '/dashboard/leases/123'
);
```

### Using Helper Functions
```typescript
import { createLeaseNotifications } from '@/utils/notificationHelpers';

// Notify both landlord and tenant about lease generation
await createLeaseNotifications.leaseGenerated(
  landlordId,
  tenantId,
  '123 Main Street',
  'lease-123'
);
```

### Testing Notifications
```typescript
import { NotificationTestPanel } from '@/components/notifications/NotificationTestPanel';

// Add to any dashboard page for testing
<NotificationTestPanel />
```

## Integration

### Dashboard Headers
The notification bell is automatically integrated into:
- `EnhancedDashboardLayout` - Main dashboard layout
- Both landlord and tenant dashboards
- Responsive design for mobile and desktop

### Real-time Updates
- Automatically subscribes to notification changes
- Updates UI instantly when new notifications arrive
- Handles connection failures gracefully
- Provides visual feedback for connection status

## Styling

### Color Scheme
- **Primary**: Ocean blue (`#2563EB`)
- **Success**: Success green (`#10B981`)
- **Warning**: Earth warm (`#F59E0B`)
- **Error**: Red (`#EF4444`)
- **Background**: White with transparency and backdrop blur

### Typography
- **Headers**: Bold, readable fonts
- **Body**: Clean, accessible text
- **Timestamps**: Muted, smaller text
- **Badges**: Compact, high-contrast

### Animations
- **Hover Effects**: Subtle color and scale changes
- **Transitions**: Smooth 200-300ms transitions
- **Loading States**: Spinner and skeleton states
- **Badge Updates**: Smooth count animations

## Error Handling

### Connection Issues
- Automatic fallback to polling
- Visual indicators for connection status
- Retry mechanisms for failed operations
- Graceful degradation

### Database Errors
- User-friendly error messages
- Retry options for failed operations
- Logging for debugging
- Fallback UI states

## Performance

### Optimization
- Efficient database queries with proper indexing
- Minimal re-renders with React optimization
- Lazy loading for large notification lists
- Debounced operations for bulk actions

### Scalability
- Pagination for large notification lists
- Efficient WebSocket subscriptions
- Optimized database queries
- Caching strategies

## Security

### Data Protection
- Row Level Security (RLS) policies
- User-specific data access
- Secure WebSocket connections
- Input validation and sanitization

### Privacy
- No cross-user data leakage
- Secure notification creation
- Proper authentication checks
- Audit logging capabilities

## Testing

### Test Panel
- Development test panel for creating sample notifications
- All notification types covered
- Easy testing of real-time updates
- Visual feedback for test results

### Manual Testing
1. Run the SQL script to create the notifications table
2. Add the NotificationTestPanel to any dashboard page
3. Create test notifications using the panel
4. Verify real-time updates in the bell dropdown
5. Test read/unread functionality
6. Test connection fallback by disabling network

## Deployment

### Database Setup
1. Run `create_notifications_table.sql` in Supabase SQL Editor
2. Verify RLS policies are active
3. Test notification creation and retrieval

### Code Deployment
1. Deploy the new components and hooks
2. Update dashboard layouts to include NotificationBell
3. Test real-time functionality
4. Monitor WebSocket connections

## Future Enhancements

### Planned Features
- **Email Notifications**: Send email copies of important notifications
- **Push Notifications**: Browser push notifications for urgent items
- **Notification Preferences**: User-configurable notification settings
- **Rich Notifications**: Images and rich content in notifications
- **Notification History**: Archive and search old notifications
- **Bulk Operations**: Select and manage multiple notifications
- **Notification Templates**: Customizable notification templates
- **Analytics**: Notification engagement and effectiveness metrics

### Technical Improvements
- **Offline Support**: Queue notifications when offline
- **Performance Monitoring**: Track notification delivery times
- **A/B Testing**: Test different notification formats
- **Machine Learning**: Smart notification prioritization
- **Multi-language**: Internationalization support

## Troubleshooting

### Common Issues

#### Notifications Not Appearing
- Check WebSocket connection status
- Verify RLS policies are correct
- Check browser console for errors
- Ensure user is properly authenticated

#### Real-time Updates Not Working
- Check Supabase Realtime is enabled
- Verify subscription is active
- Check network connectivity
- Look for WebSocket errors in console

#### Performance Issues
- Check database query performance
- Monitor WebSocket connection count
- Review notification list size
- Check for memory leaks in components

### Debug Mode
Enable debug logging by setting:
```typescript
localStorage.setItem('debug', 'notifications');
```

This will log all notification-related events to the console.

## Support

For issues or questions about the notification system:
1. Check the troubleshooting section
2. Review the browser console for errors
3. Test with the NotificationTestPanel
4. Verify database permissions and RLS policies
5. Check Supabase Realtime status

The notification system is designed to be robust, user-friendly, and maintainable. It provides a solid foundation for real-time communication within the SwiftRent platform.
