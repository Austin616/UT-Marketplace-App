import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';
import { COLORS } from '~/theme/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '~/contexts/AuthContext';
import {
  Star,
  CheckCircle2,
  MessageCircle,
  Calendar,
  MapPin,
  User,
  FileText,
} from 'lucide-react-native';
import { getTimeAgo } from '../../utils/timeago';
import AppHeader from '~/components/layout/AppHeader';
import { RatingSubmissionModal } from '~/components/modals/RatingSubmissionModal';
import UserRatingDisplay from '~/components/ui/UserRatingDisplay';

interface UserSettings {
  id: string;
  email: string;
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

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserSettings | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const fetchData = async () => {
    if (!userId) return;

    try {
      // 1. Fetch profile
      const { data: userSettings } = await supabase
        .from('users')
        .select('id, email, display_name, profile_image_url, bio')
        .eq('id', userId)
        .single();

      if (!userSettings) {
        Alert.alert('Error', 'User not found');
        router.back();
        return;
      }

      setProfile(userSettings);

      // 2. Fetch listings (only non-draft, active listings)
      const { data: listingsData } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', userId)
        .eq('is_draft', false)
        .order('created_at', { ascending: false });
      setListings(listingsData || []);

      // 3. Fetch ratings
      const { data: ratingsData } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewed_id', userId)
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
            rater_name: raterData?.display_name || 'Anonymous User',
          });
        }
      }

      setRatings(formattedRatings);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleMessageUser = () => {
    if (!user?.email) {
      router.push('/(auth)/login');
      return;
    }

    if (user.id === profile?.id) {
      Alert.alert('Cannot Message', 'You cannot message yourself.');
      return;
    }

    // Navigate to chat with this user
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: `${profile?.id}:general`,
        otherUserName: profile?.email ? profile.email.split('@')[0] : 'User',
        otherUserId: profile?.id || '',
        listingId: 'general',
        listingTitle: 'General Chat',
      },
    });
  };

  const handleRateUser = () => {
    if (!user?.email) {
      router.push('/(auth)/login');
      return;
    }

    if (user.id === profile?.id) {
      Alert.alert('Cannot Rate', 'You cannot rate yourself.');
      return;
    }

    setShowRatingModal(true);
  };

  const handleRatingSubmitted = () => {
    // Refresh the ratings after submission
    fetchData();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.utOrange} />
          <Text className="mt-4 text-gray-500">Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <Text className="text-center text-gray-500">Profile not found</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 rounded-xl px-6 py-3"
            style={{ backgroundColor: COLORS.utOrange }}>
            <Text className="font-medium text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Compute stats
  const soldListings = listings.filter((l) => l.is_sold);
  const activeListings = listings.filter((l) => !l.is_sold);
  const avgRating = ratings.length
    ? (ratings.reduce((sum, r) => sum + Number(r.rating), 0) / ratings.length).toFixed(1)
    : 'N/A';
  const headerTitle =
    profile.display_name || (profile.email ? profile.email.split('@')[0] : 'Profile');

  const renderListingItem = ({ item }: { item: Listing }) => (
    <TouchableOpacity
      className="mr-4"
      onPress={() =>
        router.push({
          pathname: '/listing/[id]',
          params: { id: item.id },
        })
      }>
      <View className="w-40 overflow-hidden rounded-lg bg-white shadow-sm">
        <Image
          source={{ uri: item.images?.[0] || 'https://picsum.photos/200' }}
          className="h-40 w-full"
          resizeMode="cover"
        />
        <View className="p-2">
          <Text className="font-medium text-gray-900" numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={{ color: COLORS.utOrange, fontWeight: 'bold' }}>${item.price}</Text>
          <View className="mt-1 flex-row items-center">
            <MapPin size={12} color="#6b7280" />
            <Text className="ml-1 text-xs text-gray-500">{item.location}</Text>
          </View>
          <Text className="text-xs text-gray-500">{getTimeAgo(item.created_at)}</Text>
          {item.is_sold && (
            <View className="mt-1 flex-row items-center">
              <CheckCircle2 size={14} color="#ef4444" />
              <Text className="ml-1 text-sm text-red-500">Sold</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRatingItem = ({ item }: { item: Rating }) => (
    <View className="py-3 border-b border-gray-100">
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          className="flex-row items-center flex-1"
          onPress={() =>
            router.push({
              pathname: '/profile/[userId]',
              params: { userId: item.rater_id },
            })
          }
          activeOpacity={0.8}
        >
          <View
            className="mr-3 h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: COLORS.utOrange }}
          >
            <Text className="text-sm font-bold text-white">
              {item.rater_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
              {item.rater_name}
            </Text>
            <View className="mt-1 flex-row items-center">
              <Calendar size={12} color="#9CA3AF" />
              <Text className="ml-1 text-xs text-gray-500">{getTimeAgo(item.created_at)}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View className="flex-row items-center">
          <View className="flex-row items-center rounded-full bg-yellow-50 px-2 py-1">
            <Star size={12} color="#F59E0B" fill="#F59E0B" />
            <Text className="text-xs font-semibold text-yellow-700 ml-1">
              {item.rating.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>
      {item.comment && (
        <Text className="mt-2 text-sm leading-relaxed text-gray-700">{item.comment}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      {/* Header */}
      <AppHeader variant="standard" title={headerTitle} showBackButton />

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View className="mx-4 mt-4 rounded-3xl bg-white p-8 shadow-sm">
          <View className="mb-6 items-center">
            <View className="mb-4">
              {profile.profile_image_url ? (
                <Image
                  source={{ uri: profile.profile_image_url }}
                  className="h-32 w-32 rounded-full bg-gray-100"
                />
              ) : (
                <View
                  className="h-32 w-32 items-center justify-center rounded-full shadow-lg"
                  style={{ backgroundColor: COLORS.utOrange }}>
                  <Text className="text-4xl font-bold text-white">
                    {profile?.email ? profile.email.split('@')[0].charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
            </View>

            <Text className="mb-2 text-3xl font-bold text-gray-900">
              {profile?.email ? profile.email.split('@')[0] : 'User'}
            </Text>

            {profile.bio && (
              <Text className="max-w-sm text-center text-lg leading-relaxed text-gray-600">
                {profile.bio}
              </Text>
            )}
          </View>

          {/* Rating Display */}
          <View className="mb-4 items-center">
            <UserRatingDisplay
              userId={userId as string}
              rating={avgRating !== 'N/A' ? parseFloat(avgRating) : null}
            />
          </View>

          {/* Stats Row */}
          <View className="mb-6 flex-row justify-around rounded-2xl bg-gray-50 py-6">
            <View className="items-center">
              <Text className="text-2xl font-bold text-gray-900">{activeListings.length}</Text>
              <View className="mt-1 flex-row items-center">
                <FileText size={12} color="#6b7280" />
                <Text className="ml-1 text-sm font-medium text-gray-500">Active</Text>
              </View>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-gray-900">{soldListings.length}</Text>
              <View className="mt-1 flex-row items-center">
                <CheckCircle2 size={12} color="#6b7280" />
                <Text className="ml-1 text-sm font-medium text-gray-500">Sold</Text>
              </View>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-gray-900">{ratings.length}</Text>
              <View className="mt-1 flex-row items-center">
                <MessageCircle size={12} color="#6b7280" />
                <Text className="ml-1 text-sm font-medium text-gray-500">Reviews</Text>
              </View>
            </View>
          </View>

          {/* Rating Modal */}
          <RatingSubmissionModal
            visible={showRatingModal}
            onClose={() => setShowRatingModal(false)}
            ratedUserId={profile?.id || ''}
            ratedUserName={profile?.email ? profile.email.split('@')[0] : 'User'}
            onRatingSubmitted={handleRatingSubmitted}
          />

          {/* Action Buttons */}
          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={handleMessageUser}
              className="flex-1 flex-row items-center justify-center rounded-2xl px-6 py-4 shadow-sm"
              style={{ backgroundColor: COLORS.utOrange }}
              activeOpacity={0.8}>
              <MessageCircle size={20} color="white" />
              <Text className="ml-2 text-lg font-semibold text-white">Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRateUser}
              className="flex-1 flex-row items-center justify-center rounded-2xl bg-white px-6 py-4"
              style={{ borderWidth: 2, borderColor: COLORS.utOrange }}
              activeOpacity={0.8}>
              <Star size={20} color={COLORS.utOrange} />
              <Text className="ml-2 text-lg font-semibold" style={{ color: COLORS.utOrange }}>
                Rate
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Listings */}
        <View className="mx-4 mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
          <View className="flex-row items-center justify-between border-b border-gray-100 px-6 py-5">
            <Text className="text-2xl font-bold text-gray-900">Active Listings</Text>
            <View className="rounded-full px-3 py-1" style={{ backgroundColor: COLORS.utOrange }}>
              <Text className="text-sm font-semibold text-white">{activeListings.length}</Text>
            </View>
          </View>

          {activeListings.length > 0 ? (
            <FlatList
              data={activeListings}
              renderItem={renderListingItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20 }}
            />
          ) : (
            <View className="px-6 py-12">
              <Text className="text-center text-lg text-gray-400">No active listings</Text>
            </View>
          )}
        </View>

        {/* Sold Listings */}
        <View className="mx-4 mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
          <View className="flex-row items-center justify-between border-b border-gray-100 px-6 py-5">
            <Text className="text-2xl font-bold text-gray-900">Sold Listings</Text>
            <View className="rounded-full bg-green-500 px-3 py-1">
              <Text className="text-sm font-semibold text-white">{soldListings.length}</Text>
            </View>
          </View>

          {soldListings.length > 0 ? (
            <FlatList
              data={soldListings}
              renderItem={renderListingItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20 }}
            />
          ) : (
            <View className="px-6 py-12">
              <Text className="text-center text-lg text-gray-400">No sold listings</Text>
            </View>
          )}
        </View>

        {/* Reviews */}
        <View className="mx-4 mb-6 mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
          <View className="flex-row items-center justify-between border-b border-gray-100 px-6 py-5">
            <Text className="text-2xl font-bold text-gray-900">Reviews</Text>
            <View className="rounded-full bg-yellow-500 px-3 py-1">
              <Text className="text-sm font-semibold text-white">{ratings.length}</Text>
            </View>
          </View>

          <View className="px-6">
            {ratings.length > 0 ? (
              <FlatList
                data={ratings}
                renderItem={renderRatingItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 20 }}
              />
            ) : (
              <View className="py-12">
                <Text className="text-center text-lg text-gray-400">No reviews yet</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
