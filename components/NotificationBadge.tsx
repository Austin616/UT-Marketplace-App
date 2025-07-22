import React from 'react';
import { View, Text } from 'react-native';
import { useNotificationCount } from '~/lib/useNotifications';

interface NotificationBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showZero?: boolean;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  size = 'medium',
  showZero = false 
}) => {
  const { unreadCount } = useNotificationCount();

  if (unreadCount === 0 && !showZero) {
    return null;
  }

  const sizeConfig = {
    small: {
      container: { width: 16, height: 16, borderRadius: 8 },
      text: { fontSize: 10, lineHeight: 12 }
    },
    medium: {
      container: { width: 20, height: 20, borderRadius: 10 },
      text: { fontSize: 11, lineHeight: 13 }
    },
    large: {
      container: { width: 24, height: 24, borderRadius: 12 },
      text: { fontSize: 12, lineHeight: 14 }
    }
  };

  const config = sizeConfig[size];
  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();

  return (
    <View
      style={{
        ...config.container,
        backgroundColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: -8,
        right: -8,
        zIndex: 10,
        borderWidth: 2,
        borderColor: 'white'
      }}
    >
      <Text
        style={{
          ...config.text,
          color: 'white',
          fontWeight: 'bold',
          textAlign: 'center'
        }}
      >
        {displayCount}
      </Text>
    </View>
  );
};

export default NotificationBadge;