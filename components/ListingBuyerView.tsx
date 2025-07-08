import React, { useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert, Share, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '~/theme/colors';
import { MapPin, Calendar, Tag, Star, MessageCircle, MoreHorizontal, Heart, Share2 } from 'lucide-react-native';
import { AnimatedButton } from './AnimatedButton';
import { ListingBuyerActionsModal } from './ListingBuyerActionsModal';

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
}

export const ListingBuyerView: React.FC<ListingBuyerViewProps> = ({
  listing,
  userSettings,
  userListingCount,
  selectedImageIndex,
  setSelectedImageIndex,
  scrollViewRef,
  formatTimeAgo,
  handleImageScroll
}) => {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);

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

  const navigateToMessage = () => {
    // Navigate to message screen - implement this based on your routing
    Alert.alert('Message Seller', 'Message functionality coming soon!');
  };

  const handleSaveListing = () => {
    setIsSaved(!isSaved);
    // Implement save/unsave functionality with backend
    Alert.alert(isSaved ? 'Removed from Saved' : 'Saved!', isSaved ? 'Item removed from your saved listings' : 'Item saved to your favorites');
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
    // Navigate to seller profile
    Alert.alert('View Profile', `Navigate to ${listing.user_name}'s profile - coming soon!`);
    // router.push({
    //   pathname: '/profile/[userId]',
    //   params: { userId: listing.user_id }
    // });
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

          {/* Quick Actions Overlay */}
          <View className="absolute top-4 right-4 flex-row gap-2">
            <TouchableOpacity
              onPress={handleSaveListing}
              className="bg-white/80 backdrop-blur-sm rounded-full p-2"
            >
              <Heart size={20} color={isSaved ? '#ef4444' : '#6b7280'} fill={isSaved ? '#ef4444' : 'transparent'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShareListing}
              className="bg-white/80 backdrop-blur-sm rounded-full p-2"
            >
              <Share2 size={20} color="#6b7280" />
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
          <View className="bg-gray-50 rounded-xl p-4 mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-3">Seller Information</Text>
            <TouchableOpacity onPress={handleViewSellerProfile}>
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-gray-300 items-center justify-center mr-4">
                  {listing.user_image ? (
                    <Image 
                      source={{ uri: listing.user_image }} 
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <Text className="text-gray-600 font-bold text-lg">
                      {listing.user_name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View className="flex-1 mr-3">
                  <Text className="font-semibold text-gray-900 text-lg" numberOfLines={1}>
                    {listing.user_name}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Star size={14} color="#fbbf24" fill="#fbbf24" />
                    <Text className="text-gray-600 ml-1 text-sm">New Seller</Text>
                  </View>
                  <Text className="text-gray-500 text-xs mt-1">Tap to view profile</Text>
                </View>
                <View className="items-center justify-center bg-gray-200 rounded-full px-3 py-2">
                  <Text className="text-xs text-gray-600 font-medium">View Profile</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

       {/* Fixed Bottom Button */}
       <View className="p-4 border-t border-gray-200 bg-white">
        <View className="flex-row gap-3 justify-center ">
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
                  paddingVertical: 16,
                  paddingHorizontal: 10,
                  borderRadius: 12,
                  flex: 2,
                }}
              >
                <MessageCircle size={20} color="white" />
                <Text style={{ 
                  color: 'white', 
                  fontWeight: 'bold', 
                  fontSize: 16,
                  marginLeft: 8 
                }}>Message</Text>
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
              paddingVertical: 16,
              borderRadius: 12,
              backgroundColor: 'white',
              flex: listing.is_sold ? 2 : 1,
            }}
          >
            <MoreHorizontal size={20} color={COLORS.utOrange} />
            <Text style={{ 
              color: COLORS.utOrange, 
              fontWeight: 'bold', 
              fontSize: 16,
              marginLeft: 8 
            }}>
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
        isSaved={isSaved}
      />
    </>
  );
}; 