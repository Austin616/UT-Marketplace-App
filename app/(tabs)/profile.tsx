import { View, Text, Image, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView, Alert, Pressable } from 'react-native';
import { useAuth } from '~/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';
import { COLORS } from '~/theme/colors';
import { useRouter } from 'expo-router';
import { Star, CheckCircle2, Settings2, User, Calendar, MapPin, Plus, Edit3, Eye, BarChart3, MessageCircle, Heart, FileText, Bell, ChevronRight } from 'lucide-react-native';
import { getTimeAgo } from '../../utils/timeago';
import UserRatingDisplay from '~/components/UserRatingDisplay';
import { useNotificationSync } from '~/contexts/NotificationSyncContext';
import { ViewAllCard } from '~/components/ViewAllCard';
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
const ProfileContent = () => {
  const router = useRouter();
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.email?.split('@')[0] || 'there';
    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 17) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  };

  return (
    <View className="px-6 pb-6 pt-6">
      {/* Greeting */}
      <View className="mb-6">
        <Text className="text-3xl font-black text-gray-900 mb-1">
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

// Quick Listings Preview Component
const QuickListingsPreview = ({ activeListings, soldListings }: {
  activeListings: Listing[];
  soldListings: Listing[];
}) => {
  const router = useRouter();
  const { locationEnabled } = useSettings();

  const ListingCard = ({ listing, isSold = false }: { listing: Listing; isSold?: boolean }) => {
    const { hapticFeedbackEnabled } = useSettings();
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

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
      <Reanimated.View style={[{ marginRight: 16, width: 160, height: 220 }, animatedStyle]}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => router.push({
            pathname: '/listing/[id]',
            params: { id: listing.id }
          })}
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: '#BF5700',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
            borderWidth: 1,
            borderColor: 'rgba(191, 87, 0, 0.1)',
            height: 220,
          }}
        >
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: listing.images?.[0] || 'https://picsum.photos/200' }}
              style={{ 
                width: '100%', 
                height: 120,
                ...(isSold && {
                  opacity: 0.4,
                })
              }}
              resizeMode="cover"
              blurRadius={isSold ? 2 : 0}
            />
            <View style={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: 12,
              padding: 4,
            }}>
              <Heart size={14} color="#ef4444" />
            </View>
            {isSold && (
              <View className="absolute inset-0 items-center justify-center">
                <View className="bg-red-500 px-3 py-2 rounded-lg">
                  <Text className="text-white text-sm font-bold">SOLD</Text>
                </View>
              </View>
            )}
          </View>
          <View className="p-4">
            <Text className="font-bold text-gray-900 text-base mb-2" numberOfLines={2}>
              {listing.title}
            </Text>
            <Text style={{ color: COLORS.utOrange, fontWeight: '800', fontSize: 16 }}>
              ${listing.price}
            </Text>
            {locationEnabled && (
              <View className="flex-row items-center mt-2">
                <MapPin size={12} color="#9ca3af" />
                <Text className="text-gray-500 text-xs ml-1" numberOfLines={1}>{listing.location}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </Reanimated.View>
    );
  };

  return (
    <View className="mb-8">
      {/* Active Listings */}
      {activeListings.length > 0 && (
        <View className="mb-6">
          <View className="px-6 mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-black text-gray-900 mb-1">Your Active Listings</Text>
              <Text className="text-gray-500 font-medium">Currently available</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/my-listings')}
              className="px-3 py-1 bg-orange-50 rounded-full"
            >
              <Text className="text-sm font-bold" style={{ color: COLORS.utOrange }}>
                View All
              </Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 24, paddingRight: 24 }}
          >
            {activeListings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Sold Listings */}
      {soldListings.length > 0 && (
        <View className="mb-6">
          <View className="px-6 mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-black text-gray-900 mb-1">Recently Sold</Text>
              <Text className="text-gray-500 font-medium">Your successful sales</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/my-listings')}
              className="px-3 py-1 bg-orange-50 rounded-full"
            >
              <Text className="text-sm font-bold" style={{ color: COLORS.utOrange }}>
                View All
              </Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 24, paddingRight: 24 }}
          >
            {soldListings.map(listing => (
              <ListingCard key={listing.id} listing={listing} isSold />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Empty State */}
      {activeListings.length === 0 && soldListings.length === 0 && (
        <View className="px-6">
          <View className="bg-white rounded-lg p-8 items-center border border-gray-200"
            style={{
              shadowColor: '#BF5700',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Text className="text-6xl mb-4">📦</Text>
            <Text className="text-gray-700 text-center font-bold text-lg mb-2">No listings yet</Text>
            <Text className="text-gray-500 text-center font-medium mb-4">Start selling to see your items here</Text>
            <TouchableOpacity
              onPress={() => router.push('/create')}
              className="px-4 py-2 rounded-lg"
              style={{ backgroundColor: COLORS.utOrange }}
            >
              <Text className="text-white font-bold">Create Listing</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    if (!user?.email) return;

    try {
      // 1. Fetch profile
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('display_name, profile_image_url, bio')
        .eq('email', user.email)
        .single();
      setProfile(userSettings);

      // 2. Fetch listings
      const { data: listingsData } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.email)
        .eq('is_draft', false)
        .order('created_at', { ascending: false });
      setListings(listingsData || []);

      // 3. Fetch ratings
      const { data: ratingsData } = await supabase
        .from('ratings')
        .select('*')
        .eq('rated_id', user.email)
        .order('created_at', { ascending: false });
      
      // Get rater names for each rating
      const formattedRatings = [];
      if (ratingsData) {
        for (const rating of ratingsData) {
          const { data: raterData } = await supabase
            .from('user_settings')
            .select('display_name')
            .eq('email', rating.rater_id)
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

  // Compute stats
  const soldListings = listings.filter(l => l.is_sold);
  const activeListings = listings.filter(l => !l.is_sold);
  const avgRating = ratings.length
    ? (ratings.reduce((sum, r) => sum + Number(r.rating), 0) / ratings.length).toFixed(1)
    : 'N/A';

  const renderListingItem = ({ item }: { item: Listing }) => (
    <TouchableOpacity 
      className="mr-4"
      onPress={() => router.push({
        pathname: '/listing/[id]',
        params: { id: item.id }
      })}
    >
      <View className="w-40 bg-white rounded-lg overflow-hidden shadow-sm">
        <Image
          source={{ uri: item.images?.[0] || 'https://picsum.photos/200' }}
          className="w-full h-40"
          resizeMode="cover"
        />
        <View className="p-2">
          <Text className="font-medium text-gray-900" numberOfLines={2}>{item.title}</Text>
          <Text style={{ color: COLORS.utOrange, fontWeight: 'bold' }}>${item.price}</Text>
          <View className="flex-row items-center mt-1">
            <MapPin size={12} color="#6b7280" />
            <Text className="text-gray-500 text-xs ml-1">{item.location}</Text>
          </View>
          <Text className="text-gray-500 text-xs">{getTimeAgo(item.created_at)}</Text>
          {item.is_sold && (
            <View className="flex-row items-center mt-1">
              <CheckCircle2 size={14} color="#ef4444" />
              <Text className="text-red-500 text-sm ml-1">Sold</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

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
        <ProfileContent />

        {/* Stats Section */}
        <ProfileStatsSection 
          activeListings={activeListings.length}
          soldListings={soldListings.length}
          ratings={ratings.length}
          avgRating={avgRating}
        />

        {/* Quick Listings Preview */}
        <QuickListingsPreview 
          activeListings={activeListings.slice(0, 3)}
          soldListings={soldListings.slice(0, 3)}
        />

        {/* Profile Menu */}
        <ProfileMenuSection />
      </ScrollView>
    </View>
  );
}