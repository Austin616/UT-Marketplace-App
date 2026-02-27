import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Alert,
  Pressable,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '~/contexts/AuthContext';
import { UserNotificationService, UserNotification } from '~/lib/userNotifications';
import { MessageCircle, Star, Trash2, CheckCheck, Bell, BellOff, Heart, Eye, Settings, MoreHorizontal } from 'lucide-react-native';
import { COLORS } from '~/theme/colors';
import { getTimeAgo } from '~/utils/timeago';
import * as Haptics from 'expo-haptics';
import AppHeader from '~/components/layout/AppHeader';

export default function UserNotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [user?.id]);

  const fetchNotifications = async (showLoading = true) => {
    if (!user?.id) return;

    try {
      if (showLoading) setLoading(true);
      
      const data = await UserNotificationService.getNotifications(user.id);
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!user?.id) return;

    try {
      const count = await UserNotificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications(false);
    fetchUnreadCount();
  };

  const handleNotificationPress = async (notification: UserNotification) => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Mark as read if unread
    if (!notification.is_read) {
      await UserNotificationService.markAsRead(notification.id);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'message':
        if (notification.actor_id) {
          router.push({
            pathname: '/chat/[id]',
            params: { 
              id: notification.actor_id,
              otherUserId: notification.actor_id,
              otherUserName: notification.data?.actor_name || 'User',
              listingId: notification.listing_id || 'general',
              listingTitle: notification.data?.listing_title || ''
            }
          });
        }
        break;
      case 'review':
        router.push(`/profile/${user?.id}`);
        break;
      case 'listing':
        if (notification.listing_id) {
          router.push(`/listing/${notification.listing_id}`);
        }
        break;
      case 'system':
        // Handle system notifications
        break;
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await UserNotificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      fetchUnreadCount(); // Refresh count in case it was unread
    } catch (error) {
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;

    try {
      await UserNotificationService.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNotifications.size === 0) return;

    try {
      const promises = Array.from(selectedNotifications).map(id => 
        UserNotificationService.deleteNotification(id)
      );
      
      await Promise.all(promises);
      
      setNotifications(prev => 
        prev.filter(n => !selectedNotifications.has(n.id))
      );
      setSelectedNotifications(new Set());
      setSelectionMode(false);
      fetchUnreadCount();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete notifications');
    }
  };

  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedNotifications(new Set());
    }
  };

  const selectAll = () => {
    if (selectedNotifications.size === notifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(notifications.map(n => n.id)));
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle size={20} color={COLORS.utOrange} />;
      case 'review':
        return <Star size={20} color={COLORS.utOrange} fill={COLORS.utOrange} />;
      case 'listing':
        return <Heart size={20} color={COLORS.utOrange} fill={COLORS.utOrange} />;
      case 'system':
        return <Settings size={20} color={COLORS.utOrange} />;
      default:
        return <Bell size={20} color={COLORS.utOrange} />;
    }
  };

  const renderNotification = ({ item }: { item: UserNotification }) => {
    const isSelected = selectedNotifications.has(item.id);
    
    return (
      <View className={`mx-4 mb-4 ${!item.is_read ? 'opacity-100' : 'opacity-80'}`}>
        <Pressable
          onPress={() => selectionMode ? toggleSelection(item.id) : handleNotificationPress(item)}
          onLongPress={() => {
            if (!selectionMode) {
              setSelectionMode(true);
              toggleSelection(item.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          }}
          className={`bg-white rounded-2xl shadow-lg border-2 ${
            isSelected
              ? 'border-blue-400 bg-blue-50'
              : !item.is_read 
                ? 'border-orange-300 bg-gradient-to-r from-orange-50 to-white shadow-orange-100' 
                : 'border-gray-200 shadow-gray-100'
          }`}
          style={{
            shadowColor: isSelected ? '#3b82f6' : !item.is_read ? COLORS.utOrange : '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: isSelected ? 0.2 : !item.is_read ? 0.15 : 0.08,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
        <View className="p-5">
          <View className="flex-row items-start">
            {/* Selection checkbox */}
            {selectionMode && (
              <View className="mr-3 mt-1">
                <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                  isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'
                }`}>
                  {isSelected && (
                    <CheckCheck size={14} color="white" />
                  )}
                </View>
              </View>
            )}
            
            {/* Notification Icon with enhanced styling */}
            <View className="mr-4">
              <View className={`w-14 h-14 rounded-full items-center justify-center ${
                isSelected ? 'bg-blue-100' : !item.is_read ? 'bg-orange-100' : 'bg-gray-100'
              }`}>
                {getNotificationIcon(item.type)}
              </View>
              {!item.is_read && !isSelected && (
                <View className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full border-2 border-white">
                  <View className="w-1 h-1 bg-white rounded-full self-center mt-1.5" />
                </View>
              )}
            </View>

            {/* Content with improved spacing */}
            <View className="flex-1 mr-3">
              {/* Header with better typography */}
              <View className="flex-row items-start justify-between mb-3">
                <Text className={`text-base text-gray-900 flex-1 mr-2 ${
                  !item.is_read ? 'font-bold' : 'font-semibold'
                }`} numberOfLines={2}>
                  {item.title}
                </Text>
                <View className="bg-gray-100 rounded-full px-2 py-1">
                  <Text className="text-xs text-gray-600 font-medium">
                    {getTimeAgo(item.created_at)}
                  </Text>
                </View>
              </View>

              {/* Message with better styling */}
              <Text className="text-gray-700 leading-5 mb-3" numberOfLines={3}>
                {item.message}
              </Text>

              {/* Enhanced review display */}
              {item.type === 'review' && item.data?.rating && (
                <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-3">
                  <View className="flex-row items-center mb-2">
                    <Text className="text-2xl mr-3">{item.data.star_emoji || '⭐'.repeat(item.data.rating)}</Text>
                    <View>
                      <Text className="text-sm font-bold text-gray-900">
                        {item.data.rating}/5 stars
                      </Text>
                      <Text className="text-xs text-gray-600">
                        Rating received
                      </Text>
                    </View>
                  </View>
                  {item.data.review && (
                    <View className="bg-white rounded-lg p-2 mt-2">
                      <Text className="text-sm text-gray-700 italic" numberOfLines={3}>
                        "{item.data.review}"
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Enhanced message preview */}
              {item.type === 'message' && item.data?.message_preview && (
                <View className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
                  <View className="flex-row items-center mb-2">
                    <MessageCircle size={16} color="#2563eb" />
                    <Text className="text-sm font-semibold text-blue-800 ml-2">
                      Message Preview
                    </Text>
                  </View>
                  <Text className="text-sm text-blue-700 italic leading-5" numberOfLines={3}>
                    "{item.data.message_preview}"
                  </Text>
                </View>
              )}

              {/* Enhanced listing preview */}
              {item.data?.listing_title && (
                <View className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3">
                  <View className="flex-row items-center">
                    {item.data.listing_image && (
                      <Image
                        source={{ uri: item.data.listing_image }}
                        className="w-12 h-12 rounded-xl mr-3 bg-gray-200"
                      />
                    )}
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900 mb-1" numberOfLines={2}>
                        {item.data.listing_title}
                      </Text>
                      {item.data.listing_price && (
                        <View className="bg-orange-100 rounded-full px-3 py-1 self-start">
                          <Text className="text-sm font-bold" style={{ color: COLORS.utOrange }}>
                            ${item.data.listing_price}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Enhanced action bar */}
        <View className="flex-row items-center justify-between px-5 pb-4 pt-2 border-t border-gray-100">
          {/* Read/Unread Status */}
          <View className="flex-row items-center">
            {item.is_read ? (
              <View className="flex-row items-center bg-green-50 rounded-full px-3 py-1.5">
                <CheckCheck size={14} color="#059669" />
                <Text className="text-green-700 font-medium text-xs ml-1">
                  Read
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center bg-blue-50 rounded-full px-3 py-1.5">
                <Eye size={14} color="#2563eb" />
                <Text className="text-blue-700 font-medium text-xs ml-1">
                  New
                </Text>
              </View>
            )}
          </View>

          {/* Delete button with improved design */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation(); // Prevent triggering notification press
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Alert.alert(
                'Delete Notification',
                'This notification will be permanently removed. Are you sure?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Delete', 
                    style: 'destructive', 
                    onPress: () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                      handleDeleteNotification(item.id);
                    }
                  }
                ]
              );
            }}
            className="flex-row items-center bg-red-50 border border-red-200 rounded-full px-4 py-2"
          >
            <Trash2 size={14} color="#dc2626" />
            <Text className="text-red-700 font-semibold text-xs ml-2">
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </View>
    );
  };

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
      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <AppHeader
          variant="standard"
          title={selectionMode ? `${selectedNotifications.size} selected` : 'Notifications'}
          showBackButton
          showBorder={false}
          onBackPress={() => (selectionMode ? toggleSelectionMode() : router.back())}
          rightElement={
            <TouchableOpacity onPress={toggleSelectionMode}>
              <MoreHorizontal size={20} color={COLORS.utOrange} />
            </TouchableOpacity>
          }
        />
        
        {selectionMode ? (
          // Selection mode controls
          <View className="flex-row items-center justify-between px-4 pb-3">
            <TouchableOpacity
              onPress={selectAll}
              className="flex-row items-center bg-blue-50 rounded-full px-3 py-2"
            >
              <CheckCheck size={14} color="#1e40af" />
              <Text className="text-blue-800 font-medium text-xs ml-1">
                {selectedNotifications.size === notifications.length ? 'Deselect all' : 'Select all'}
              </Text>
            </TouchableOpacity>
            
            {selectedNotifications.size > 0 && (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Delete Selected',
                    `Delete ${selectedNotifications.size} notification${selectedNotifications.size === 1 ? '' : 's'}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: handleBulkDelete }
                    ]
                  );
                }}
                className="flex-row items-center bg-red-50 rounded-full px-3 py-2"
              >
                <Trash2 size={14} color="#dc2626" />
                <Text className="text-red-800 font-medium text-xs ml-1">
                  Delete ({selectedNotifications.size})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          // Normal mode controls
          <View className="flex-row items-center justify-between px-4 pb-3">
            <Text className="text-gray-600">
              {notifications.length === 0 
                ? 'No notifications'
                : unreadCount > 0 
                  ? `${unreadCount} unread of ${notifications.length} total`
                  : `All ${notifications.length} read`
              }
            </Text>
            
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={handleMarkAllRead}
                className="flex-row items-center bg-blue-50 rounded-full px-3 py-2"
              >
                <CheckCheck size={14} color="#1e40af" />
                <Text className="text-blue-800 font-medium text-xs ml-1">
                  Read all
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Notifications List */}
      {loading ? (
        <View className="flex-1 items-center justify-center py-20 px-4">
          <ActivityIndicator size="large" color={COLORS.utOrange} />
          <Text className="text-gray-500 mt-4">Loading notifications...</Text>
        </View>
      ) : notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.utOrange}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        <View className="flex-1 items-center justify-center py-20 px-4">
          <View className="bg-gray-100 rounded-full p-6 mb-4">
            <Bell size={40} color="#9ca3af" />
          </View>
          <Text className="text-xl font-semibold text-gray-900 mb-2">No notifications yet</Text>
          <Text className="text-gray-600 text-center px-8">
            When someone messages you, rates you, or interacts with your listings, you'll see notifications here.
          </Text>
        </View>
      )}
    </View>
  );
}
