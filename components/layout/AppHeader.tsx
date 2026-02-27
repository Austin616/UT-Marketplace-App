import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { COLORS } from '~/theme/colors';

type HeaderVariant = 'standard' | 'large';
type ActionsPlacement = 'top' | 'inline';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  variant?: HeaderVariant;
  showBackButton?: boolean;
  onBackPress?: () => void;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  centerTitle?: boolean;
  showBorder?: boolean;
  actionsPlacement?: ActionsPlacement;
}

export default function AppHeader({
  title,
  subtitle,
  variant = 'standard',
  showBackButton = false,
  onBackPress,
  leftElement,
  rightElement,
  centerTitle = true,
  showBorder = true,
  actionsPlacement = 'inline',
}: AppHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    router.back();
  };

  const shouldShowBack = showBackButton && !leftElement;
  const leftContent = leftElement
    ? leftElement
    : shouldShowBack ? (
        <TouchableOpacity
          onPress={handleBack}
          className="p-2 -ml-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={COLORS.utOrange} />
        </TouchableOpacity>
      ) : null;

  const rightContent = rightElement || null;
  const showTopRow = Boolean(leftContent || rightContent);
  const useTopRow = variant === 'large' && actionsPlacement === 'top' && showTopRow;
  const inlineLeft = variant === 'large' && actionsPlacement === 'inline' ? leftContent : null;
  const inlineRight = variant === 'large' && actionsPlacement === 'inline' ? rightContent : null;

  if (variant === 'large') {
    return (
      <View className={`bg-white ${showBorder ? 'border-b border-gray-100' : ''}`}>
        {useTopRow && (
          <View className="flex-row items-center justify-between px-5 pt-3">
            <View className="min-w-[40px]">{leftContent}</View>
            {rightContent ? (
              <View className="flex-row items-center gap-4">{rightContent}</View>
            ) : (
              <View className="min-w-[40px]" />
            )}
          </View>
        )}
        <View className={`px-5 ${useTopRow ? 'pt-2' : 'pt-4'} pb-3`}>
          <View className="flex-row items-center">
            {inlineLeft ? <View className="mr-3">{inlineLeft}</View> : null}
            <View className="flex-1">
              {title ? (
                <Text className="text-2xl font-bold text-gray-900" numberOfLines={2}>
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text className="text-sm text-gray-500 mt-1">{subtitle}</Text>
              ) : null}
            </View>
            {inlineRight ? <View className="ml-3">{inlineRight}</View> : null}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className={`bg-white ${showBorder ? 'border-b border-gray-100' : ''}`}>
      <View className="flex-row items-center px-4 py-3">
        <View className="w-10 items-start">{leftContent}</View>
        {title ? (
          <Text
            className={`flex-1 text-lg font-semibold ${centerTitle ? 'text-center' : 'text-left'}`}
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : (
          <View className="flex-1" />
        )}
        <View className="w-10 items-end">{rightContent}</View>
      </View>
      {subtitle ? (
        <Text className="px-4 pb-3 text-sm text-gray-500">{subtitle}</Text>
      ) : null}
    </View>
  );
}
