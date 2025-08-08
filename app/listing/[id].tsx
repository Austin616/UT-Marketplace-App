import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '~/lib/supabase';
import { useAuth } from '~/contexts/AuthContext';
import { COLORS } from '~/theme/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ListingOwnerView } from '~/components/ListingOwnerView';
import { ListingBuyerView } from '~/components/ListingBuyerView';

const { width: screenWidth } = Dimensions.get('window');

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
  is_sold: boolean;
  is_draft: boolean;
}

interface UserSettings {
  email: string;
  display_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
}

export default function ListingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [userListingCount, setUserListingCount] = useState(0);
  const [viewAsBuyer, setViewAsBuyer] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchListing();
  }, []);

  const fetchListing = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch listing data
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();

      if (listingError) throw listingError;
      if (!listingData) throw new Error('Listing not found');

      setListing(listingData);

      // Set navigation title to listing title
      navigation.setOptions({
        title: listingData.title
      });

      // Fetch user settings for the listing owner
      const { data: userData } = await supabase
        .from('user_settings')
        .select('*')
        .eq('email', listingData.user_id)
        .single();

      setUserSettings(userData);

      // Get count of user's other listings
      const { count } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', listingData.user_id)
        .eq('is_sold', false)
        .eq('is_draft', false);

      setUserListingCount(count || 0);

    } catch (err) {
      console.error('Error fetching listing:', err);
      setError(err instanceof Error ? err.message : 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleImageScroll = (direction: 'left' | 'right') => {
    if (!listing?.images) return;
    
    const newIndex = direction === 'left' 
      ? Math.max(0, selectedImageIndex - 1)
      : Math.min(listing.images.length - 1, selectedImageIndex + 1);
    
    setSelectedImageIndex(newIndex);
    
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: newIndex * screenWidth,
        animated: true
      });
    }
  };

  const handleListingUpdated = () => {
    // Refetch the listing data when it's updated
    fetchListing();
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.utOrange} />
          <Text className="text-gray-500 mt-4">Loading listing...</Text>
        </View>
      </View>
    );
  }

  if (error || !listing) {
    return (
      <View className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-red-600 text-center mb-4">{error || 'Listing not found'}</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="px-6 py-3 rounded-xl"
            style={{ backgroundColor: COLORS.utOrange }}
          >
            <Text className="text-white font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isOwner = user?.email === listing.user_id;
  const shouldShowBuyerView = !isOwner || viewAsBuyer;

  return (
    <View className="flex-1 bg-white">      
      {shouldShowBuyerView ? (
        <ListingBuyerView
          listing={listing}
          userSettings={userSettings}
          userListingCount={userListingCount}
          selectedImageIndex={selectedImageIndex}
          setSelectedImageIndex={setSelectedImageIndex}
          scrollViewRef={scrollViewRef}
          formatTimeAgo={formatTimeAgo}
          handleImageScroll={handleImageScroll}
          onBackToOwnerView={isOwner ? () => setViewAsBuyer(false) : undefined}
        />
      ) : (
        <ListingOwnerView
          listing={listing}
          selectedImageIndex={selectedImageIndex}
          setSelectedImageIndex={setSelectedImageIndex}
          scrollViewRef={scrollViewRef}
          formatTimeAgo={formatTimeAgo}
          handleImageScroll={handleImageScroll}
          onListingUpdated={handleListingUpdated}
          onViewAsBuyer={() => setViewAsBuyer(true)}
        />
      )}
    </View>
  );
}