# UT Marketplace - Notification System Setup

## Overview
This notification system automatically sends real-time notifications to users when:
- Someone adds their listing to favorites ❤️
- Someone adds their listing to watchlist 👀
- Someone messages them 💬
- Someone rates/reviews them ⭐

## Setup Instructions

### 1. Database Setup
Run the SQL file to set up the database triggers and functions:

```sql
-- Execute this SQL in your Supabase SQL editor:
-- File: supabase_notification_system.sql
```

This will create:
- `notifications` table (if not exists)
- Database triggers for automatic notification creation
- Helper functions for notification management
- Row Level Security policies

### 2. Features Implemented

#### ✅ Automatic Database Triggers
- **Favorites/Watchlist**: Triggers on `user_favorites` table INSERT
- **Messages**: Triggers on `messages` table INSERT  
- **Ratings**: Triggers on `ratings` table INSERT

#### ✅ UI Integration
- **Tab Bar**: Shows notification badges on Messages and Profile tabs
- **Profile Screen**: Notification bell button with unread count
- **Notification Screen**: Complete notification management UI
- **Real-time Updates**: Live subscription to new notifications

#### ✅ Notification Service
- `NotificationService` class for manual notification creation
- `useNotifications` hook for React components
- `useNotificationCount` hook for lightweight badge counts

## How It Works

### Automatic Notifications

1. **User adds listing to favorites** → Database trigger → Notification sent to listing owner
2. **User sends message** → Database trigger → Notification sent to message recipient  
3. **User rates seller** → Database trigger → Notification sent to rated user

### Manual Notifications (if needed)

```typescript
import { NotificationService } from '~/lib/notifications';

// Send custom notification
await NotificationService.create({
  user_id: 'recipient@email.com',
  actor_id: 'sender@email.com',
  type: 'favorite',
  title: '❤️ Someone liked your listing!',
  message: 'John added "iPhone 15" to their favorites',
  data: { listing_title: 'iPhone 15', listing_price: 800 },
  listing_id: 123
});
```

## Testing the System

### 1. Test Favorites/Watchlist Notifications
1. Sign in as User A
2. Create a listing  
3. Sign in as User B
4. Add User A's listing to favorites
5. Check User A's notifications

### 2. Test Message Notifications
1. Sign in as User A
2. Sign in as User B (different device/browser)
3. User B sends message to User A
4. Check User A's notifications

### 3. Test Rating Notifications
1. Sign in as User A
2. Sign in as User B
3. User B rates User A
4. Check User A's notifications

## Notification Types

- `favorite` - Someone favorited your listing
- `watchlist` - Someone added your listing to watchlist  
- `message` - Someone sent you a message
- `rating` - Someone rated you
- `listing_sold` - Your listing was marked as sold
- `listing_inquiry` - Someone inquired about your listing

## Real-time Updates

The system uses Supabase real-time subscriptions to instantly update:
- Notification badges in tab bar
- Notification count in profile screen
- Notification list when new notifications arrive

## Database Schema

### notifications table
```sql
- id (UUID, Primary Key)
- user_id (TEXT, recipient)
- actor_id (TEXT, who triggered the notification)  
- type (TEXT, notification type)
- title (TEXT, notification title)
- message (TEXT, notification message)
- data (JSONB, additional data)
- is_read (BOOLEAN, read status)
- created_at (TIMESTAMP)
- listing_id (INTEGER, optional reference)
```

## Customization

### Adding New Notification Types

1. Update the notification type enum in `types/notifications.ts`
2. Create a new trigger function in SQL
3. Add helper method to `NotificationService`
4. Update UI icons in notification screen

### Styling Notification Badges

Modify `NotificationBadge.tsx` for custom badge styling:
- Colors, sizes, positioning
- Animation effects
- Custom count formatting

## Troubleshooting

### Notifications Not Appearing
1. Check database triggers are installed correctly
2. Verify Row Level Security policies
3. Check real-time subscriptions are active
4. Ensure user is signed in properly

### Performance Considerations
- Old notifications cleanup function available
- Pagination implemented in notification list
- Optimized queries with proper indexing
- Real-time subscriptions are scoped per user

## Next Steps

Potential enhancements:
- Push notifications (mobile)
- Email notifications  
- Notification preferences/settings
- Bulk notification management
- Notification analytics

---

## Quick Start Checklist

- [ ] Execute `supabase_notification_system.sql` in Supabase
- [ ] Test favorites notification
- [ ] Test message notification  
- [ ] Test rating notification
- [ ] Verify real-time updates work
- [ ] Check notification badges appear correctly

The notification system is now fully functional and will automatically notify users of all marketplace activities!