import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl, Alert, FlatList, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '~/theme/colors';
import { Heart, Eye, Star, MapPin, Calendar, Trash2, MessageCircle } from 'lucide-react-native';
import { getTimeAgo } from '~/utils/timeago';
import { supabase } from '~/lib/supabase';
import { useAuth } from '~/contexts/AuthContext';
import { AnimatedButton } from '~/components/AnimatedButton';

interface Listing {
  id: string;
  title: string;
  price: number;
  description: string;
  images: string[];
  location: string;
  category: string;
  condition: string;
  created_at: string;
  user_id: string;
  user_name: string;
  is_sold: boolean;
  is_draft: boolean;
}

interface FavoriteItem {
  id: string;
  listing_id: string;
  type: 'favorite' | 'watchlist';
  created_at: string;
  listing: Listing;
}

export default function FavoritesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { type = 'favorite' } = useLocalSearchParams();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isWatchlist = type === 'watchlist';
  const title = isWatchlist ? 'Watchlist' : 'Favorites';
  const emptyIcon = isWatchlist ? Eye : Heart;
  const emptyMessage = isWatchlist ? 'No items in your watchlist' : 'No favorite listings yet';
  const emptyDescription = isWatchlist 
    ? 'Items you\'re watching will appear here' 
    : 'Listings you favorite will appear here';

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user, type]);

  const fetchFavorites = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          id,
          listing_id,
          type,
          created_at,
          listing:listings (
            id,
            title,
            price,
            description,
            images,
            location,
            category,
            condition,
            created_at,
            user_id,
            user_name,
            is_sold,
            is_draft
          )
        `)
        .eq('user_id', user.email)
        .eq('type', type)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out items where listing is null (listing might have been deleted)
      const validItems = (data || []).filter(item => item.listing) as unknown as FavoriteItem[];
      setItems(validItems);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      Alert.alert('Error', 'Failed to load your ' + (isWatchlist ? 'watchlist' : 'favorites'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const handleRemoveItem = async (itemId: string, listingTitle: string) => {
    Alert.alert(
      `Remove from ${title}`,
      `Remove "${listingTitle}" from your ${title.toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_favorites')
                .delete()
                .eq('id', itemId);

              if (error) throw error;

              setItems(prev => prev.filter(item => item.id !== itemId));
            } catch (error) {
              console.error('Error removing item:', error);
              Alert.alert('Error', 'Failed to remove item');
            }
          }
        }
      ]
    );
  };

  const handleListingPress = (listing: Listing) => {
    // Navigate back to the main app first, then go to the listing
    router.back();
    setTimeout(() => {
      router.push({
        pathname: '/listing/[id]',
        params: { id: listing.id }
      });
    }, 100); // Small delay to ensure back navigation completes
  };

  const isValidUUID = (id: string) => typeof id === 'string' && /^[0-9a-fA-F-]{36}$/.test(id);

  const handleMessageSeller = (listing: Listing) => {
    if (!user?.email) {
      router.back();
      setTimeout(() => {
        router.push('/(auth)/login');
      }, 100);
      return;
    }
    
    if (user.email === listing.user_id) {
      Alert.alert('Cannot Message', 'You cannot message yourself about your own listing.');
      return;
    }

    router.back();
    setTimeout(() => {
      router.push({
        pathname: '/chat/[id]',
        params: { id: isValidUUID(listing.id) ? listing.id : 'general' }
      });
    }, 100);
  };

  const renderListingItem = ({ item }: { item: FavoriteItem }) => {
    const listing = item.listing;
    
    return (
      <TouchableOpacity
        onPress={() => handleListingPress(listing)}
        className="mb-4"
      >
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Image */}
          <View className="relative">
            <Image
              source={{ uri: listing.images?.[0] || 'https://picsum.photos/300/200' }}
              className="w-full h-48"
              resizeMode="cover"
            />
            {listing.is_sold && (
              <View className="absolute top-3 left-3 bg-red-500 px-2 py-1 rounded-full">
                <Text className="text-white font-bold text-xs">SOLD</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => handleRemoveItem(item.id, listing.title)}
              className="absolute top-3 right-3 bg-white/90 rounded-full p-2"
            >
              <Trash2 size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="p-4">
            <View className="flex-row items-start justify-between mb-2">
              <Text className="text-lg font-bold text-gray-900 flex-1 mr-2" numberOfLines={2}>
                {listing.title}
              </Text>
              <Text className="text-xl font-bold" style={{ color: COLORS.utOrange }}>
                ${listing.price}
              </Text>
            </View>

            <View className="flex-row items-center flex-wrap gap-3 mb-3">
              <View className="flex-row items-center">
                <MapPin size={14} color="#6b7280" />
                <Text className="text-gray-600 text-sm ml-1">{listing.location}</Text>
              </View>
              <View className="flex-row items-center">
                <Calendar size={14} color="#6b7280" />
                <Text className="text-gray-600 text-sm ml-1">{getTimeAgo(listing.created_at)}</Text>
              </View>
              <View className="bg-gray-100 px-2 py-1 rounded-full">
                <Text className="text-gray-700 text-xs font-medium">{listing.condition}</Text>
              </View>
            </View>

            {listing.description && (
              <Text className="text-gray-700 text-sm mb-3" numberOfLines={2}>
                {listing.description}
              </Text>
            )}

            {/* Action Buttons */}
            <View className="flex-row gap-2">
              <AnimatedButton
                onPress={() => handleListingPress(listing)}
                hapticType="light"
                scaleValue={0.97}
                style={{
                  borderColor: COLORS.utOrange,
                  borderWidth: 2,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: 'white',
                  flex: 1,
                }}
              >
                <Eye size={16} color={COLORS.utOrange} />
                <Text className="font-semibold text-sm ml-1" style={{ color: COLORS.utOrange }}>
                  View
                </Text>
              </AnimatedButton>

              {!listing.is_sold && user?.email !== listing.user_id && (
                <AnimatedButton
                  onPress={() => handleMessageSeller(listing)}
                  hapticType="medium"
                  scaleValue={0.97}
                  style={{
                    backgroundColor: COLORS.utOrange,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    flex: 1,
                  }}
                >
                  <MessageCircle size={16} color="white" />
                  <Text className="text-white font-semibold text-sm ml-1">Message</Text>
                </AnimatedButton>
              )}
            </View>

            {/* Added to favorites/watchlist date */}
            <View className="mt-3 pt-3 border-t border-gray-100">
              <Text className="text-xs text-gray-500">
                Added to {isWatchlist ? 'watchlist' : 'favorites'} {getTimeAgo(item.created_at)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen 
        options={{ 
          title: title,
          headerShown: true,
          headerStyle: { backgroundColor: 'white' },
          headerTitleStyle: { color: '#1f2937', fontWeight: 'bold' },
          headerTintColor: COLORS.utOrange,
        }} 
      />
      
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.utOrange} />
          <Text className="text-gray-500 mt-4">Loading {title.toLowerCase()}...</Text>
        </View>
      ) : items.length > 0 ? (
        <FlatList
          data={items}
          renderItem={renderListingItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ flex: 1 }}
        >
          <View className="flex-1 items-center justify-center px-8">
            <View className="bg-gray-100 rounded-full p-8 mb-6">
              {React.createElement(emptyIcon, { size: 48, color: "#9ca3af" })}
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">
              {emptyMessage}
            </Text>
            <Text className="text-gray-600 text-center text-lg mb-8">
              {emptyDescription}
            </Text>
            <AnimatedButton
              onPress={() => router.push('/browse')}
              hapticType="light"
              scaleValue={0.97}
              style={{
                backgroundColor: COLORS.utOrange,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 12,
              }}
            >
              <Text className="text-white font-semibold text-lg">Browse Listings</Text>
            </AnimatedButton>
          </View>
        </ScrollView>
      )}
    </View>
  );
}