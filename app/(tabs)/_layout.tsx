import * as Haptics from 'expo-haptics';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Home, Search, MessageCircle, User, Plus, Settings } from 'lucide-react-native';
import { View, TouchableOpacity } from 'react-native';
import { useState, createContext, useContext } from 'react';
import AppHeader from '~/components/layout/AppHeader';
import { COLORS } from '~/theme/colors';
import { useMessageCount } from '~/contexts/MessageCountContext';
import { useAuth } from '~/contexts/AuthContext';

// Create context for home refresh
const HomeRefreshContext = createContext<{
  triggerRefresh: () => void;
  refreshKey: number;
  refreshMessages: () => Promise<void>;
}>({
  triggerRefresh: () => {},
  refreshKey: 0,
  refreshMessages: async () => {},
});

export const useHomeRefresh = () => useContext(HomeRefreshContext);

function ConditionalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  
  // Don't show header for modal screens or specific routes
  if (pathname.startsWith('/(modals)') || pathname.startsWith('/chat/') || pathname.startsWith('/listing/')) {
    return null;
  }

  // Show appropriate header based on current tab
  switch (pathname) {
    case '/browse':
      return (
        <AppHeader
          variant="large"
          title="Browse"
          rightElement={
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/create');
              }}
              className="p-2 bg-orange-50 rounded-full"
            >
              <Plus size={18} color={COLORS.utOrange} />
            </TouchableOpacity>
          }
        />
      );
    case '/profile':
      return (
        <AppHeader
          variant="large"
          title="Profile"
          rightElement={
            user ? (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(modals)/settings');
                }}
                className="p-2 bg-orange-50 rounded-full"
              >
                <Settings size={18} color={COLORS.utOrange} />
              </TouchableOpacity>
            ) : null
          }
        />
      );
    case '/messages':
      return (
        <AppHeader
          variant="large"
          title="Messages"
        />
      );
    case '/create':
      return (
        <AppHeader
          variant="large"
          title="Sell Item"
          subtitle="Create a listing in a few steps"
        />
      );
    case '/':
    default:
      return null; // Home page will handle its own header
  }
}

export default function TabsLayout() {
  const { unreadMessageCount, refreshMessageCount } = useMessageCount();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const pathname = usePathname();

  const handleTabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleHomeTabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // If already on home page, trigger refresh
    if (pathname === '/') {
      setRefreshTrigger(prev => prev + 1);
      // Trigger refresh through context
      triggerRefresh();
    }
  };

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <HomeRefreshContext.Provider value={{ triggerRefresh, refreshKey: refreshTrigger, refreshMessages: refreshMessageCount }}>
      <View className="flex-1">
        <ConditionalHeader />
        <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor: '#e5e7eb',
            borderTopWidth: 1,
            height: 76,
            paddingBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 10,
          },
          tabBarActiveTintColor: COLORS.utOrange,
          tabBarInactiveTintColor: COLORS.light.grey,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '500',
            marginTop: 1,
          },
          tabBarIconStyle: {
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={1.2} />,
            tabBarActiveBackgroundColor: 'rgba(191, 87, 0, 0.05)',
          }}
          listeners={{
            tabPress: handleHomeTabPress,
          }}
        />
        <Tabs.Screen
          name="browse"
          options={{
            title: 'Browse',
            tabBarIcon: ({ color, size }) => <Search size={size} color={color} strokeWidth={1.2} />,
            tabBarActiveBackgroundColor: 'rgba(191, 87, 0, 0.05)',
          }}
          listeners={{
            tabPress: handleTabPress,
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: 'Sell',
            tabBarIcon: ({ color, size }) => <Plus size={size} color={color} strokeWidth={1.2} />,
            tabBarActiveBackgroundColor: 'rgba(191, 87, 0, 0.05)',
          }}
          listeners={{
            tabPress: handleTabPress,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} strokeWidth={1.2} />,
            tabBarActiveBackgroundColor: 'rgba(191, 87, 0, 0.05)',
            tabBarBadge: unreadMessageCount > 0 ? unreadMessageCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: COLORS.utOrange,
              color: 'white',
            },
          }}
          listeners={{
            tabPress: handleTabPress,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={1.2} />,
            tabBarActiveBackgroundColor: 'rgba(191, 87, 0, 0.05)',
          }}
          listeners={{
            tabPress: handleTabPress,
          }}
        />
      </Tabs>
      </View>
    </HomeRefreshContext.Provider>
  );
} 
