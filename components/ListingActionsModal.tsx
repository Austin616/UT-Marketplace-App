import React from 'react';
import { View, Text, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Edit3, CheckCircle, Trash2, Eye } from 'lucide-react-native';
import { COLORS } from '~/theme/colors';
import { AnimatedButton } from './AnimatedButton';

const { height: screenHeight } = Dimensions.get('window');

interface ListingActionsModalProps {
  visible: boolean;
  onClose: () => void;
  listing: {
    is_sold: boolean;
    title: string;
  };
  onEdit: () => void;
  onMarkAsSold: () => void;
  onDelete: () => void;
  onViewAsPublic: () => void;
  updating: boolean;
}

export const ListingActionsModal: React.FC<ListingActionsModalProps> = ({
  visible,
  onClose,
  listing,
  onEdit,
  onMarkAsSold,
  onDelete,
  onViewAsPublic,
  updating
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
            maxHeight: screenHeight * 0.6 
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
            <Text className="text-xl font-bold text-gray-900">Manage Listing</Text>
            <TouchableOpacity
              onPress={onClose}
              className="p-2 rounded-full bg-gray-100"
            >
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Listing Title */}
          <View className="px-6 py-3 bg-gray-50">
            <Text className="text-sm text-gray-600">Current Listing:</Text>
            <Text className="text-base font-semibold text-gray-900" numberOfLines={2}>
              {listing.title}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="px-6 py-6 gap-4">
            {/* Edit Button */}
            <AnimatedButton
              onPress={() => {
                onEdit();
                onClose();
              }}
              hapticType="light"
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
              <Edit3 size={20} color="white" />
              <Text className="text-white font-bold text-lg ml-3 flex-1">Edit Listing</Text>
            </AnimatedButton>

            {/* Mark as Sold/Available */}
            <AnimatedButton
              onPress={() => {
                onMarkAsSold();
                onClose();
              }}
              hapticType="medium"
              scaleValue={0.97}
              disabled={updating}
              style={{
                backgroundColor: listing.is_sold ? '#10b981' : '#ef4444',
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 16,
                paddingHorizontal: 20,
                borderRadius: 16,
                opacity: updating ? 0.7 : 1,
              }}
            >
              <CheckCircle size={20} color="white" />
              <Text className="text-white font-bold text-lg ml-3 flex-1">
                {listing.is_sold ? 'Mark as Available' : 'Mark as Sold'}
              </Text>
            </AnimatedButton>

            {/* View as Buyer */}
            <AnimatedButton
              onPress={() => {
                onViewAsPublic();
                onClose();
              }}
              hapticType="light"
              scaleValue={0.97}
              style={{
                borderColor: COLORS.utOrange,
                borderWidth: 2,
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 16,
                paddingHorizontal: 20,
                borderRadius: 16,
                backgroundColor: 'white',
              }}
            >
              <Eye size={20} color={COLORS.utOrange} />
              <Text className="font-bold text-lg ml-3 flex-1" style={{ color: COLORS.utOrange }}>
                View as Buyer
              </Text>
            </AnimatedButton>

            {/* Divider */}
            <View className="border-t border-gray-200 my-2" />

            {/* Delete Button */}
            <AnimatedButton
              onPress={() => {
                onDelete();
                onClose();
              }}
              hapticType="heavy"
              scaleValue={0.95}
              disabled={updating}
              style={{
                backgroundColor: '#dc2626',
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 16,
                paddingHorizontal: 20,
                borderRadius: 16,
                opacity: updating ? 0.7 : 1,
              }}
            >
              <Trash2 size={20} color="white" />
              <Text className="text-white font-bold text-lg ml-3 flex-1">Delete Listing</Text>
            </AnimatedButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}; 