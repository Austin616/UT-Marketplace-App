import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { initializePushNotifications, pushNotificationService } from '~/lib/pushNotifications';
import { useAuth } from './AuthContext';
import { supabase } from '~/lib/supabase';

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  initializeNotifications: () => Promise<void>;
  sendTestNotification: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);

  useEffect(() => {
    if (user?.email) {
      initializeNotifications();
    }
  }, [user]);

  useEffect(() => {
    // Set up notification listener
    const subscription = pushNotificationService.subscribeToNotifications((notification) => {
      setNotification(notification);
      console.log('Received notification:', notification);
    });

    // Set up notification response listener (when user taps notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      
      // Handle notification tap - navigate to appropriate screen
      const data = response.notification.request.content.data;
      if (data?.listing_id) {
        // Navigate to listing or chat based on notification type
        // This would need to be implemented with your navigation system
        console.log('Navigate to listing:', data.listing_id);
      }
    });

    return () => {
      subscription();
      responseSubscription.remove();
    };
  }, []);

  const initializeNotifications = async () => {
    if (!user?.email) return;

    try {
      await initializePushNotifications(user.email);
      const token = await pushNotificationService.getPushToken();
      setExpoPushToken(token);
      console.log('Push notifications initialized with token:', token);
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  };

  const sendTestNotification = async () => {
    if (!user?.email || !expoPushToken) return;

    try {
      await pushNotificationService.sendPushNotification(
        expoPushToken,
        '🎉 Test Notification',
        'This is a test notification from UT Marketplace!',
        { test: true }
      );
      console.log('Test notification sent');
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  };

  const value: NotificationContextType = {
    expoPushToken,
    notification,
    initializeNotifications,
    sendTestNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};