import { View, Text, ScrollView, Image, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '~/theme/colors';
import { MapPin, Calendar, Tag, Edit3, Trash2, Eye, CheckCircle, MessageCircle, Heart, FileText, Settings } from 'lucide-react-native';
import { AnimatedButton } from './AnimatedButton';
import { ListingActionsModal } from './ListingActionsModal';
import { supabase } from '~/lib/supabase';
import { useState, useEffect } from 'react';

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

interface ListingOwnerViewProps {
  listing: Listing;
  selectedImageIndex: number;
  setSelectedImageIndex: (index: number) => void;
  scrollViewRef: React.RefObject<ScrollView | null>;
  formatTimeAgo: (dateString: string) => string;
  handleImageScroll: (direction: 'left' | 'right') => void;
  onListingUpdated: () => void;
  onViewAsBuyer?: () => void;
}

export const ListingOwnerView: React.FC<ListingOwnerViewProps> = ({
  listing,
  selectedImageIndex,
  setSelectedImageIndex,
  scrollViewRef,
  formatTimeAgo,
  handleImageScroll,
  onListingUpdated,
  onViewAsBuyer
}) => {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [favoriteCounts, setFavoriteCounts] = useState({
    favorites: 0,
    watchlist: 0
  });

  useEffect(() => {
    fetchFavoriteCounts();
  }, [listing.id]);

  const fetchFavoriteCounts = async () => {
    try {
      // Use the view to get favorite counts
      const { data, error } = await supabase
        .from('listing_favorite_counts')
        .select('favorite_count, watchlist_count')
        .eq('listing_id', listing.id)
        .single();

      if (error) throw error;

      if (data) {
        setFavoriteCounts({ 
          favorites: data.favorite_count || 0, 
          watchlist: data.watchlist_count || 0 
        });
      } else {
        setFavoriteCounts({ favorites: 0, watchlist: 0 });
      }
    } catch (error) {
      console.error('Error fetching favorite counts:', error);
      setFavoriteCounts({ favorites: 0, watchlist: 0 });
    }
  };

  const handleMarkAsSold = async () => {
    Alert.alert(
      listing.is_sold ? 'Mark as Available' : 'Mark as Sold',
      listing.is_sold 
        ? 'Are you sure you want to mark this item as available for sale again?'
        : 'Are you sure you want to mark this item as sold?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: listing.is_sold ? 'Mark Available' : 'Mark Sold',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              const { error } = await supabase
                .from('listings')
                .update({ is_sold: !listing.is_sold })
                .eq('id', listing.id);

              if (error) throw error;
              onListingUpdated();
            } catch (error) {
              console.error('Error updating listing:', error);
              Alert.alert('Error', 'Failed to update listing status');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteListing = async () => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              const { error } = await supabase
                .from('listings')
                .delete()
                .eq('id', listing.id);

              if (error) throw error;
              router.back();
            } catch (error) {
              console.error('Error deleting listing:', error);
              Alert.alert('Error', 'Failed to delete listing');
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleEditListing = () => {
    router.push(`/listing/edit/${listing.id}`);
  };

  const handleViewAsPublic = () => {
    if (onViewAsBuyer) {
      onViewAsBuyer();
    }
  };

  return (
    <>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Images */}
        <View className="relative">
          {listing.images && listing.images.length > 0 ? (
            <>
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.floor(e.nativeEvent.contentOffset.x / screenWidth);
                  setSelectedImageIndex(index);
                }}
              >
                {listing.images.map((image, index) => (
                  <Image
                    key={index}
                    source={{ uri: image }}
                    style={{ width: screenWidth, height: 300 }}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              
              {listing.images.length > 1 && (
                <>
                  {/* Image navigation buttons */}
                  {selectedImageIndex > 0 && (
                    <TouchableOpacity
                      onPress={() => handleImageScroll('left')}
                      className="absolute left-4 top-1/2 bg-black/50 rounded-full p-2"
                      style={{ transform: [{ translateY: -20 }] }}
                    >
                      <Text className="text-white text-lg">‹</Text>
                    </TouchableOpacity>
                  )}
                  
                  {selectedImageIndex < listing.images.length - 1 && (
                    <TouchableOpacity
                      onPress={() => handleImageScroll('right')}
                      className="absolute right-4 top-1/2 bg-black/50 rounded-full p-2"
                      style={{ transform: [{ translateY: -20 }] }}
                    >
                      <Text className="text-white text-lg">›</Text>
                    </TouchableOpacity>
                  )}
                  
                  {/* Image indicators */}
                  <View className="absolute bottom-4 left-1/2 flex-row" style={{ transform: [{ translateX: -((listing.images.length * 12) / 2) }] }}>
                    {listing.images.map((_, index) => (
                      <View
                        key={index}
                        className={`w-2 h-2 rounded-full mx-1 ${
                          index === selectedImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </View>
                </>
              )}
            </>
          ) : (
            <View className="w-full h-80 bg-gray-100 items-center justify-center">
              <Text className="text-gray-400 text-lg">No Image</Text>
            </View>
          )}
          
          {listing.is_sold && (
            <View className="absolute top-4 left-4 bg-red-500 px-3 py-1 rounded-full">
              <Text className="text-white font-bold text-sm">SOLD</Text>
            </View>
          )}
        </View>

        {/* Listing Details */}
        <View className="p-6">
          {/* Title and Price */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900 mb-2">{listing.title}</Text>
            <Text className="text-3xl font-bold" style={{ color: COLORS.utOrange }}>
              ${listing.price}
            </Text>
          </View>

          {/* Status Indicators */}
          <View className="flex-row flex-wrap gap-2 mb-4">
            <View className={`px-4 py-2 rounded-full flex-row items-center ${listing.is_sold ? 'bg-red-100' : 'bg-green-100'}`}>
              <CheckCircle size={16} color={listing.is_sold ? '#dc2626' : '#16a34a'} />
              <Text className={`font-semibold text-sm ml-2 ${listing.is_sold ? 'text-red-800' : 'text-green-800'}`}>
                {listing.is_sold ? 'Sold' : 'Available'}
              </Text>
            </View>
            {listing.is_draft && (
              <View className="bg-gray-100 px-4 py-2 rounded-full flex-row items-center">
                <FileText size={16} color="#6b7280" />
                <Text className="text-gray-800 font-semibold text-sm ml-2">Draft</Text>
              </View>
            )}
          </View>

          {/* Meta Information */}
          <View className="flex-row flex-wrap gap-4 mb-6">
            <View className="flex-row items-center">
              <MapPin size={16} color={COLORS.utOrange} />
              <Text className="text-gray-600 ml-2">{listing.location}</Text>
            </View>
            <View className="flex-row items-center">
              <Calendar size={16} color={COLORS.utOrange} />
              <Text className="text-gray-600 ml-2">{formatTimeAgo(listing.created_at)}</Text>
            </View>
            <View className="flex-row items-center">
              <Tag size={16} color={COLORS.utOrange} />
              <Text className="text-gray-600 ml-2">{listing.category}</Text>
            </View>
          </View>

          {/* Condition */}
          <View className="mb-6">
            <View className="self-start px-3 py-1 rounded-full" style={{ backgroundColor: '#fef3c7' }}>
              <Text style={{ color: '#92400e', fontWeight: '600' }}>
                Condition: {listing.condition}
              </Text>
            </View>
          </View>

          {/* Description */}
          {listing.description && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-800 mb-2">Description</Text>
              <Text className="text-gray-700 leading-relaxed">{listing.description}</Text>
            </View>
          )}


          {/* Public Engagement Stats */}
          <View className="bg-gray-50 rounded-xl p-5 mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-4">Community Interest</Text>
            <View className="flex-row justify-around">
              <View className="items-center">
                <View className="bg-red-100 rounded-full p-3 mb-2">
                  <Heart size={20} color="#ef4444" />
                </View>
                <Text className="text-sm text-gray-600 mb-1">People who liked this</Text>
                <Text className="font-bold text-gray-900 text-lg">{favoriteCounts.favorites}</Text>
              </View>
              <View className="items-center">
                <View className="bg-blue-100 rounded-full p-3 mb-2">
                  <Eye size={20} color="#3b82f6" />
                </View>
                <Text className="text-sm text-gray-600 mb-1">People watching</Text>
                <Text className="font-bold text-gray-900 text-lg">{favoriteCounts.watchlist}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View className="p-4 border-t border-gray-200 bg-white">
        <AnimatedButton
          onPress={() => setShowActionsModal(true)}
          hapticType="medium"
          scaleValue={0.97}
          style={{
            backgroundColor: COLORS.utOrange,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 18,
            borderRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Settings size={22} color="white" />
          <Text className="text-white font-bold text-lg ml-2">Manage Listing</Text>
        </AnimatedButton>
      </View>

      {/* Actions Modal */}
      <ListingActionsModal
        visible={showActionsModal}
        onClose={() => setShowActionsModal(false)}
        listing={listing}
        onEdit={handleEditListing}
        onMarkAsSold={handleMarkAsSold}
        onDelete={handleDeleteListing}
        onViewAsPublic={handleViewAsPublic}
        updating={updating}
      />
    </>
  );
}; 