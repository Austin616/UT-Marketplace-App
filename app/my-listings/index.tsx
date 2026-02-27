import { View, Text, FlatList, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { useAuth } from '~/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';
import { useRouter } from 'expo-router';
import { Plus, MapPin } from 'lucide-react-native';
import { COLORS } from '~/theme/colors';
import { getTimeAgo } from '../../utils/timeago';

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

export default function MyListingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchListings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, price, description, images, location, created_at, is_sold, status, denial_reason')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchListings();
    } else {
      setLoading(false);
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  };

  const getStatusMeta = (listing: Listing) => {
    if (listing.is_sold) return { label: 'Sold', color: '#6B7280' };
    if (listing.status === 'pending') return { label: 'Under review', color: '#D97706' };
    if (listing.status === 'denied') return { label: 'Needs updates', color: '#DC2626' };
    return { label: 'Live', color: '#16A34A' };
  };

  const renderItem = ({ item }: { item: Listing }) => {
    const statusMeta = getStatusMeta(item);

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
            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: statusMeta.color }} />
            <Text className="text-xs text-gray-500 ml-2">{statusMeta.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-4">
        <Text className="text-lg text-gray-600 text-center mb-4">
          Sign in to view your listings
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          className="px-6 py-3 rounded-xl"
          style={{ backgroundColor: COLORS.utOrange }}
        >
          <Text className="text-white font-medium">Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.utOrange} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900">My Listings</Text>
        <Text className="text-sm text-gray-500 mt-1">Total listings: {listings.length}</Text>
      </View>

      <View className="px-5 mt-2 mb-4">
        <TouchableOpacity
          onPress={() => router.push('/create')}
          className="flex-row items-center justify-center py-3.5 rounded-2xl"
          style={{ backgroundColor: COLORS.utOrange }}
        >
          <Plus size={18} color="white" />
          <Text className="text-white font-semibold ml-2">Create Listing</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={listings}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.utOrange}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-8">
            <Text className="text-gray-500 mb-4">You haven&apos;t created any listings yet</Text>
            <TouchableOpacity
              onPress={() => router.push('/create')}
              className="px-6 py-3 rounded-xl flex-row items-center"
              style={{ backgroundColor: COLORS.utOrange }}
            >
              <Plus size={20} color="white" />
              <Text className="text-white font-medium ml-2">Create Listing</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
} 
