import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl, ActivityIndicator, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { COLORS } from '~/theme/colors';
import { MessageCircle, User, Clock, ChevronRight, Bell, BellOff, Heart, Eye, Mail, ChevronLeft, X, Trash2, Check, CheckCheck } from 'lucide-react-native';
import ModalHeader from '~/components/ModalHeader';
import { getTimeAgo } from '~/utils/timeago';
import { supabase } from '~/lib/supabase';
import { useAuth } from '~/contexts/AuthContext';
import { useNotifications } from '~/lib/useNotifications';
import { useNotificationSync } from '~/contexts/NotificationSyncContext';

interface Notification {
  id: string;
  type: 'favorite' | 'watchlist' | 'message' | 'listing_sold' | 'listing_inquiry';
  title: string;
  message: string;
  data: {
    listing_title?: string;
    listing_price?: number;
    listing_image?: string;
    actor_name?: string;
    sender_name?: string;
    message_preview?: string;
  };
  is_read: boolean;
  created_at: string;
  listing_id?: number;
  actor_id?: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshCount } = useNotificationSync();
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
        params: { id: notification.listing_id?.toString() || '' }
      });
    } else if (notification.listing_id) {
      router.push({
        pathname: '/listing/[id]',
        params: { id: notification.listing_id.toString() }
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
      case 'favorite':
        return <Heart size={16} color="#ef4444" fill="#ef4444" />;
      case 'watchlist':
        return <Eye size={16} color="#3b82f6" />;
      case 'message':
        return <MessageCircle size={16} color={COLORS.utOrange} />;
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
        <View className="py-4 px-4 border-b border-gray-200 bg-white">
          <View className="flex-row items-center justify-between mb-3">
            <TouchableOpacity onPress={() => router.back()}>
              <ChevronLeft size={24} color={COLORS.utOrange} />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-900">Notifications</Text>
            <View className="w-6" />
          </View>
          
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
              When someone favorites your listings, adds them to their watchlist, or messages you, you&apos;ll see notifications here.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}