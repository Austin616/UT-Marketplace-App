import { View, Text, ScrollView, Image, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '~/theme/colors';
import { MapPin, Calendar, Tag, Edit3, Trash2, Eye, CheckCircle, MessageCircle, Heart, FileText, Settings, Clock, XCircle } from 'lucide-react-native';
import { AnimatedButton } from '~/components/ui/AnimatedButton';
import { ImageViewerModal } from '~/components/modals/ImageViewerModal';
import { supabase } from '~/lib/supabase';
import { useState, useEffect } from 'react';
import StatusBadge, { StatusDescription } from '~/components/StatusBadge';

const { width: screenWidth } = Dimensions.get('window');

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
  user_image: string | null;
  is_sold: boolean;
  is_draft: boolean;
  status: 'pending' | 'approved' | 'denied';
  denial_reason?: string;
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
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [favoriteCounts, setFavoriteCounts] = useState({
    favorites: 0,
    watchlist: 0
  });

  useEffect(() => {
    fetchFavoriteCounts();
  }, [listing.id]);

  const fetchFavoriteCounts = async () => {
    try {
      // Use the database function to get favorite counts
      const { data, error } = await supabase
        .rpc('get_listing_engagement_stats', {
          p_listing_id: listing.id
        });

      if (error) throw error;

      if (data && data.length > 0) {
        setFavoriteCounts({ 
          favorites: data[0].favorite_count || 0, 
          watchlist: data[0].watchlist_count || 0 
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
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.9}
                    onPress={() => {
                      setSelectedImageIndex(index);
                      setShowImageViewer(true);
                    }}
                  >
                    <Image
                      source={{ uri: image }}
                      style={{ width: screenWidth, height: 300 }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
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
            {/* Listing Status Badge */}
            <StatusBadge status={listing.status || 'pending'} size="medium" />
            
            {/* Sale Status */}
            {listing.status === 'approved' && (
              <View className={`px-4 py-2 rounded-full flex-row items-center ${listing.is_sold ? 'bg-red-100' : 'bg-green-100'}`}>
                <CheckCircle size={16} color={listing.is_sold ? '#dc2626' : '#16a34a'} />
                <Text className={`font-semibold text-sm ml-2 ${listing.is_sold ? 'text-red-800' : 'text-green-800'}`}>
                  {listing.is_sold ? 'Sold' : 'Available'}
                </Text>
              </View>
            )}
            
            {listing.is_draft && (
              <View className="bg-gray-100 px-4 py-2 rounded-full flex-row items-center">
                <FileText size={16} color="#6b7280" />
                <Text className="text-gray-800 font-semibold text-sm ml-2">Draft</Text>
              </View>
            )}
          </View>

          {/* Status Description for pending/denied listings */}
          {listing.status && listing.status !== 'approved' && (
            <StatusDescription status={listing.status} denialReason={listing.denial_reason} />
          )}

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


          {/* Engagement */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <Heart size={14} color="#9CA3AF" />
              <Text className="text-sm text-gray-500 ml-2">{favoriteCounts.favorites} likes</Text>
            </View>
            <View className="flex-row items-center">
              <Eye size={14} color="#9CA3AF" />
              <Text className="text-sm text-gray-500 ml-2">{favoriteCounts.watchlist} watching</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View className="p-4 border-t border-gray-200 bg-white space-y-3">
        {listing.status === 'pending' ? (
          <View className="flex-row items-center justify-center py-3 rounded-xl bg-gray-100">
            <Clock size={16} color="#6B7280" />
            <Text className="text-gray-600 font-semibold ml-2">Listing under review</Text>
          </View>
        ) : (
          <>
            <AnimatedButton
              onPress={handleEditListing}
              hapticType="light"
              scaleValue={0.97}
              style={{
                backgroundColor: COLORS.utOrange,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 14,
                borderRadius: 12,
              }}
            >
              <Edit3 size={18} color="white" />
              <Text className="text-white font-semibold ml-2">Edit</Text>
            </AnimatedButton>

            <View className="h-1" />
            <AnimatedButton
              onPress={handleMarkAsSold}
              hapticType="light"
              scaleValue={0.97}
              disabled={updating}
              style={{
                borderWidth: 1,
                borderColor: listing.is_sold ? '#10b981' : '#ef4444',
                backgroundColor: 'white',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 14,
                borderRadius: 12,
                opacity: updating ? 0.7 : 1,
              }}
            >
              <CheckCircle size={18} color={listing.is_sold ? '#10b981' : '#ef4444'} />
              <Text
                className="font-semibold ml-2"
                style={{ color: listing.is_sold ? '#10b981' : '#ef4444' }}
              >
                {listing.is_sold ? 'Mark Available' : 'Mark Sold'}
              </Text>
            </AnimatedButton>

            <View className="h-1" />
            <AnimatedButton
              onPress={handleViewAsPublic}
              hapticType="light"
              scaleValue={0.97}
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                backgroundColor: 'white',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 14,
                borderRadius: 12,
              }}
            >
              <Eye size={18} color="#6B7280" />
              <Text className="text-gray-700 font-semibold ml-2">View as buyer</Text>
            </AnimatedButton>

            <View className="h-1" />
            <AnimatedButton
              onPress={handleDeleteListing}
              hapticType="light"
              scaleValue={0.95}
              disabled={updating}
              style={{
                backgroundColor: '#FEF2F2',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 14,
                borderRadius: 12,
                opacity: updating ? 0.7 : 1,
              }}
            >
              <Trash2 size={18} color="#DC2626" />
              <Text className="text-red-600 font-semibold ml-2">Delete</Text>
            </AnimatedButton>
          </>
        )}
      </View>

      {/* Image Viewer Modal */}
      <ImageViewerModal
        visible={showImageViewer}
        images={listing.images}
        initialIndex={selectedImageIndex}
        onClose={() => setShowImageViewer(false)}
      />
    </>
  );
}; 
