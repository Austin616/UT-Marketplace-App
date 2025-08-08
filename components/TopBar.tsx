import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '~/theme/colors';
import { ChevronLeft } from 'lucide-react-native';

export const TopBar = ({ variant = 'default' }: { variant?: 'default' | 'listing' }) => {
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-white">
      <TouchableOpacity onPress={() => router.back()}>
        <ChevronLeft size={24} color={COLORS.utOrange} />
      </TouchableOpacity>
    </View>
  );
};

