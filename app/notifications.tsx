import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '~/theme/colors';
import { MessageCircle, User, Clock, ChevronRight, Bell, BellOff, Heart, Eye, Mail, X, Trash2, Check, CheckCheck, Settings } from 'lucide-react-native';
import AppHeader from '~/components/layout/AppHeader';
import { getTimeAgo } from '~/utils/timeago';
import { useAuth } from '~/contexts/AuthContext';
import { useNotifications } from '~/lib/useNotifications';
import { useNotificationSync } from '~/contexts/NotificationSyncContext';
import NotificationDebugPanel from '~/components/debug/NotificationDebugPanel';

interface Notification {
  id: string;
  type: 'message' | 'review' | 'listing' | 'system';
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
  listing_id?: string;
  actor_id?: string;
  actor_name?: string;
  message_id?: string;
  review_id?: string;
  push_sent?: boolean;
  read_at?: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshCount } = useNotificationSync();
  const [showDebugPanel, setShowDebugPanel] = useState(__DEV__);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    toggleReadStatus,
    deleteNotification,
    clearAllNotifications,
    refresh
  } = useNotifications();

  const onRefresh = () => {
    refresh();
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read using the hook
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'message') {
      router.push({
        pathname: '/chat/[id]',
        params: { 
          id: notification.actor_id || '',
          otherUserId: notification.actor_id || '',
          otherUserName: notification.data.sender_name || 'User',
          listingId: notification.listing_id || 'general',
          listingTitle: notification.data.listing_title || ''
        }
      });
    } else if (notification.listing_id) {
      router.push({
        pathname: '/listing/[id]',
        params: { id: notification.listing_id }
      });
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            await clearAllNotifications();
            // Refresh global count to ensure sync
            refreshCount();
          }
        }
      ]
    );
  };

  const handleDeleteNotification = (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await deleteNotification(notificationId);
            // Refresh global count to ensure sync
            refreshCount();
          }
        }
      ]
    );
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    // Refresh global count to ensure sync
    refreshCount();
  };

  const handleToggleReadStatus = async (notificationId: string) => {
    await toggleReadStatus(notificationId);
    // Refresh global count to ensure sync
    refreshCount();
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle size={16} color={COLORS.utOrange} />;
      case 'review':
        return <Text style={{ fontSize: 16 }}>⭐</Text>;
      case 'listing':
        return <Text style={{ fontSize: 16 }}>📋</Text>;
      case 'system':
        return <Bell size={16} color="#6b7280" />;
      default:
        return <Bell size={16} color="#6b7280" />;
    }
  };

  const renderNotificationItem = (notification: Notification) => (
    <View key={notification.id} className={`mb-3 ${notification.is_read ? 'opacity-70' : ''}`}>
      <View className={`bg-white rounded-xl shadow-sm border ${!notification.is_read ? 'border-orange-200 bg-orange-50' : 'border-gray-100'}`}>
        {/* Main Content - Touchable */}
        <TouchableOpacity
          onPress={() => handleNotificationPress(notification)}
          className="p-4"
        >
          <View className="flex-row items-start">
            {/* Notification Icon */}
            <View className="mr-3">
              <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center">
                {getNotificationIcon(notification.type)}
              </View>
              {!notification.is_read && (
                <View className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full" />
              )}
            </View>

            {/* Content */}
            <View className="flex-1 mr-3">
              {/* Header */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-semibold text-gray-900" numberOfLines={1}>
                  {notification.title}
                </Text>
                <View className="flex-row items-center">
                  <Clock size={12} color="#6b7280" />
                  <Text className="text-xs text-gray-500 ml-1">
                    {getTimeAgo(notification.created_at)}
                  </Text>
                </View>
              </View>

              {/* Message */}
              <Text className="text-gray-700 mb-3" numberOfLines={2}>
                {notification.message}
              </Text>

              {/* Rating Display for review notifications */}
              {notification.type === 'review' && notification.data.rating && (
                <View className="flex-row items-center mb-2">
                  <Text className="text-lg mr-2">{notification.data.star_emoji || '⭐'.repeat(notification.data.rating)}</Text>
                  <Text className="text-sm font-medium text-gray-700">
                    {notification.data.rating}/5 stars
                  </Text>
                  {notification.data.review && (
                    <Text className="text-xs text-gray-500 ml-2" numberOfLines={1}>
                      • "{notification.data.review}"
                    </Text>
                  )}
                </View>
              )}

              {/* Message Preview for message notifications */}
              {notification.type === 'message' && notification.data.message_preview && (
                <View className="bg-blue-50 p-2 rounded-lg mb-2">
                  <Text className="text-sm text-blue-800 italic" numberOfLines={2}>
                    "{notification.data.message_preview}"
                  </Text>
                </View>
              )}

              {/* Listing Preview */}
              {notification.data.listing_title && (
                <View className="flex-row items-center p-2 bg-gray-50 rounded-lg">
                  {notification.data.listing_image && (
                    <Image
                      source={{ uri: notification.data.listing_image }}
                      className="w-10 h-10 rounded-lg mr-3"
                    />
                  )}
                  <View className="flex-1">
                    <Text className="text-sm text-gray-600" numberOfLines={1}>
                      {notification.data.listing_title}
                    </Text>
                    {notification.data.listing_price && (
                      <Text className="text-xs font-semibold" style={{ color: COLORS.utOrange }}>
                        ${notification.data.listing_price}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Arrow */}
            <ChevronRight size={20} color="#9ca3af" />
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View className="flex-row items-center justify-end px-4 pb-3 pt-1 border-t border-gray-100">
          {/* Mark as Read/Unread */}
          <TouchableOpacity
            onPress={() => handleToggleReadStatus(notification.id)}
            className="flex-row items-center bg-blue-50 rounded-full px-3 py-1.5 mr-2"
          >
            {notification.is_read ? (
              <>
                <Bell size={14} color="#1e40af" />
                <Text className="text-blue-800 font-medium text-xs ml-1">
                  Mark unread
                </Text>
              </>
            ) : (
              <>
                <Check size={14} color="#1e40af" />
                <Text className="text-blue-800 font-medium text-xs ml-1">
                  Mark read
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            onPress={() => handleDeleteNotification(notification.id)}
            className="flex-row items-center bg-red-50 rounded-full px-3 py-1.5"
          >
            <Trash2 size={14} color="#dc2626" />
            <Text className="text-red-800 font-medium text-xs ml-1">
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (!user) {
    return (
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-200">
          <AppHeader variant="standard" title="Notifications" showBackButton showBorder={false} />
        </View>

        {/* Login Required Content */}
        <View className="flex-1 justify-center">
          <View className="bg-white mx-4 rounded-3xl p-8 shadow-sm">
            <View className="items-center mb-8">
              <Bell size={64} color={COLORS.utOrange} />
              <Text className="text-2xl font-semibold mt-4">Your Notifications</Text>
              <Text className="text-gray-500 text-center mt-2">
                Stay updated on marketplace activity
              </Text>
            </View>

            <View className="items-center">
              <Text className="text-gray-600 text-center mb-4 text-lg">
                You need to be logged in to view your notifications
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile')}
                className="w-full flex-row items-center justify-center py-3.5 rounded-xl"
                style={{ backgroundColor: COLORS.utOrange }}
              >
                <User size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text className="text-white font-medium">Go to Profile to Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
        
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Stats */}
        <View className="bg-white border-b border-gray-200">
          <AppHeader
            variant="standard"
            title="Notifications"
            showBackButton
            showBorder={false}
            rightElement={
              __DEV__ ? (
                <TouchableOpacity onPress={() => setShowDebugPanel(!showDebugPanel)}>
                  <Settings size={20} color={COLORS.utOrange} />
                </TouchableOpacity>
              ) : null
            }
          />
          
          <View className="px-4 pb-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-600">
                {notifications.length === 0 
                  ? 'No notifications'
                  : unreadCount > 0 
                    ? `${unreadCount} unread of ${notifications.length} total`
                    : `All ${notifications.length} read`
                }
              </Text>
              
              <View className="flex-row items-center gap-2">
                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={handleMarkAllAsRead}
                    className="flex-row items-center bg-blue-50 rounded-full px-3 py-2"
                  >
                    <CheckCheck size={14} color="#1e40af" />
                    <Text className="text-blue-800 font-medium text-xs ml-1">
                      Read all
                    </Text>
                  </TouchableOpacity>
                )}
                
                {notifications.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearAll}
                    className="flex-row items-center bg-red-50 rounded-full px-3 py-2"
                  >
                    <Trash2 size={14} color="#dc2626" />
                    <Text className="text-red-800 font-medium text-xs ml-1">
                      Clear all
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Debug Panel (Development Only) */}
        {__DEV__ && (
          <NotificationDebugPanel 
            visible={showDebugPanel} 
            onToggle={() => setShowDebugPanel(!showDebugPanel)}
          />
        )}

        {/* Notifications List */}
        {loading ? (
          <View className="flex-1 items-center justify-center py-20 px-4">
            <ActivityIndicator size="large" color={COLORS.utOrange} />
            <Text className="text-gray-500 mt-4">Loading notifications...</Text>
          </View>
        ) : notifications.length > 0 ? (
          <View className="pb-6 px-4">
            {notifications.map(renderNotificationItem)}
          </View>
        ) : (
          <View className="flex-1 items-center justify-center py-20 px-4">
            <View className="bg-gray-100 rounded-full p-6 mb-4">
              <Bell size={40} color="#9ca3af" />
            </View>
            <Text className="text-xl font-semibold text-gray-900 mb-2">No notifications yet</Text>
            <Text className="text-gray-600 text-center px-8">
              When someone favorites your listings, adds them to their watchlist, messages you, or rates you, you&apos;ll see notifications here.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
