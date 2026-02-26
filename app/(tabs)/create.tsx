import { View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '~/theme/colors';
import { useAuth } from '~/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';
import { 
  MapPin, 
  CheckCircle2, 
  Plus, 
  Tag, 
  Users
} from 'lucide-react-native';
import { getTimeAgo } from '../../utils/timeago';
import { useSettings } from '~/contexts/SettingsContext';
import * as Haptics from 'expo-haptics';

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

export default function CreateScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { hapticFeedbackEnabled } = useSettings();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchListings = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, price, description, images, location, created_at, is_sold, status, denial_reason')
        .eq('user_id', user.id)
        .eq('is_draft', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchListings();
    } else {
      setLoading(false);
    }
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    if (hapticFeedbackEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    fetchListings();
  };

  const handleCreatePress = () => {
    if (hapticFeedbackEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/create/photos');
  };


  const renderListingStatus = (status?: Listing['status']) => {
    if (status === 'denied') {
      return { label: 'Needs updates', color: '#DC2626' };
    }
    if (status === 'pending') {
      return { label: 'Under review', color: '#D97706' };
    }
    return { label: 'Live', color: '#16A34A' };
  };

  const renderListingItem = ({ item }: { item: Listing }) => {
    const statusMeta = renderListingStatus(item.status);

    return (
      <TouchableOpacity
        className="flex-row items-center py-2.5 border-b border-gray-100"
        onPress={() => router.push({
          pathname: '/listing/[id]',
          params: { id: item.id }
        })}
      >
        <Image
          source={{ uri: item.images?.[0] || 'https://picsum.photos/200' }}
          className="w-12 h-12 rounded-lg"
          resizeMode="cover"
        />
        <View className="flex-1 ml-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900 flex-1" numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={{ color: COLORS.utOrange }} className="text-sm font-semibold ml-2">
              ${item.price}
            </Text>
          </View>
          <View className="flex-row items-center mt-1">
            <MapPin size={12} color="#9CA3AF" />
            <Text className="text-xs text-gray-500 ml-1">{item.location}</Text>
            <Text className="text-xs text-gray-400 ml-2">• {getTimeAgo(item.created_at)}</Text>
          </View>
          <View className="flex-row items-center mt-1">
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusMeta.color }}
            />
            <Text className="text-xs text-gray-500 ml-2">{statusMeta.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.utOrange} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Helper Text */}
        <View className="px-5 pt-3 pb-1">
          <Text className="text-sm text-gray-500">Create a listing in a few steps</Text>
        </View>

        {/* Primary Action */}
        <View className="px-5 mt-3">
          {user ? (
            <TouchableOpacity
              onPress={handleCreatePress}
              className="flex-row items-center justify-center py-4 rounded-2xl"
              style={{ backgroundColor: COLORS.utOrange }}
            >
              <Plus size={20} color="white" />
              <Text className="font-semibold text-base ml-2 text-white">
                Start Selling
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              className="flex-row items-center justify-center py-4 rounded-2xl"
              style={{ backgroundColor: COLORS.utOrange }}
            >
              <Users size={20} color="white" />
              <Text className="font-semibold text-base ml-2 text-white">
                Sign In to Continue
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* My Listings */}
        {user && (
          <View className="px-5 mt-6 pb-8">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base font-semibold text-gray-900">My Listings</Text>
            </View>

            {loading ? (
              <View className="py-10 items-center">
                <ActivityIndicator size="large" color={COLORS.utOrange} />
                <Text className="text-gray-500 mt-3 text-sm">Loading your listings...</Text>
              </View>
            ) : listings.length > 0 ? (
              <View>
                <FlatList
                  data={listings.slice(0, 5)}
                  renderItem={renderListingItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
                {listings.length > 5 && (
                  <TouchableOpacity
                    onPress={() => {
                      if (hapticFeedbackEnabled) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      router.push('/my-listings');
                    }}
                    className="mt-2"
                  >
                    <Text className="text-sm font-semibold text-gray-500">
                      View {listings.length - 5} more
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View className="py-10 items-center">
                <Text className="text-gray-500 text-base font-medium mb-2">No listings yet</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (hapticFeedbackEnabled) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    router.push('/create/photos');
                  }}
                  className="flex-row items-center px-4 py-2 rounded-xl border"
                  style={{ borderColor: COLORS.utOrange }}
                >
                  <Plus size={16} color={COLORS.utOrange} />
                  <Text style={{ color: COLORS.utOrange }} className="font-semibold ml-2 text-sm">
                    Create your first listing
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
