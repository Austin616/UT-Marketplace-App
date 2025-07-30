import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { COLORS } from '~/theme/colors';

interface ViewAllCardProps {
  title: string;
  count: number;
  onPress: () => void;
}

export const ViewAllCard: React.FC<ViewAllCardProps> = ({ title, count, onPress }) => {
  return (
    <TouchableOpacity 
      className="mr-4 w-40"
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View className="w-full h-56 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 items-center justify-center">
        <View className="items-center">
          <View className="w-12 h-12 rounded-full items-center justify-center mb-3" style={{ backgroundColor: COLORS.utOrange }}>
            <ChevronRight size={24} color="white" />
          </View>
          <Text className="font-semibold text-gray-900 text-center mb-1">
            View All
          </Text>
          <Text className="text-sm text-gray-600 text-center mb-2">
            {title}
          </Text>
          <View className="bg-white rounded-full px-3 py-1 border border-gray-200">
            <Text className="text-xs font-semibold" style={{ color: COLORS.utOrange }}>
              {count} total
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};