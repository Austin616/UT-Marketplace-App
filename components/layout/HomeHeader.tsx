import { memo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, MessageCircle, Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '~/contexts/AuthContext';
import { supabase } from '~/lib/supabase';
import { useNotificationSync } from '~/contexts/NotificationSyncContext';
import { useMessageCount } from '~/contexts/MessageCountContext';
import AppHeader from './AppHeader';
import Icon from '~/assets/ios-light.png';

function HomeHeader() {
  const router = useRouter();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState<string>('there');
  const { unreadCount } = useNotificationSync();
  const { unreadMessageCount } = useMessageCount();

  useEffect(() => {
    const fetchDisplayName = async () => {
      if (!user?.id) return;
      
      try {
        const { data: userData } = await supabase
          .from('user_settings')
          .select('display_name')
          .eq('email', user.email)
          .single();
        
        if (userData?.display_name) {
          setDisplayName(userData.display_name);
        } else if (user.email) {
          setDisplayName(user.email.split('@')[0]);
        }
      } catch (error) {
        // Fallback to email username if query fails
        if (user.email) {
          setDisplayName(user.email.split('@')[0]);
        }
      }
    };

    fetchDisplayName();
  }, [user]);

  const getTimeOfDayGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  };

  const handlePress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  };

  return (
    <View className="bg-white">
      <AppHeader
        variant="large"
        actionsPlacement="top"
        title={`${getTimeOfDayGreeting()}, ${displayName}!`}
        subtitle="Ready to find something great?"
        leftElement={
          <TouchableOpacity onPress={() => handlePress(() => router.push('/'))}>
            <Image source={Icon} className="w-10 h-10 rounded-xl" />
          </TouchableOpacity>
        }
        rightElement={
          <>
            <TouchableOpacity
              onPress={() => handlePress(() => router.push('/browse'))}
              className="p-1"
            >
              <Search size={22} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handlePress(() => router.push('/messages'))}
              className="p-1 relative"
            >
              <MessageCircle size={22} color="#374151" />
              {unreadMessageCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handlePress(() => router.push('/user-notifications'))}
              className="p-1 relative"
            >
              <Bell size={22} color="#374151" />
              {unreadCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        }
      />
    </View>
  );
}

export default memo(HomeHeader);
