import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationService {
  registerForPushNotifications: () => Promise<string | null>;
  sendPushNotification: (expoPushToken: string, title: string, body: string, data?: any) => Promise<void>;
  schedulePushNotification: (title: string, body: string, seconds: number, data?: any) => Promise<void>;
  getPushToken: () => Promise<string | null>;
  storePushToken: (userId: string, token: string) => Promise<void>;
  subscribeToNotifications: (callback: (notification: Notifications.Notification) => void) => () => void;
}

class PushNotificationServiceImpl implements PushNotificationService {
  private pushToken: string | null = null;

  async registerForPushNotifications(): Promise<string | null> {
    let token: string | null = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) {
          throw new Error('Project ID not found');
        }
        
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
        
        this.pushToken = token;
        console.log('Push token obtained:', token);
      } catch (e) {
        console.error('Error getting push token:', e);
        return null;
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  }

  async sendPushNotification(expoPushToken: string, title: string, body: string, data?: any): Promise<void> {
    const message = {
      to: expoPushToken,
      sound: 'default' as const,
      title: title,
      body: body,
      data: data || {},
      badge: 1,
    };

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log('Push notification sent:', result);
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  async schedulePushNotification(title: string, body: string, seconds: number, data?: any): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        data: data || {},
        sound: 'default',
        badge: 1,
      },
      trigger: { seconds: seconds },
    });
  }

  async getPushToken(): Promise<string | null> {
    if (this.pushToken) {
      return this.pushToken;
    }
    
    return await this.registerForPushNotifications();
  }

  async storePushToken(userId: string, token: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          email: userId,
          push_token: token,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'email'
        });

      if (error) {
        console.error('Error storing push token:', error);
        throw error;
      }

      console.log('Push token stored successfully');
    } catch (error) {
      console.error('Error storing push token:', error);
      throw error;
    }
  }

  subscribeToNotifications(callback: (notification: Notifications.Notification) => void): () => void {
    const subscription = Notifications.addNotificationReceivedListener(callback);
    
    return () => {
      subscription.remove();
    };
  }
}

export const pushNotificationService = new PushNotificationServiceImpl();

// Helper function to initialize push notifications for a user
export const initializePushNotifications = async (userId: string): Promise<void> => {
  try {
    const token = await pushNotificationService.registerForPushNotifications();
    
    if (token) {
      await pushNotificationService.storePushToken(userId, token);
    }
  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
};

// Helper function to send notification to a specific user
export const sendNotificationToUser = async (
  userId: string, 
  title: string, 
  body: string, 
  data?: any
): Promise<void> => {
  try {
    // Get user's push token from database
    const { data: userSettings, error } = await supabase
      .from('user_settings')
      .select('push_token')
      .eq('email', userId)
      .single();

    if (error || !userSettings?.push_token) {
      console.log('No push token found for user:', userId);
      return;
    }

    await pushNotificationService.sendPushNotification(
      userSettings.push_token,
      title,
      body,
      data
    );
  } catch (error) {
    console.error('Error sending notification to user:', error);
  }
};