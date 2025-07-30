import { View, Text, Image, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView, Alert } from 'react-native';
import { useAuth } from '~/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';
import { COLORS } from '~/theme/colors';
import { useRouter } from 'expo-router';
import { Star, CheckCircle2, Settings2, User, Calendar, MapPin, Plus, Edit3, Eye, BarChart3, MessageCircle, Heart, FileText, Bell } from 'lucide-react-native';
import { getTimeAgo } from '../../utils/timeago';
import { AnimatedButton } from '~/components/AnimatedButton';
import UserRatingDisplay from '~/components/UserRatingDisplay';
import { useNotificationSync } from '~/contexts/NotificationSyncContext';

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

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { unreadCount } = useNotificationSync();
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
    <ScrollView 
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View className="bg-white mx-4 mt-4 rounded-3xl p-8 shadow-sm">
        <View className="flex-row items-center justify-between mb-6">
          <View className="items-center flex-1">
            <View className="mb-4">
              {profile?.profile_image_url ? (
                <Image
                  source={{ uri: profile.profile_image_url }}
                  className="w-32 h-32 rounded-full bg-gray-100"
                />
              ) : (
                <View className="w-32 h-32 rounded-full items-center justify-center shadow-lg" style={{ backgroundColor: COLORS.utOrange }}>
                  <Text className="text-4xl font-bold text-white">
                    {(profile?.display_name || user.email)?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              {profile?.display_name || user.email}
            </Text>
            
            {profile?.bio && (
              <Text className="text-gray-600 text-center text-lg leading-relaxed max-w-sm">
                {profile.bio}
              </Text>
            )}
          </View>
          
          {/* Action buttons */}
          <View className="absolute top-0 right-0 flex-row gap-2">
            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              className="p-3 rounded-full bg-gray-100 relative"
            >
              <Bell size={24} color="#6b7280" />
              {unreadCount > 0 && (
                <View 
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
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
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(modals)/settings')}
              className="p-3 rounded-full bg-gray-100"
            >
              <Settings2 size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Rating Display */}
        <View className="items-center mb-4">
          <UserRatingDisplay userId={user.email} rating={avgRating !== 'N/A' ? parseFloat(avgRating) : null} />
        </View>

        {/* Stats Row */}
        <View className="flex-row justify-around py-6 bg-gray-50 rounded-2xl mb-6">
          <View className="items-center">
            <Text className="font-bold text-2xl text-gray-900">{activeListings.length}</Text>
            <View className="flex-row items-center mt-1">
              <FileText size={12} color="#6b7280" />
              <Text className="text-gray-500 text-sm font-medium ml-1">Active</Text>
            </View>
          </View>
          <View className="items-center">
            <Text className="font-bold text-2xl text-gray-900">{soldListings.length}</Text>
            <View className="flex-row items-center mt-1">
              <CheckCircle2 size={12} color="#6b7280" />
              <Text className="text-gray-500 text-sm font-medium ml-1">Sold</Text>
            </View>
          </View>
          <View className="items-center">
            <Text className="font-bold text-2xl text-gray-900">{ratings.length}</Text>
            <View className="flex-row items-center mt-1">
              <MessageCircle size={12} color="#6b7280" />
              <Text className="text-gray-500 text-sm font-medium ml-1">Reviews</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="flex-row gap-4 mb-6">
          <TouchableOpacity
            onPress={() => router.push('/create')}
            className="flex-1 rounded-2xl py-4 px-6 flex-row items-center justify-center shadow-sm"
            style={{ backgroundColor: COLORS.utOrange }}
            activeOpacity={0.8}
          >
            <Plus size={20} color="white" />
            <Text className="text-white font-semibold text-lg ml-2">Create </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => router.push('/(modals)/settings')}
            className="flex-1 bg-white rounded-2xl py-4 px-6 flex-row items-center justify-center"
            style={{ borderWidth: 2, borderColor: COLORS.utOrange }}
            activeOpacity={0.8}
          >
            <Edit3 size={20} color={COLORS.utOrange} />
            <Text className="font-semibold text-lg ml-2" style={{ color: COLORS.utOrange }}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Access Grid */}
      <View className="bg-white mx-4 mt-6 rounded-3xl p-6 shadow-sm">
        <Text className="text-2xl font-bold text-gray-900 mb-6">Quick Access</Text>
        <View className="flex-row flex-wrap gap-4">
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/my-listings')}
            className="bg-gray-50 rounded-2xl p-4 flex-1 min-w-[45%] items-center"
            activeOpacity={0.8}
          >
            <View className="w-12 h-12 rounded-full items-center justify-center mb-3" style={{ backgroundColor: COLORS.utOrange }}>
              <FileText size={24} color="white" />
            </View>
            <Text className="text-gray-900 font-semibold text-center">My Listings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.push('/favorites/favorite')}
            className="bg-gray-50 rounded-2xl p-4 flex-1 min-w-[45%] items-center"
            activeOpacity={0.8}
          >
            <View className="w-12 h-12 bg-red-500 rounded-full items-center justify-center mb-3">
              <Heart size={24} color="white" />
            </View>
            <Text className="text-gray-900 font-semibold text-center">Favorites</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.push('/favorites/watchlist')}
            className="bg-gray-50 rounded-2xl p-4 flex-1 min-w-[45%] items-center"
            activeOpacity={0.8}
          >
            <View className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center mb-3">
              <Eye size={24} color="white" />
            </View>
            <Text className="text-gray-900 font-semibold text-center">Watchlist</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/messages')}
            className="bg-gray-50 rounded-2xl p-4 flex-1 min-w-[45%] items-center"
            activeOpacity={0.8}
          >
            <View className="w-12 h-12 bg-green-500 rounded-full items-center justify-center mb-3">
              <MessageCircle size={24} color="white" />
            </View>
            <Text className="text-gray-900 font-semibold text-center">Messages</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Listings */}
      <View className="bg-white mx-4 mt-6 rounded-3xl shadow-sm overflow-hidden">
        <View className="flex-row justify-between items-center px-6 py-5 border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-900">Active Listings</Text>
          <View className="rounded-full px-3 py-1" style={{ backgroundColor: COLORS.utOrange }}>
            <Text className="text-white font-semibold text-sm">{activeListings.length}</Text>
          </View>
        </View>

        {activeListings.length > 0 ? (
          <FlatList
            data={activeListings}
            renderItem={renderListingItem}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20 }}
          />
        ) : (
          <View className="px-6 py-12">
            <Text className="text-gray-400 text-center text-lg mb-2">No active listings</Text>
            <TouchableOpacity 
              onPress={() => router.push('/create')}
              className="mt-2"
            >
              <Text style={{ color: COLORS.utOrange }} className="text-center font-semibold">Create your first listing →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Sold Listings */}
      <View className="bg-white mx-4 mt-6 rounded-3xl shadow-sm overflow-hidden">
        <View className="flex-row justify-between items-center px-6 py-5 border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-900">Sold Listings</Text>
          <View className="bg-green-500 rounded-full px-3 py-1">
            <Text className="text-white font-semibold text-sm">{soldListings.length}</Text>
          </View>
        </View>

        {soldListings.length > 0 ? (
          <FlatList
            data={soldListings}
            renderItem={renderListingItem}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20 }}
          />
        ) : (
          <View className="px-6 py-12">
            <Text className="text-gray-400 text-center text-lg">No sold listings</Text>
          </View>
        )}
      </View>

      {/* Reviews */}
      <View className="bg-white mx-4 mt-6 mb-6 rounded-3xl shadow-sm overflow-hidden">
        <View className="flex-row justify-between items-center px-6 py-5 border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-900">Reviews</Text>
          <View className="bg-yellow-500 rounded-full px-3 py-1">
            <Text className="text-white font-semibold text-sm">{ratings.length}</Text>
          </View>
        </View>

        <View className="px-6 pb-20">
          {ratings.length > 0 ? (
            <FlatList
              data={ratings}
              renderItem={renderRatingItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 20 }}
            />
          ) : (
            <View className="py-12">
              <Text className="text-gray-400 text-center text-lg">No reviews yet</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}