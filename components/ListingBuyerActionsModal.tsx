import React from 'react';
import { View, Text, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { X, MessageCircle, Heart, Share2, Shield, AlertTriangle, Eye, Flag } from 'lucide-react-native';
import { COLORS } from '~/theme/colors';
import { AnimatedButton } from './AnimatedButton';

const { height: screenHeight } = Dimensions.get('window');

interface ListingBuyerActionsModalProps {
  visible: boolean;
  onClose: () => void;
  listing: {
    title: string;
    user_name: string;
    is_sold: boolean;
  };
  onMessage: () => void;
  onSave: () => void;
  onShare: () => void;
  onReport: () => void;
  isSaved: boolean;
}

export const ListingBuyerActionsModal: React.FC<ListingBuyerActionsModalProps> = ({
  visible,
  onClose,
  listing,
  onMessage,
  onSave,
  onShare,
  onReport,
  isSaved
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      {/* Background Blur/Overlay */}
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <TouchableOpacity 
          className="flex-1" 
          activeOpacity={1}
          onPress={onClose}
        />
        
        {/* Modal Content */}
        <View 
          className="bg-white rounded-t-3xl"
          style={{ 
            paddingTop: 8,
            paddingBottom: 40,
            maxHeight: screenHeight * 0.8
          }}
        >
          {/* Handle Bar */}
          <View className="items-center py-2">
            <View 
              className="bg-gray-300 rounded-full"
              style={{ width: 40, height: 4 }}
            />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
            <Text className="text-xl font-bold text-gray-900">Actions & Tips</Text>
            <TouchableOpacity
              onPress={onClose}
              className="p-2 rounded-full bg-gray-100"
            >
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Listing Context */}
          <View className="px-6 py-3 bg-gray-50">
            <Text className="text-sm text-gray-600">Item:</Text>
            <Text className="text-base font-semibold text-gray-900" numberOfLines={2}>
              {listing.title}
            </Text>
            <Text className="text-sm text-gray-600 mt-1">
              Sold by: <Text className="font-medium">{listing.user_name}</Text>
            </Text>
          </View>

          <View className="px-6 py-6">
            {/* Primary Actions */}
            <View className="gap-3 mb-6">
              {!listing.is_sold && (
                <AnimatedButton
                  onPress={() => {
                    onMessage();
                    onClose();
                  }}
                  hapticType="medium"
                  scaleValue={0.97}
                  style={{
                    backgroundColor: COLORS.utOrange,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderRadius: 16,
                  }}
                >
                  <MessageCircle size={20} color="white" />
                  <Text className="text-white font-bold text-lg ml-3 flex-1">Message Seller</Text>
                </AnimatedButton>
              )}

              <View className="flex-row gap-3">
                <AnimatedButton
                  onPress={() => {
                    onSave();
                    onClose();
                  }}
                  hapticType="light"
                  scaleValue={0.97}
                  style={{
                    borderColor: COLORS.utOrange,
                    borderWidth: 2,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: 'white',
                    flex: 1,
                  }}
                >
                  <Heart size={18} color={isSaved ? '#ef4444' : COLORS.utOrange} fill={isSaved ? '#ef4444' : 'transparent'} />
                  <Text className="font-semibold text-base ml-2 flex-1" style={{ color: COLORS.utOrange }}>
                    {isSaved ? 'Saved' : 'Save'}
                  </Text>
                </AnimatedButton>

                <AnimatedButton
                  onPress={() => {
                    onShare();
                    onClose();
                  }}
                  hapticType="light"
                  scaleValue={0.97}
                  style={{
                    borderColor: '#6b7280',
                    borderWidth: 2,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: 'white',
                    flex: 1,
                  }}
                >
                  <Share2 size={18} color="#6b7280" />
                  <Text className="text-gray-700 font-semibold text-base ml-2 flex-1">Share</Text>
                </AnimatedButton>
              </View>
            </View>

            {/* Safety Tips Section */}
            <View className="bg-blue-50 rounded-xl p-4 mb-4">
              <View className="flex-row items-center mb-3">
                <Shield size={20} color="#1e40af" />
                <Text className="text-blue-900 font-bold text-lg ml-2">Safety Tips</Text>
              </View>
              
              <View className="gap-3">
                <View className="flex-row items-start">
                  <View className="w-2 h-2 rounded-full bg-blue-600 mt-2 mr-3" />
                  <Text className="text-blue-800 flex-1">Meet in public places on campus</Text>
                </View>
                <View className="flex-row items-start">
                  <View className="w-2 h-2 rounded-full bg-blue-600 mt-2 mr-3" />
                  <Text className="text-blue-800 flex-1">Verify the item&apos;s condition before paying</Text>
                </View>
                <View className="flex-row items-start">
                  <View className="w-2 h-2 rounded-full bg-blue-600 mt-2 mr-3" />
                  <Text className="text-blue-800 flex-1">Trust your instincts - if something feels off, walk away</Text>
                </View>
                <View className="flex-row items-start">
                  <View className="w-2 h-2 rounded-full bg-blue-600 mt-2 mr-3" />
                  <Text className="text-blue-800 flex-1">Use cash or secure payment methods</Text>
                </View>
              </View>
            </View>

            {/* Warning for Sold Items */}
            {listing.is_sold && (
              <View className="bg-red-50 rounded-xl p-4 mb-4">
                <View className="flex-row items-center">
                  <AlertTriangle size={20} color="#dc2626" />
                  <Text className="text-red-900 font-bold text-base ml-2">Item Sold</Text>
                </View>
                <Text className="text-red-800 mt-2">
                  This item has been marked as sold by the seller. You can still message them to check if it&apos;s still available.
                </Text>
              </View>
            )}

            {/* Report Section */}
            <View className="border-t border-gray-200 pt-4">
              <Text className="text-gray-500 text-sm mb-3">Need help?</Text>
              <AnimatedButton
                onPress={() => {
                  onReport();
                  onClose();
                }}
                hapticType="light"
                scaleValue={0.97}
                style={{
                  borderColor: '#dc2626',
                  borderWidth: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  backgroundColor: 'white',
                }}
              >
                <Flag size={16} color="#dc2626" />
                <Text className="text-red-600 font-medium text-sm ml-2">Report this listing</Text>
              </AnimatedButton>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}; 