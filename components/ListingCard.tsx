import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { COLORS } from '~/theme/colors';
import { MapPin } from 'lucide-react-native';
import { useSettings } from '~/contexts/SettingsContext';

interface ListingCardProps {
  id: number;
  title: string;
  price: number;
  location: string;
  category: string;
  timePosted: string;
  images: string[];
  user: {
    name: string;
    image?: string | null;
  };
  condition: string;
  onPress: () => void;
}

const ListingCard: React.FC<ListingCardProps> = ({
  title,
  price,
  location,
  timePosted,
  images,
  onPress,
}) => {
  const { locationEnabled } = useSettings();

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white"
      activeOpacity={0.7}
    >
      {/* Image */}
      <View className="aspect-square bg-gray-100">
        {images && images.length > 0 ? (
          <Image
            source={{ uri: images[0] }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Text className="text-gray-400">No Image</Text>
          </View>
        )}
        <View className="absolute bottom-2 right-2 bg-black/60 rounded-full px-2 py-1">
          <Text className="text-white text-xs font-medium">{timePosted}</Text>
        </View>
      </View>

      {/* Details */}
      <View className="p-2">
        <Text className="text-lg font-semibold text-gray-900" numberOfLines={1}>
          ${price}
        </Text>
        <Text className="text-base text-gray-700" numberOfLines={1}>
          {title}
        </Text>
        {locationEnabled && (
          <View className="flex-row items-center mt-1">
            <MapPin size={14} color={COLORS.light.grey} />
            <Text className="text-sm text-gray-500 ml-1" numberOfLines={1}>
              {location}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default ListingCard; 