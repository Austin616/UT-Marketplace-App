import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert, Share, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '~/theme/colors';
import { MapPin, Calendar, Tag, Star, MessageCircle, MoreHorizontal, Heart, Share2, Eye, ArrowLeft } from 'lucide-react-native';
import { AnimatedButton } from './AnimatedButton';
import { ListingBuyerActionsModal } from './ListingBuyerActionsModal';
import { RatingSubmissionModal } from './RatingSubmissionModal';
import UserRatingDisplay from './UserRatingDisplay';
import { useAuth } from '~/contexts/AuthContext';
import { supabase } from '~/lib/supabase';

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

interface ListingBuyerViewProps {
  listing: Listing;
  userSettings: UserSettings | null;
  userListingCount: number;
  selectedImageIndex: number;
  setSelectedImageIndex: (index: number) => void;
  scrollViewRef: React.RefObject<ScrollView | null>;
  formatTimeAgo: (dateString: string) => string;
  handleImageScroll: (direction: 'left' | 'right') => void;
  onBackToOwnerView?: () => void;
}

export const ListingBuyerView: React.FC<ListingBuyerViewProps> = ({
  listing,
  userSettings,
  userListingCount,
  selectedImageIndex,
  setSelectedImageIndex,
  scrollViewRef,
  formatTimeAgo,
  handleImageScroll,
  onBackToOwnerView
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [sellerRating, setSellerRating] = useState<{ average: number; count: number } | null>(null);
  const [engagementStats, setEngagementStats] = useState({ favorites: 0, watchlist: 0 });
  
  const isOwnerViewing = user?.email === listing.user_id && onBackToOwnerView;

  useEffect(() => {
    fetchSellerRating();
    fetchEngagementStats();
    if (user?.email) {
      fetchUserFavoriteStatus();
    }
  }, [listing.id, listing.user_id, user?.email]);

  const fetchSellerRating = async () => {
    try {
      const { data: ratingsData } = await supabase
        .from('ratings')
        .select('rating')
        .eq('rated_id', listing.user_id);

      if (ratingsData && ratingsData.length > 0) {
        const average = ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length;
        setSellerRating({
          average: parseFloat(average.toFixed(1)),
          count: ratingsData.length
        });
      } else {
        setSellerRating({ average: 0, count: 0 });
      }
    } catch (error) {
      console.error('Error fetching seller rating:', error);
      setSellerRating({ average: 0, count: 0 });
    }
  };

  const fetchUserFavoriteStatus = async () => {
    if (!user?.email) return;

    try {
      // Use the database function to get user's favorite/watchlist status
      const { data, error } = await supabase
        .rpc('get_user_listing_status', {
          p_user_id: user.email,
          p_listing_id: listing.id
        });

      if (error) throw error;

      if (data && data.length > 0) {
        const status = data[0];
        setIsSaved(status.is_favorited);
        setIsWatchlisted(status.is_watchlisted);
      }
    } catch (error) {
      console.error('Error fetching user favorite status:', error);
    }
  };

  const fetchEngagementStats = async () => {
    try {
      // Use the view to get engagement stats
      const { data, error } = await supabase
        .from('listing_favorite_counts')
        .select('favorite_count, watchlist_count')
        .eq('listing_id', listing.id);

      if (error) throw error;

      if (data && data.length > 0) {
        setEngagementStats({ 
          favorites: data[0].favorite_count || 0, 
          watchlist: data[0].watchlist_count || 0 
        });
      } else {
        setEngagementStats({ favorites: 0, watchlist: 0 });
      }
    } catch (error) {
      console.error('Error fetching engagement stats:', error);
      setEngagementStats({ favorites: 0, watchlist: 0 });
    }
  };

  const handleMessageSeller = () => {
    if (listing.is_sold) {
      Alert.alert(
        'Item Sold',
        'This item has been marked as sold. You can still message the seller to check availability.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Message Anyway', onPress: () => navigateToMessage() }
        ]
      );
    } else {
      navigateToMessage();
    }
  };

  const isValidUUID = (id: string) => typeof id === 'string' && /^[0-9a-fA-F-]{36}$/.test(id);

  const navigateToMessage = () => {
    router.push({
      pathname: '/chat/[id]',
      params: { 
        id: listing.user_id,
        otherUserId: listing.user_id,
        otherUserName: listing.user_name,
        listingId: isValidUUID(listing.id) ? listing.id : 'general',
        listingTitle: listing.title
      }
    });
  };

  const handleSaveListing = async () => {
    if (!user?.email) {
      Alert.alert('Sign In Required', 'Please sign in to save listings.');
      return;
    }

    try {
      // Use the database function to toggle favorite status
      const { data, error } = await supabase
        .rpc('toggle_user_favorite', {
          p_user_id: user.email,
          p_listing_id: listing.id,
          p_type: 'favorite'
        });

      if (error) throw error;

      // data returns true if added, false if removed
      setIsSaved(data);
      fetchEngagementStats(); // Refresh counts
      
      if (data) {
        Alert.alert('Added to Favorites', 'Item saved to your favorites');
      } else {
        Alert.alert('Removed from Favorites', 'Item removed from your favorites');
      }
    } catch (error) {
      console.error('Error updating favorite status:', error);
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const handleWatchlistToggle = async () => {
    if (!user?.email) {
      Alert.alert('Sign In Required', 'Please sign in to add items to watchlist.');
      return;
    }

    try {
      // Use the database function to toggle watchlist status
      const { data, error } = await supabase
        .rpc('toggle_user_favorite', {
          p_user_id: user.email,
          p_listing_id: listing.id,
          p_type: 'watchlist'
        });

      if (error) throw error;

      // data returns true if added, false if removed
      setIsWatchlisted(data);
      fetchEngagementStats(); // Refresh counts
      
      if (data) {
        Alert.alert('Added to Watchlist', 'Item added to your watchlist');
      } else {
        Alert.alert('Removed from Watchlist', 'Item removed from your watchlist');
      }
    } catch (error) {
      console.error('Error updating watchlist status:', error);
      Alert.alert('Error', 'Failed to update watchlist status');
    }
  };

  const handleShareListing = async () => {
    try {
      await Share.share({
        message: `Check out this item: ${listing.title} for $${listing.price}`,
        // url: `your-app-url/listing/${listing.id}`, // Add your app's deep link
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleViewSellerProfile = () => {
    router.push({
      pathname: '/profile/[userId]',
      params: { userId: listing.user_id }
    });
  };

  const handleReportListing = () => {
    Alert.alert(
      'Report Listing',
      'Please select a reason for reporting this listing:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Spam or Fraud', onPress: () => submitReport('spam') },
        { text: 'Inappropriate Content', onPress: () => submitReport('inappropriate') },
        { text: 'Other', onPress: () => submitReport('other') }
      ]
    );
  };

  const submitReport = (reason: string) => {
    // Implement report functionality
    Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
  };

  const handleRateSeller = () => {
    if (!user?.email) {
      Alert.alert('Sign In Required', 'Please sign in to rate sellers.');
      return;
    }
    
    if (user.email === listing.user_id) {
      Alert.alert('Cannot Rate', 'You cannot rate yourself.');
      return;
    }

    setShowRatingModal(true);
  };

  const handleRatingSubmitted = () => {
    // Refresh seller rating after submission
    fetchSellerRating();
  };

  return (
    <>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Owner Viewing Banner */}
        {isOwnerViewing && (
          <View className="bg-blue-50 border-b border-blue-200 px-4 py-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="bg-blue-100 rounded-full p-2 mr-3">
                  <Eye size={16} color="#1e40af" />
                </View>
                <Text className="font-semibold text-base" style={{ color: '#1e40af' }}>
                  Viewing as buyer
                </Text>
              </View>
              <TouchableOpacity
                onPress={onBackToOwnerView}
                className="flex-row items-center bg-blue-100 rounded-full px-3 py-2"
              >
                <ArrowLeft size={16} color="#1e40af" />
                <Text className="font-medium text-sm ml-1" style={{ color: '#1e40af' }}>
                  Back to owner view
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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

          {/* Quick Actions Overlay */}
          <View className="absolute top-4 right-4 flex-row gap-2">
            <TouchableOpacity
              onPress={handleSaveListing}
              className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-sm"
            >
              <Heart size={22} color={isSaved ? '#ef4444' : '#6b7280'} fill={isSaved ? '#ef4444' : 'transparent'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShareListing}
              className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-sm"
            >
              <Share2 size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
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

          {/* Seller Info */}
          <View className="bg-gray-50 rounded-xl p-5 mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-4">Seller Information</Text>
            <TouchableOpacity onPress={handleViewSellerProfile}>
              <View className="flex-row items-center mb-4">
                <View className="w-14 h-14 rounded-full bg-gray-300 items-center justify-center mr-4 shadow-sm">
                  {listing.user_image ? (
                    <Image 
                      source={{ uri: listing.user_image }} 
                      className="w-14 h-14 rounded-full"
                    />
                  ) : (
                    <Text className="text-gray-600 font-bold text-xl">
                      {listing.user_name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View className="flex-1 mr-3">
                  <Text className="font-semibold text-gray-900 text-lg" numberOfLines={1}>
                    {listing.user_name}
                  </Text>
                  <View className="flex-row items-center mt-1 flex-wrap">
                    <UserRatingDisplay 
                      userId={listing.user_id} 
                      rating={sellerRating?.average} 
                      className="mr-2 flex-shrink-0" 
                    />
                    <Text className="text-gray-600 text-sm flex-shrink" numberOfLines={1}>
                      {sellerRating ? (
                        sellerRating.count > 0 ? (
                          `(${sellerRating.count} review${sellerRating.count !== 1 ? 's' : ''})`
                        ) : (
                          'No reviews yet'
                        )
                      ) : (
                        'Loading...'
                      )}
                    </Text>
                  </View>
                  <Text className="text-gray-500 text-xs mt-1">Tap to view profile</Text>
                </View>
                <View className="items-center justify-center bg-gray-200 rounded-full px-4 py-2">
                  <Text className="text-xs text-gray-600 font-medium">View Profile</Text>
                </View>
              </View>
            </TouchableOpacity>
            
            {/* Rate Seller Button */}
            {user?.email && user.email !== listing.user_id && (
              <TouchableOpacity
                onPress={handleRateSeller}
                className="flex-row items-center justify-center bg-white rounded-lg py-3 px-4 border border-gray-200"
              >
                <Star size={18} color={COLORS.utOrange} />
                <Text className="font-semibold ml-2" style={{ color: COLORS.utOrange }}>
                  Rate This Seller
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Engagement Stats */}
          <View className="bg-gray-50 rounded-xl p-5 mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-4">Listing Engagement</Text>
            <View className="flex-row justify-around">
              <View className="items-center">
                <View className="bg-red-100 rounded-full p-3 mb-2">
                  <Heart size={20} color="#ef4444" />
                </View>
                <Text className="text-sm text-gray-600 mb-1">Favorites</Text>
                <Text className="font-bold text-gray-900 text-lg">{engagementStats.favorites}</Text>
              </View>
              <View className="items-center">
                <View className="bg-blue-100 rounded-full p-3 mb-2">
                  <Eye size={20} color="#3b82f6" />
                </View>
                <Text className="text-sm text-gray-600 mb-1">Watching</Text>
                <Text className="font-bold text-gray-900 text-lg">{engagementStats.watchlist}</Text>
              </View>
            </View>
          </View>
        </View>

        
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View className="p-4 border-t border-gray-200 bg-white" style={{ flex: 0, marginBottom: 20 }}>
        <View className="flex-row gap-3 justify-center">
          {!listing.is_sold && (
            <AnimatedButton
              onPress={handleMessageSeller}
              hapticType="medium"
              scaleValue={0.97}
              style={{
                backgroundColor: COLORS.utOrange,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 18,
                paddingHorizontal: 12,
                borderRadius: 16,
                flex: 2,
                minHeight: 56,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <MessageCircle size={22} color="white" />
              <Text className="text-white font-bold text-base ml-2">Message</Text>
            </AnimatedButton>
          )}
          
          <AnimatedButton
            onPress={() => setShowActionsModal(true)}
            hapticType="light"
            scaleValue={0.97}
            style={{
              borderColor: COLORS.utOrange,
              borderWidth: 2,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 16,
              backgroundColor: 'white',
              flex: listing.is_sold ? 2 : 1,
              minHeight: 56,
            }}
          >
            <MoreHorizontal size={22} color={COLORS.utOrange} />
            <Text 
              className="font-bold text-base ml-2" 
              style={{ 
                color: COLORS.utOrange,
                minHeight: 20,
                lineHeight: 20
              }}
            >
              {listing.is_sold ? 'Actions & Tips' : 'More'}
            </Text>
          </AnimatedButton>
        </View>
      </View>


      {/* Actions Modal */}
      <ListingBuyerActionsModal
        visible={showActionsModal}
        onClose={() => setShowActionsModal(false)}
        listing={listing}
        onMessage={handleMessageSeller}
        onSave={handleSaveListing}
        onShare={handleShareListing}
        onReport={handleReportListing}
        onWatchlist={handleWatchlistToggle}
        isSaved={isSaved}
        isWatchlisted={isWatchlisted}
      />

      {/* Rating Modal */}
      <RatingSubmissionModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        ratedUserId={listing.user_id}
        ratedUserName={listing.user_name}
        onRatingSubmitted={handleRatingSubmitted}
      />
    </>
  );
}; 