import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '~/lib/supabase';
import { useAuth } from './AuthContext';

interface NotificationSyncContextType {
  unreadCount: number;
  refreshCount: () => Promise<void>;
  syncNotificationUpdate: (type: 'read' | 'unread' | 'delete' | 'clear_all') => void;
}

const NotificationSyncContext = createContext<NotificationSyncContextType | undefined>(undefined);

export const useNotificationSync = () => {
  const context = useContext(NotificationSyncContext);
  if (!context) {
    throw new Error('useNotificationSync must be used within a NotificationSyncProvider');
  }
  return context;
};

interface NotificationSyncProviderProps {
  children: React.ReactNode;
}

export const NotificationSyncProvider: React.FC<NotificationSyncProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Refresh count from database
  const refreshCount = useCallback(async () => {
    if (!user?.email) {
      setUnreadCount(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', user.email)
        .eq('is_read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error refreshing notification count:', error);
    }
  }, [user?.email]);

  // Sync notification updates across all components
  const syncNotificationUpdate = useCallback((type: 'read' | 'unread' | 'delete' | 'clear_all') => {
    switch (type) {
      case 'read':
        setUnreadCount(prev => Math.max(0, prev - 1));
        break;
      case 'unread':
        setUnreadCount(prev => prev + 1);
        break;
      case 'delete':
        setUnreadCount(prev => Math.max(0, prev - 1));
        break;
      case 'clear_all':
        setUnreadCount(0);
        break;
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  // Subscribe to real-time updates for global sync
  useEffect(() => {
    if (!user?.email) return;

    const subscription = supabase
      .channel(`global_notifications:${user.email}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.email}`,
        },
        (payload) => {
          console.log('Global notification sync:', payload);
          
          if (payload.eventType === 'INSERT') {
            // New notification
            if (!payload.new.is_read) {
              setUnreadCount(prev => prev + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Read status changed
            if (payload.old.is_read === false && payload.new.is_read === true) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            } else if (payload.old.is_read === true && payload.new.is_read === false) {
              setUnreadCount(prev => prev + 1);
            }
          } else if (payload.eventType === 'DELETE') {
            // Notification deleted
            if (!payload.old.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.email]);

  const value: NotificationSyncContextType = {
    unreadCount,
    refreshCount,
    syncNotificationUpdate,
  };

  return (
    <NotificationSyncContext.Provider value={value}>
      {children}
    </NotificationSyncContext.Provider>
  );
};