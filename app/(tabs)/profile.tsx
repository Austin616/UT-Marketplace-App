import { View, Text, Image, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView, Pressable } from 'react-native';
import { useAuth } from '~/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';
import { COLORS } from '~/theme/colors';
import { useRouter } from 'expo-router';
import { Star, Settings2, User, Calendar, MapPin, Plus, Edit3, Eye, MessageCircle, Heart, FileText, Bell, ChevronRight } from 'lucide-react-native';
import { getTimeAgo } from '../../utils/timeago';
import UserRatingDisplay from '~/components/ui/UserRatingDisplay';

import Reanimated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSettings } from '~/contexts/SettingsContext';

interface UserSettings {
  display_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
}

interface Listing {
  id: string;
  title: string;
  price: number;
  description: string;
  images: string[];
  location: string;
  created_at: string;
  is_sold: boolean;
  status: 'pending' | 'approved' | 'denied';
  denial_reason?: string;
}

interface Rating {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  rater_id: string;
  rater_name: string;
}

// Profile Content Component (similar to HomeContent)
const ProfileContent = ({ profile }: { profile: UserSettings | null }) => {
  const router = useRouter();
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = profile?.display_name || (user?.email ? user.email.split('@')[0] : 'there');
    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 17) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  };

  return (
    <View className="px-6 pb-6 pt-4">
      {/* Profile Header */}
      <View className="items-center mb-6">
        <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
          {profile?.profile_image_url ? (
            <Image
              source={{ uri: profile.profile_image_url }}
              className="w-20 h-20 rounded-full"
              resizeMode="cover"
            />
          ) : (
            <User size={40} color="#9CA3AF" />
          )}
        </View>
        <Text className="text-2xl font-black text-gray-900 mb-1">
          {getGreeting()}
        </Text>
        <Text className="text-lg text-gray-600 font-medium">
          Manage your marketplace activity
        </Text>
      </View>

      {/* Quick Actions */}
      <View className="flex-row gap-3">
        <QuickActionCard 
          title="Create Listing"
          description="Sell something"
          icon={<Plus size={18} color="#BF5700" />}
          onPress={() => router.push('/create')}
        />
        <QuickActionCard 
          title="Edit Profile"
          description="Update info"
          icon={<Edit3 size={18} color="#BF5700" />}
          onPress={() => router.push('/(modals)/settings')}
        />
      </View>
    </View>
  );
};

// Quick Action Card Component (reused from home page)
const QuickActionCard = ({ title, description, icon, onPress }: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
}) => {
  const { hapticFeedbackEnabled } = useSettings();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    opacity.value = withSpring(0.8, { damping: 15, stiffness: 400 });
    if (hapticFeedbackEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    opacity.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <Reanimated.View style={[{ flex: 1 }, animatedStyle]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        className="bg-white rounded-lg p-4 border border-gray-200 flex-1"
        style={{
          shadowColor: '#BF5700',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View className="w-10 h-10 bg-orange-50 rounded-full items-center justify-center mb-3">
          {icon}
        </View>
        <Text className="text-gray-900 font-bold text-base mb-1">{title}</Text>
        <Text className="text-gray-500 text-sm font-medium">{description}</Text>
      </Pressable>
    </Reanimated.View>
  );
};

// Settings Item Component (similar to UT Dining)
const SettingsItem = ({ title, description, icon, onPress, showChevron = true }: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  onPress: () => void;
  showChevron?: boolean;
}) => {
  const { hapticFeedbackEnabled } = useSettings();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    opacity.value = withSpring(0.8, { damping: 15, stiffness: 400 });
    if (hapticFeedbackEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    opacity.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <Reanimated.View style={animatedStyle}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        className="flex-row items-center justify-between py-4 px-6 border-b border-gray-100"
      >
        <View className="flex-row items-center gap-4">
          <View className="w-10 h-10 bg-orange-50 rounded-full items-center justify-center">
            {icon}
          </View>
          <View>
            <Text className="font-bold text-base text-gray-900">{title}</Text>
            {description && (
              <Text className="text-sm text-gray-500 font-medium">{description}</Text>
            )}
          </View>
        </View>
        {showChevron && <ChevronRight size={16} color="#9CA3AF" />}
      </Pressable>
    </Reanimated.View>
  );
};

// Profile Stats Component with seller rating
const ProfileStatsSection = ({ activeListings, soldListings, ratings, avgRating }: {
  activeListings: number;
  soldListings: number;
  ratings: number;
  avgRating: string;
}) => {
  return (
    <View className="mb-8">
      <View className="px-6 mb-4">
        <Text className="text-2xl font-black text-gray-900 mb-1">Your Stats</Text>
        <Text className="text-gray-500 font-medium">Activity overview</Text>
      </View>
      
      <View className="bg-white rounded-lg mx-6 p-6 border border-gray-200"
        style={{
          shadowColor: '#BF5700',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View className="flex-row justify-around">
          <View className="items-center">
            <Text className="font-black text-2xl text-gray-900">{activeListings}</Text>
            <Text className="text-gray-500 text-sm font-medium">Active</Text>
          </View>
          <View className="items-center">
            <Text className="font-black text-2xl text-gray-900">{soldListings}</Text>
            <Text className="text-gray-500 text-sm font-medium">Sold</Text>
          </View>
          <View className="items-center">
            <Text className="font-black text-2xl text-gray-900">{ratings}</Text>
            <Text className="text-gray-500 text-sm font-medium">Reviews</Text>
          </View>
          <View className="items-center">
            <View className="flex-row items-center">
              <Star size={20} color="#BF5700" fill="#BF5700" />
              <Text className="font-black text-2xl text-gray-900 ml-1">{avgRating}</Text>
            </View>
            <Text className="text-gray-500 text-sm font-medium">Rating</Text>
          </View>
        </View>
      </View>
    </View>
  );
};


// Profile Menu Section (similar to UT Dining settings)
const ProfileMenuSection = () => {
  const router = useRouter();

  return (
    <View className="mb-8">
      <View className="px-6 mb-4">
        <Text className="text-2xl font-black text-gray-900 mb-1">Profile Menu</Text>
        <Text className="text-gray-500 font-medium">Manage your account</Text>
      </View>
      
      <View className="bg-white rounded-lg mx-6 border border-gray-200"
        style={{
          shadowColor: '#BF5700',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <SettingsItem
          title="My Listings"
          description="View and manage your items"
          icon={<FileText size={18} color="#BF5700" />}
          onPress={() => router.push('/my-listings')}
        />
        <SettingsItem
          title="Favorites"
          description="Items you've saved"
          icon={<Heart size={18} color="#BF5700" />}
          onPress={() => router.push('/favorites/favorite')}
        />
        <SettingsItem
          title="Watchlist"
          description="Items you're watching"
          icon={<Eye size={18} color="#BF5700" />}
          onPress={() => router.push('/favorites/watchlist')}
        />
        <SettingsItem
          title="Messages"
          description="Chat with buyers and sellers"
          icon={<MessageCircle size={18} color="#BF5700" />}
          onPress={() => router.push('/(tabs)/messages')}
        />
        <SettingsItem
          title="Reviews"
          description="See your ratings and feedback"
          icon={<Star size={18} color="#BF5700" />}
          onPress={() => router.push('/reviews')}
        />
        <SettingsItem
          title="Notifications"
          description="View your notification history"
          icon={<Bell size={18} color="#BF5700" />}
          onPress={() => router.push('/user-notifications')}
        />
        <SettingsItem
          title="Settings"
          description="Account and app preferences"
          icon={<Settings2 size={18} color="#BF5700" />}
          onPress={() => router.push('/(modals)/settings')}
          showChevron={true}
        />
      </View>
    </View>
  );
};

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserSettings | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!user?.id) return;

    try {
      // 1. Fetch profile
      const { data: userSettings } = await supabase
        .from('users')
        .select('display_name, profile_image_url, bio')
        .eq('id', user.id)
        .single();
      setProfile(userSettings);

      // 2. Fetch listings
      const { data: listingsData } = await supabase
        .from('listings')
        .select('id, title, price, description, images, location, created_at, is_sold, status, denial_reason')
        .eq('user_id', user.id)
        .eq('is_draft', false)
        .order('created_at', { ascending: false });
      setListings(listingsData || []);

      // 3. Fetch ratings
      const { data: ratingsData } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewed_id', user.id)
        .order('created_at', { ascending: false });
      
      // Get rater names for each rating
      const formattedRatings = [];
      if (ratingsData) {
        for (const rating of ratingsData) {
          const { data: raterData } = await supabase
            .from('users')
            .select('display_name')
            .eq('id', rating.reviewer_id)
            .single();
          
          formattedRatings.push({
            ...rating,
            rater_name: raterData?.display_name || 'Anonymous User'
          });
        }
      }
      
      setRatings(formattedRatings);
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (!user) {
    return (
      <View className="flex-1 bg-gray-50 px-4 justify-center">
        <View className="bg-white rounded-3xl p-8 shadow-sm">
          <View className="items-center mb-8">
            <View className="w-24 h-24 rounded-full items-center justify-center mb-4" style={{ backgroundColor: COLORS.utOrange }}>
              <User size={48} color="white" />
            </View>
            <Text className="text-3xl font-bold text-gray-900 text-center mb-2">
              Welcome to UT Marketplace
            </Text>
            <Text className="text-lg text-gray-600 text-center leading-relaxed">
              Sign in to manage your profile and listings
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={() => router.push('/login')}
            className="rounded-2xl py-4 px-6 shadow-sm"
            style={{ backgroundColor: COLORS.utOrange }}
            activeOpacity={0.8}
          >
            <Text className="text-white text-center font-semibold text-lg">
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.utOrange} />
        <Text className="text-gray-500 mt-4 text-lg">Loading profile...</Text>
      </View>
    );
  }

  // Compute stats - separate by status and sold state
  const activeListings = listings.filter(l => !l.is_sold && l.status === 'approved');
  const pendingListings = listings.filter(l => !l.is_sold && l.status === 'pending');
  const soldListings = listings.filter(l => l.is_sold);
  const avgRating = ratings.length
    ? (ratings.reduce((sum, r) => sum + Number(r.rating), 0) / ratings.length).toFixed(1)
    : 'N/A';

  const renderRatingItem = ({ item }: { item: Rating }) => (
    <View className="bg-gray-50 rounded-2xl p-5 mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <TouchableOpacity 
          className="flex-row items-center"
          onPress={() => router.push({
            pathname: '/profile/[userId]',
            params: { userId: item.rater_id }
          })}
          activeOpacity={0.8}
        >
          <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: COLORS.utOrange }}>
            <Text className="text-white font-bold text-lg">
              {item.rater_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text className="font-semibold text-gray-900 text-lg">{item.rater_name}</Text>
            <View className="flex-row items-center mt-1">
              <Calendar size={12} color="#6b7280" />
              <Text className="text-gray-500 text-xs ml-1">{getTimeAgo(item.created_at)}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View className="bg-white rounded-full px-3 py-1 border border-gray-200">
          <UserRatingDisplay 
            userId={item.rater_id} 
            rating={item.rating} 
          />
        </View>
      </View>
      {item.comment && (
        <Text className="text-gray-700 text-base leading-relaxed">{item.comment}</Text>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>      
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Content */}
        <ProfileContent profile={profile} />

        {/* Stats Section */}
        <ProfileStatsSection 
          activeListings={activeListings.length}
          soldListings={soldListings.length}
          ratings={ratings.length}
          avgRating={avgRating}
        />

        {/* Profile Menu */}
        <ProfileMenuSection />
      </ScrollView>
    </View>
  );
}
