import { useState, useEffect, useCallback } from 'react';
import { NotificationService } from './notifications';
import { useAuth } from '~/contexts/AuthContext';
import { supabase } from './supabase';

interface Notification {
  id: string;
  type: 'favorite' | 'watchlist' | 'message' | 'rating' | 'listing_sold' | 'listing_inquiry';
  title: string;
  message: string;
  data: {
    listing_title?: string;
    listing_price?: number;
    listing_image?: string;
    actor_name?: string;
    sender_name?: string;
    message_preview?: string;
    rating?: number;
    review?: string;
    star_emoji?: string;
  };
  is_read: boolean;
  created_at: string;
  listing_id?: number;
  actor_id?: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load notifications from the server
  const loadNotifications = useCallback(async () => {
    if (!user?.email) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [notificationsData, unreadCountData] = await Promise.all([
        NotificationService.getNotifications(user.email),
        NotificationService.getUnreadCount(user.email)
      ]);

      setNotifications(notificationsData);
      setUnreadCount(unreadCountData);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // Mark a single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    const success = await NotificationService.markAsRead(notificationId);
    
    if (success) {
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    
    return success;
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.email) return false;

    const success = await NotificationService.markAllAsRead(user.email);
    
    if (success) {
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    }
    
    return success;
  }, [user?.email]);

  // Toggle notification read status
  const toggleReadStatus = useCallback(async (notificationId: string) => {
    try {
      const notification = notifications.find(n => n.id === notificationId);
      if (!notification) return false;

      const newReadStatus = !notification.is_read;
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: newReadStatus })
        .eq('id', notificationId);
      
      if (error) throw error;

      // The real-time subscription will handle state updates
      return true;
    } catch (error) {
      console.error('Error toggling notification read status:', error);
      return false;
    }
  }, [notifications]);

  // Delete a single notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) throw error;

      // The real-time subscription will handle state updates
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    if (!user?.email) return false;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.email);
      
      if (error) throw error;

      // Immediately update local state for better UX
      setNotifications([]);
      setUnreadCount(0);

      return true;
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      return false;
    }
  }, [user?.email]);

  // Refresh notifications
  const refresh = useCallback(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.email) return;

    const subscription = supabase
      .channel(`notifications:${user.email}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.email}`,
        },
        (payload) => {
          console.log('Notification real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new;
            setNotifications(prev => [newNotification, ...prev]);
            if (!newNotification.is_read) {
              setUnreadCount(prev => prev + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new;
            setNotifications(prev => 
              prev.map(n => 
                n.id === updatedNotification.id ? updatedNotification : n
              )
            );
            
            // Update count based on read status change
            if (payload.old.is_read === false && payload.new.is_read === true) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            } else if (payload.old.is_read === true && payload.new.is_read === false) {
              setUnreadCount(prev => prev + 1);
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedNotification = payload.old;
            setNotifications(prev => 
              prev.filter(n => n.id !== deletedNotification.id)
            );
            
            // Decrease count if deleted notification was unread
            if (!deletedNotification.is_read) {
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

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    toggleReadStatus,
    deleteNotification,
    clearAllNotifications,
    refresh
  };
}

// Hook for just getting the unread count (lightweight)
export function useNotificationCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const updateCount = useCallback(async () => {
    if (!user?.email) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await NotificationService.getUnreadCount(user.email);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error getting notification count:', error);
    }
  }, [user?.email]);

  useEffect(() => {
    updateCount();
  }, [updateCount]);

  // Subscribe to real-time updates for count
  useEffect(() => {
    if (!user?.email) return;

    const subscription = supabase
      .channel(`notifications_count:${user.email}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.email}`,
        },
        (payload) => {
          console.log('Notification count update:', payload);
          
          if (payload.eventType === 'INSERT') {
            // New notification - increment count if unread
            if (!payload.new.is_read) {
              setUnreadCount(prev => prev + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Check if read status changed
            if (payload.old.is_read === false && payload.new.is_read === true) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            } else if (payload.old.is_read === true && payload.new.is_read === false) {
              setUnreadCount(prev => prev + 1);
            }
          } else if (payload.eventType === 'DELETE') {
            // Notification deleted - decrease count if it was unread
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

  return {
    unreadCount,
    refresh: updateCount
  };
}