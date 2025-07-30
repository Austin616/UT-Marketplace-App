import { View, TouchableOpacity, Animated, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Home, Search, MessageCircle, User, Plus } from "lucide-react-native";
import { COLORS } from "~/theme/colors";
import * as Haptics from 'expo-haptics';
import { useRef, useEffect, useState } from "react";
import { useAuth } from "~/contexts/AuthContext";
import { supabase } from "~/lib/supabase";
import { useNotificationSync } from "~/contexts/NotificationSyncContext";

const tabRoutes = [
  { name: "index", icon: Home },
  { name: "browse", icon: Search },
  { name: "create", icon: Plus },
  { name: "messages", icon: MessageCircle },
  { name: "profile", icon: User },
] as const;

export default function TabBar({
  state,
  navigation,
}: {
  state: any;
  navigation: any;
}) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount } = useNotificationSync();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const tabAnimations = useRef(tabRoutes.map(() => new Animated.Value(1))).current;
  
  // Fetch unread messages count specifically for the messages tab
  useEffect(() => {
    if (user?.email) {
      fetchUnreadMessages();
    }
  }, [user?.email]);

  // Real-time updates for message count
  useEffect(() => {
    if (!user?.email) return;

    const subscription = supabase
      .channel(`messages_count:${user.email}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.email}`,
        },
        (payload) => {
          console.log('Message count update:', payload);
          
          if (payload.eventType === 'INSERT') {
            // New message - increment count
            setUnreadMessageCount(prev => prev + 1);
          } else if (payload.eventType === 'UPDATE') {
            // Check if read status changed
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
  }, [user?.email]);

  const fetchUnreadMessages = async () => {
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
      console.error('Error fetching unread messages:', error);
    }
  };
  
  return (
    <View 
      className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200"
      style={{ 
        paddingBottom: insets.bottom,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 10,
      }}
    >
      <View className="flex-row justify-around items-center h-16">
        {tabRoutes.map((tab, index) => {
          const isFocused = state.routes[state.index].name === tab.name;
          const Icon = tab.icon;
          const scaleAnim = tabAnimations[index];

          const handlePress = () => {
            // Haptic feedback
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            
            // Scale animation
            Animated.sequence([
              Animated.timing(scaleAnim, {
                toValue: 0.85,
                duration: 100,
                useNativeDriver: true,
              }),
              Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
              }),
            ]).start();

            navigation.navigate(tab.name);
          };

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={handlePress}
              className="flex-1 items-center justify-center"
              activeOpacity={0.8}
            >
              <Animated.View
                style={{
                  transform: [{ scale: scaleAnim }],
                  backgroundColor: isFocused ? COLORS.iconBg : 'transparent',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 12,
                  position: 'relative',
                }}
              >
                <Icon 
                  size={24} 
                  color={isFocused ? COLORS.utOrange : COLORS.light.grey} 
                  strokeWidth={isFocused ? 2.5 : 2}
                />
                {/* Unread message indicator */}
                {tab.name === 'messages' && unreadMessageCount > 0 && (
                  <View 
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 8,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: '#ef4444',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text style={{
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 'bold',
                    }}>
                      {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                    </Text>
                  </View>
                )}
                {/* General notifications indicator (profile tab) */}
                {tab.name === 'profile' && unreadCount > 0 && (
                  <View 
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 8,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: '#ef4444',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text style={{
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 'bold',
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}