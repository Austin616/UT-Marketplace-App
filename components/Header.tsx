import { memo, useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, Text } from 'react-native';
import { MessageCircle, Search, Bell, Settings } from 'lucide-react-native';
import { usePathname, useRouter } from 'expo-router';
import Icon from '../assets/ios-light.png';
import { supabase } from '~/lib/supabase';
import { useAuth } from '~/contexts/AuthContext';
import { useNotificationSync } from '~/contexts/NotificationSyncContext';

function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount } = useNotificationSync();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // Fetch unread message count and set up real-time updates
  useEffect(() => {
    if (user?.email) {
      fetchUnreadMessageCount();
      
      // Set up real-time subscription for messages
      const subscription = supabase
        .channel(`header_messages:${user.email}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'messages',
            filter: `receiver_id=eq.${user.email}`
          }, 
          (payload) => {
            console.log('Header message update:', payload);
            
            if (payload.eventType === 'INSERT') {
              setUnreadMessageCount(prev => prev + 1);
            } else if (payload.eventType === 'UPDATE') {
              if (payload.old.read === false && payload.new.read === true) {
                setUnreadMessageCount(prev => Math.max(0, prev - 1));
              } else if (payload.old.read === true && payload.new.read === false) {
                setUnreadMessageCount(prev => prev + 1);
              }
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user?.email]);

  const fetchUnreadMessageCount = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', user.email)
        .eq('read', false);
      
      if (error) throw error;
      setUnreadMessageCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching unread message count:', error);
    }
  };

  const renderLeftSide = () => {
    if (pathname === '/profile') {
      return (
        <View className="flex-row items-center">
          <Text className="text-xl font-bold">My Profile</Text>
        </View>
      );
    }

    return (
      <View className="flex-row items-center">
        <TouchableOpacity onPress={() => router.push('/')}>
          <Image source={Icon} className="w-10 h-10 rounded-xl" />
        </TouchableOpacity>
      </View>
    );
  };

  const getHeaderIcons = () => {
    switch (pathname) {
      case '/':
        return (
          <>
            <TouchableOpacity onPress={() => router.push('/browse')} className="p-1">
              <Search size={24} color="black" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/messages')} className="p-1 relative">
              <MessageCircle size={24} color="black" />
              {unreadMessageCount > 0 && (
                <View className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications')} className="p-1 relative">
              <Bell size={24} color="black" />
              {unreadCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        );
      
      case '/profile':
        return (
          <>
            <TouchableOpacity onPress={() => router.push('/messages')}>
              <MessageCircle size={24} color="black" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(modals)/settings')}>
              <Settings size={24} color="black" />
            </TouchableOpacity>
          </>
        );

      default:
        return null;
    }
  };

  // Don't show header on modal screens
  if (pathname.startsWith('/(modals)')) {
    return null;
  }

  return (
    <View className="border-b border-gray-100 bg-white">
      <View className="flex-row items-center justify-between px-4 h-12">
        {renderLeftSide()}
        <View className="flex-row items-center gap-5">
          {getHeaderIcons()}
        </View>
      </View>
    </View>
  );
}
// Memoize the header to prevent unnecessary re-renders
export default memo(Header);
