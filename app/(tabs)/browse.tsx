import React, { useState, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '~/lib/supabase';
import { SearchBar } from '~/components/SearchBar';
import CategoryButtons from '~/components/CategoryButtons';
import ListingCard from '~/components/ListingCard';
import FilterModal from '~/components/FilterModal';
import { COLORS } from '~/theme/colors';

interface Listing {
  id: number;
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
  user_image: string | null;
}

interface UserSettings {
  email: string;
  display_name: string | null;
  profile_image_url: string | null;
}

interface UserMap {
  [key: string]: {
    name: string;
    image: string | null;
  };
}

interface Filters {
  sortBy: 'newest' | 'oldest' | 'price_low' | 'price_high';
  priceRange: 'all' | 'under_50' | 'under_100' | 'under_500' | '500_plus';
  timeRange: 'all' | 'today' | 'this_week' | 'this_month';
}

const { width } = Dimensions.get('window');
const numColumns = 2;
const itemWidth = (width - 32) / numColumns; // 32 = padding (16 * 2)

function getTimeAgo(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const diff = now.getTime() - date.getTime();

  if (isNaN(date.getTime())) return '';

  const seconds = Math.floor(diff / 1000);
  if (seconds < 600) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;

  const years = Math.floor(days / 365);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

export default function BrowseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(params.category?.toString() || 'All');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    sortBy: 'newest',
    priceRange: 'all',
    timeRange: 'all',
  });
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchListings();
  }, [selectedCategory, filters]);

  const fetchListings = async () => {
    try {
      let query = supabase
        .from('listings')
        .select('*')
        .eq('is_sold', false)
        .eq('is_draft', false);

      // Apply category filter
      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory);
      }

      // Apply search filter
      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      // Apply price range filter
      switch (filters.priceRange) {
        case 'under_50':
          query = query.lt('price', 50);
          break;
        case 'under_100':
          query = query.lt('price', 100);
          break;
        case 'under_500':
          query = query.lt('price', 500);
          break;
        case '500_plus':
          query = query.gte('price', 500);
          break;
      }

      // Apply time range filter
      const now = new Date();
      switch (filters.timeRange) {
        case 'today':
          query = query.gte('created_at', now.toISOString().split('T')[0]);
          break;
        case 'this_week':
          const lastWeek = new Date(now.setDate(now.getDate() - 7));
          query = query.gte('created_at', lastWeek.toISOString());
          break;
        case 'this_month':
          const lastMonth = new Date(now.setMonth(now.getMonth() - 1));
          query = query.gte('created_at', lastMonth.toISOString());
          break;
      }

      // Apply sort
      switch (filters.sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'price_low':
          query = query.order('price', { ascending: true });
          break;
        case 'price_high':
          query = query.order('price', { ascending: false });
          break;
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user settings for all unique user_ids
      const userIds = [...new Set((data || []).map(l => l.user_id))];
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('email, display_name, profile_image_url')
        .in('email', userIds);

      const userMap: UserMap = {};
      (userSettings || []).forEach((u: UserSettings) => {
        userMap[u.email] = {
          name: u.display_name || u.email,
          image: u.profile_image_url || null,
        };
      });

      const listingsWithUser = (data || []).map(listing => ({
        ...listing,
        user_name: userMap[listing.user_id]?.name || listing.user_id,
        user_image: userMap[listing.user_id]?.image || null,
      }));

      setListings(listingsWithUser);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchListings();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // Debounce the search query
    setTimeout(() => {
      fetchListings();
    }, 500);
  };

  const handleCategoryPress = (category: string) => {
    setSelectedCategory(category);
  };

  const handleApplyFilters = (newFilters: Filters) => {
    setFilters(newFilters);
    setShowFilters(false);
  };

  return (
    <View className="flex-1 bg-gray-50 pb-24">
      {/* Search */}
      <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          onFilterPress={() => setShowFilters(true)}
        />

        {/* Categories */}
        <CategoryButtons
          selectedCategory={selectedCategory}
          onCategoryPress={handleCategoryPress}
        />

        {/* Listings */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={COLORS.utOrange} />
          </View>
        ) : (
          <FlatList
            data={listings}
            keyExtractor={item => item.id.toString()}
            numColumns={2}
            renderItem={({ item }) => (
              <View style={{ width: itemWidth, padding: 1 }}>
                <ListingCard
                  {...item}
                  timePosted={getTimeAgo(item.created_at)}
                  user={{
                    name: item.user_name,
                    image: item.user_image,
                  }}
                  onPress={() => router.push(`/listing/${item.id}`)}
                />
              </View>
            )}
            contentContainerStyle={{ paddingHorizontal: 14 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.utOrange}
              />
            }
          />
        )}

      {/* Filter Modal */}
      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        currentFilters={filters}
      />
    </View>
  );
} 