import { View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '~/theme/colors';
import { useAuth } from '~/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';
import { MapPin, CheckCircle2, Plus } from 'lucide-react-native';
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
}

export default function CreateScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchListings = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.email)
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
    fetchListings();
  };

  const renderListingItem = ({ item }: { item: Listing }) => (
    <TouchableOpacity 
      className="flex-row bg-white p-4 mb-2 rounded-xl shadow-sm"
      onPress={() => router.push({
        pathname: '/listing/[id]',
        params: { id: item.id }
      })}
    >
      <Image
        source={{ uri: item.images?.[0] || 'https://picsum.photos/200' }}
        className="w-20 h-20 rounded-lg"
        resizeMode="cover"
      />
      <View className="flex-1 ml-4">
        <Text className="text-lg font-medium text-gray-900" numberOfLines={2}>{item.title}</Text>
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
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Create Section */}
          <View className="bg-white mx-4 mt-4 rounded-3xl p-8 shadow-sm">
            <View className="items-center mb-8">
              <MaterialIcons name="add-box" size={64} color={COLORS.utOrange} />
              <Text className="text-2xl font-semibold mt-4">Create a Listing</Text>
              <Text className="text-gray-500 text-center mt-2">
                Add photos and details about what you&apos;re selling
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/create/photos')}
              className="w-full flex-row items-center justify-center py-3.5 rounded-xl"
              style={{ backgroundColor: COLORS.utOrange }}
            >
              <MaterialIcons name="add-photo-alternate" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
              <Text className="text-white font-medium">Start with Photos</Text>
            </TouchableOpacity>
          </View>

          {/* My Listings Section */}
          {user && (
            <View className="bg-white mx-4 mt-6 mb-6 rounded-3xl shadow-sm overflow-hidden pb-16">
              <View className="flex-row justify-between items-center px-6 py-5 border-b border-gray-100">
                <Text className="text-2xl font-bold text-gray-900">My Listings</Text>
                <TouchableOpacity 
                  onPress={() => router.push('/(tabs)/my-listings')}
                  className="flex-row items-center"
                >
                  <View className="rounded-full px-3 py-1 mr-2" style={{ backgroundColor: COLORS.utOrange }}>
                    <Text className="text-white font-semibold text-sm">{listings.length}</Text>
                  </View>
                  <Text style={{ color: COLORS.utOrange }} className="font-semibold">View All</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View className="px-6 py-12 items-center">
                  <ActivityIndicator size="large" color={COLORS.utOrange} />
                  <Text className="text-gray-500 mt-4 text-lg">Loading listings...</Text>
                </View>
              ) : listings.length > 0 ? (
                <View className="px-6 py-4">
                  <FlatList
                    data={listings.slice(0, 5)}
                    renderItem={renderListingItem}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                  />
                  {listings.length > 5 && (
                    <TouchableOpacity 
                      onPress={() => router.push('/(tabs)/my-listings')}
                      className="bg-gray-50 rounded-xl p-4 mt-2 flex-row items-center justify-center"
                    >
                      <Plus size={20} color={COLORS.utOrange} />
                      <Text style={{ color: COLORS.utOrange }} className="font-semibold ml-2">
                        View {listings.length - 5} more listings
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View className="px-6 py-12">
                  <Text className="text-gray-400 text-center text-lg mb-2">No listings yet</Text>
                  <TouchableOpacity 
                    onPress={() => router.push('/create/photos')}
                    className="mt-2"
                  >
                    <Text style={{ color: COLORS.utOrange }} className="text-center font-semibold">Create your first listing →</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}