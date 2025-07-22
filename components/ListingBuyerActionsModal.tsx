import React from 'react';
import { View, Text, Modal, TouchableOpacity, Dimensions } from 'react-native';
import {
  X,
  MessageCircle,
  Heart,
  Share2,
  Shield,
  AlertTriangle,
  Eye,
  Flag,
  Sparkles,
} from 'lucide-react-native';
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
  onWatchlist?: () => void;
  isSaved: boolean;
  isWatchlisted?: boolean;
}

export const ListingBuyerActionsModal: React.FC<ListingBuyerActionsModalProps> = ({
  visible,
  onClose,
  listing,
  onMessage,
  onSave,
  onShare,
  onReport,
  onWatchlist,
  isSaved,
  isWatchlisted = false,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      {/* Background Blur/Overlay */}
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />

        {/* Modal Content */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 12,
            paddingBottom: 40,
            maxHeight: screenHeight * 0.85,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 8,
          }}>
          {/* Handle Bar */}
          <View className="items-center py-3">
            <View
              style={{
                width: 36,
                height: 4,
                backgroundColor: '#e5e7eb',
                borderRadius: 2,
              }}
            />
          </View>

          {/* Header */}
          <View className="mb-4 flex-row items-center justify-between px-6 py-2">
            <View className="flex-row items-center">
              <View
                style={{
                  backgroundColor: '#f3f4f6',
                  borderRadius: 12,
                  padding: 8,
                  marginRight: 12,
                }}>
                <Sparkles size={20} color={COLORS.utOrange} />
              </View>
              <Text className="text-xl font-bold text-gray-900">Quick Actions</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: '#f9fafb',
                borderRadius: 12,
                padding: 8,
              }}>
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Listing Context */}
          <View
            style={{
              marginHorizontal: 24,
              backgroundColor: '#f8fafc',
              borderRadius: 16,
              padding: 16,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: '#e2e8f0',
            }}>
            <Text className="mb-2 text-xs font-semibold tracking-wider text-gray-500">
              LISTING DETAILS
            </Text>
            <Text className="mb-2 text-lg font-bold text-gray-900" numberOfLines={2}>
              {listing.title}
            </Text>
            <Text className="text-sm text-gray-600">
              Seller: <Text className="font-semibold text-gray-900">{listing.user_name}</Text>
            </Text>
          </View>

          <View style={{ paddingHorizontal: 24 }}>
            {/* Primary Message Button */}
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
                  justifyContent: 'center',
                  paddingVertical: 18,
                  paddingHorizontal: 24,
                  borderRadius: 20,
                  marginBottom: 24,
                  shadowColor: COLORS.utOrange,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 8,
                }}>
                <MessageCircle size={24} color="white" />
                <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginLeft: 12 }}>
                  Message Seller
                </Text>
              </AnimatedButton>
            )}

            {/* Action Buttons Grid */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 50}}>
              <AnimatedButton
                onPress={() => {
                  onSave();
                  onClose();
                }}
                hapticType="light"
                scaleValue={0.96}
                style={{
                  flex: 1,
                  backgroundColor: isSaved ? '#ef4444' : '#fef7f7',
                  borderRadius: 16,
                  paddingVertical: 16,
                  paddingHorizontal: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: isSaved ? '#ef4444' : '#f87171',
                  shadowColor: isSaved ? '#ef4444' : '#000',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: isSaved ? 0.2 : 0.06,
                  shadowRadius: 6,
                  elevation: 3,
                  minHeight: 72,
                }}>
                <View style={{ 
                  
                  borderRadius: 8,
                  padding: 6,
                  marginBottom: 6
                }}>
                  <Heart
                    size={20}
                    color={isSaved ? 'white' : '#dc2626'}
                    fill={isSaved ? 'white' : 'transparent'}
                  />
                </View>
                <Text
                  style={{
                    color: isSaved ? 'white' : '#dc2626',
                    fontSize: 12,
                    fontWeight: '700',
                    textAlign: 'center',
                  }}>
                  {isSaved ? 'Saved' : 'Favorite'}
                </Text>
              </AnimatedButton>

              {onWatchlist && (
                <AnimatedButton
                  onPress={() => {
                    onWatchlist();
                    onClose();
                  }}
                  hapticType="light"
                  scaleValue={0.96}
                  style={{
                    flex: 1,
                    backgroundColor: isWatchlisted ? '#3b82f6' : '#f0f9ff',
                    borderRadius: 16,
                    paddingVertical: 16,
                    paddingHorizontal: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1.5,
                    borderColor: isWatchlisted ? '#3b82f6' : '#60a5fa',
                    shadowColor: isWatchlisted ? '#3b82f6' : '#000',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: isWatchlisted ? 0.2 : 0.06,
                    shadowRadius: 6,
                    elevation: 3,
                    minHeight: 72,
                  }}>
                  <View style={{ 
                    borderRadius: 8,
                    padding: 6,
                    marginBottom: 6
                  }}>
                    <Eye size={20} color={isWatchlisted ? 'white' : '#1d4ed8'} />
                  </View>
                  <Text
                    style={{
                      color: isWatchlisted ? 'white' : '#1d4ed8',
                      fontSize: 12,
                      fontWeight: '700',
                      textAlign: 'center',
                    }}>
                    {isWatchlisted ? 'Watching' : 'Watch'}
                  </Text>
                </AnimatedButton>
              )}

              <AnimatedButton
                onPress={() => {
                  onShare();
                  onClose();
                }}
                hapticType="light"
                scaleValue={0.96}
                style={{
                  flex: 1,
                  backgroundColor: '#f9fafb',
                  borderRadius: 16,
                  paddingVertical: 16,
                  paddingHorizontal: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: '#d1d5db',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.06,
                  shadowRadius: 6,
                  elevation: 3,
                  minHeight: 72,
                }}>
                <View style={{ 
                  borderRadius: 8,
                  padding: 6,
                  marginBottom: 6
                }}>
                  <Share2 size={20} color="#6b7280" />
                </View>
                <Text
                  style={{
                    color: '#4b5563',
                    fontSize: 12,
                    fontWeight: '700',
                    textAlign: 'center',
                  }}>
                  Share
                </Text>
              </AnimatedButton>
            </View>

            {/* Safety Tips Section */}
            <View
              style={{
                backgroundColor: '#f0f9ff',
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: '#e0f2fe',
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View
                  style={{
                    backgroundColor: '#0ea5e9',
                    borderRadius: 10,
                    padding: 8,
                    marginRight: 12,
                  }}>
                  <Shield size={20} color="white" />
                </View>
                <Text
                  style={{
                    color: '#0c4a6e',
                    fontSize: 16,
                    fontWeight: '700',
                  }}>
                  Safety Guidelines
                </Text>
              </View>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#0ea5e9',
                      marginTop: 6,
                      marginRight: 12,
                    }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: '#0c4a6e',
                      lineHeight: 20,
                    }}>
                    Meet in public places on campus
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#0ea5e9',
                      marginTop: 6,
                      marginRight: 12,
                    }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: '#0c4a6e',
                      lineHeight: 20,
                    }}>
                    Verify the item&apos;s condition before paying
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#0ea5e9',
                      marginTop: 6,
                      marginRight: 12,
                    }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: '#0c4a6e',
                      lineHeight: 20,
                    }}>
                    Trust your instincts - if something feels off, walk away
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#0ea5e9',
                      marginTop: 6,
                      marginRight: 12,
                    }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: '#0c4a6e',
                      lineHeight: 20,
                    }}>
                    Use cash or secure payment methods
                  </Text>
                </View>
              </View>
            </View>

            {/* Warning for Sold Items */}
            {listing.is_sold && (
              <View
                style={{
                  backgroundColor: '#fef2f2',
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: '#fecaca',
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View
                    style={{
                      backgroundColor: '#dc2626',
                      borderRadius: 10,
                      padding: 8,
                      marginRight: 12,
                    }}>
                    <AlertTriangle size={20} color="white" />
                  </View>
                  <Text
                    style={{
                      color: '#991b1b',
                      fontSize: 16,
                      fontWeight: '700',
                    }}>
                    Item Sold
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    color: '#7f1d1d',
                    lineHeight: 20,
                  }}>
                  This item has been marked as sold by the seller. You can still message them to
                  check if it&apos;s still available.
                </Text>
              </View>
            )}

            {/* Report Section */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: '#f3f4f6',
                paddingTop: 20,
                marginTop: 8,
              }}>
              <Text
                style={{
                  color: '#9ca3af',
                  fontSize: 12,
                  fontWeight: '600',
                  marginBottom: 12,
                  letterSpacing: 0.5,
                }}>
                NEED HELP?
              </Text>
              <AnimatedButton
                onPress={() => {
                  onReport();
                  onClose();
                }}
                hapticType="light"
                scaleValue={0.97}
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1.5,
                  borderColor: '#dc2626',
                  borderRadius: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Flag size={18} color="#dc2626" />
                <Text
                  style={{
                    color: '#dc2626',
                    fontSize: 15,
                    fontWeight: '600',
                    marginLeft: 8,
                  }}>
                  Report this listing
                </Text>
              </AnimatedButton>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
