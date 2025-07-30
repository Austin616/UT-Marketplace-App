# Push Notification Setup Guide

This guide explains how to set up push notifications for the UT Marketplace app.

## 🔧 Prerequisites

1. **Expo Development Build**: Push notifications require a development build, not Expo Go
2. **EAS Project**: You need an EAS project ID for push notifications
3. **Physical Device**: Push notifications don't work in simulators

## 📱 Installation Complete

The following components have been installed and configured:

### ✅ Packages Installed
- `expo-notifications` - For push notification handling

### ✅ Files Created
- `lib/pushNotifications.ts` - Push notification service
- `contexts/NotificationContext.tsx` - React context for notifications
- `supabase_push_notifications.sql` - Database functions and triggers
- `migrations/add_push_token.sql` - Database migration for push tokens

### ✅ Enhanced Notifications Page
- Individual notification clear functionality
- Bulk clear all notifications
- Mark as read/unread toggle for each notification
- Improved UI with action buttons

## 🚀 Setup Steps

### 1. Database Setup

Run these SQL files in your Supabase SQL editor:

```sql
-- First, run the migration to add push_token column
-- File: migrations/add_push_token.sql

-- Then, run the push notification system
-- File: supabase_push_notifications.sql
```

### 2. App Configuration

Add the NotificationProvider to your app root:

```tsx
// In your app/_layout.tsx or equivalent
import { NotificationProvider } from '~/contexts/NotificationContext';

export default function RootLayout() {
  return (
    <NotificationProvider>
      {/* Your existing app content */}
    </NotificationProvider>
  );
}
```

### 3. EAS Configuration

Make sure your `app.json` or `app.config.js` includes:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-project-id-here"
      }
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ]
  }
}
```

### 4. Build Configuration

Update your `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

## 📋 Features Implemented

### Push Notifications
- ✅ **Automatic registration** when user logs in
- ✅ **Database storage** of push tokens
- ✅ **Automatic sending** via database triggers
- ✅ **Notification handling** when app is foreground/background
- ✅ **Deep linking** support (tap notification to navigate)

### Enhanced Notifications Page
- ✅ **Individual clear** - Delete single notifications
- ✅ **Bulk clear** - Clear all notifications at once
- ✅ **Mark as read/unread** - Toggle read status per notification
- ✅ **Improved UI** - Better action buttons and layout
- ✅ **Confirmation dialogs** - Prevent accidental deletions

### Notification Types Supported
- 📱 **Favorites** - When someone favorites your listing
- 👀 **Watchlist** - When someone adds to watchlist
- 💬 **Messages** - New chat messages
- ⭐ **Ratings** - When someone rates you
- 🏷️ **Listing updates** - Sold notifications, etc.

## 🔄 How It Works

### Automatic Flow
1. User logs in → Push token registered automatically
2. Someone interacts with user's listing → Database notification created
3. Database trigger → Push notification sent automatically
4. User receives notification → Can tap to navigate to relevant screen

### Manual Testing
```tsx
// In any component
import { useNotificationContext } from '~/contexts/NotificationContext';

const { sendTestNotification } = useNotificationContext();

// Send test notification
await sendTestNotification();
```

## 🛠️ Database Functions Available

### For Manual Notifications
```sql
-- Send notification to specific user
SELECT send_notification_to_user(
    'user@example.com', 
    'Test Title', 
    'Test message body',
    '{"custom": "data"}'::jsonb
);

-- Update user's push token
SELECT update_user_push_token(
    'user@example.com', 
    'ExponentPushToken[your-token-here]'
);
```

## 🔍 Testing

### 1. Development Testing
```bash
# Build development client
eas build --profile development --platform ios

# Install on device and test
```

### 2. Database Testing
```sql
-- Check if push tokens are being stored
SELECT email, push_token FROM user_settings WHERE push_token IS NOT NULL;

-- Manually trigger a notification
INSERT INTO notifications (user_id, type, title, message, data) 
VALUES ('test@example.com', 'message', 'Test', 'Test message', '{}');
```

### 3. App Testing
```tsx
// Test notification registration
const { expoPushToken, sendTestNotification } = useNotificationContext();
console.log('Push token:', expoPushToken);

// Send test notification
await sendTestNotification();
```

## 🚨 Production Considerations

### 1. HTTP Requests in Database
The current SQL implementation logs notifications but doesn't send actual HTTP requests. For production, you need to:

- Install `pg_net` extension in Supabase
- Uncomment the HTTP request code in `send_push_notification` function
- Or implement push sending in your backend API

### 2. Rate Limiting
Consider implementing rate limiting for push notifications to avoid spam.

### 3. User Preferences
Add notification preference settings to let users control what notifications they receive.

### 4. Error Handling
Implement proper error handling and retry logic for failed push notifications.

## 📚 API Reference

### NotificationContext
```tsx
interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  initializeNotifications: () => Promise<void>;
  sendTestNotification: () => Promise<void>;
}
```

### PushNotificationService
```tsx
interface PushNotificationService {
  registerForPushNotifications: () => Promise<string | null>;
  sendPushNotification: (token: string, title: string, body: string, data?: any) => Promise<void>;
  getPushToken: () => Promise<string | null>;
  storePushToken: (userId: string, token: string) => Promise<void>;
  subscribeToNotifications: (callback: (notification: Notification) => void) => () => void;
}
```

## 🎯 Next Steps

1. **Run the database migrations**
2. **Add NotificationProvider to your app**
3. **Build and test on a physical device**
4. **Configure production HTTP requests**
5. **Add notification preferences UI**

The system is now ready for push notifications and enhanced notification management! 🚀