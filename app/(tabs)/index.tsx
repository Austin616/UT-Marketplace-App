import { View, Text, ScrollView, TouchableOpacity, Image, FlatList, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, LogIn, BookOpen, Smartphone, Armchair, Shirt, Home, Wrench, Flame, MessageCircle, Users, Star, CheckCircle, ShieldCheck, Zap, TrendingUp, Eye, Heart, Sparkles, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '~/contexts/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '~/lib/supabase';
import { COLORS } from '~/theme/colors';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface Category {
  id: number;
  name: string;
  icon: React.ReactNode;
  color: string;
}

interface Item {
  id: number;
  title: string;
  price: number;
  image: string;
  location: string;
}

const categories: Category[] = [
  { id: 1, name: 'Textbooks', icon: <BookOpen size={18} color={COLORS.utOrange} />, color: COLORS.iconBg },
  { id: 2, name: 'Electronics', icon: <Smartphone size={18} color={COLORS.utOrange} />, color: COLORS.iconBg },
  { id: 3, name: 'Furniture', icon: <Armchair size={18} color={COLORS.utOrange} />, color: COLORS.iconBg },
  { id: 4, name: 'Clothing', icon: <Shirt size={18} color={COLORS.utOrange} />, color: COLORS.iconBg },
  { id: 5, name: 'Housing', icon: <Home size={18} color={COLORS.utOrange} />, color: COLORS.iconBg },
  { id: 6, name: 'Services', icon: <Wrench size={18} color={COLORS.utOrange} />, color: COLORS.iconBg },
];

// Animated Button Component with Press Effects
const AnimatedButton = ({ 
  onPress, 
  children, 
  style, 
  hapticType = 'light',
  scaleValue = 0.96,
  ...props 
}: {
  onPress: () => void;
  children: React.ReactNode;
  style: any;
  hapticType?: 'light' | 'medium' | 'heavy';
  scaleValue?: number;
  [key: string]: any;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    // Haptic feedback
    if (hapticType === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (hapticType === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (hapticType === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Scale animation
    Animated.spring(scaleAnim, {
      toValue: scaleValue,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePress = () => {
    // Additional success haptic for navigation
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onPress();
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      activeOpacity={1}
      {...props}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Live Activity Ticker Component
const LiveTicker = () => {
  const [messages] = useState([
    "🔥 50+ new listings this week",
    "🎉 Join 500+ Longhorn students", 
    "👀 Amazing deals happening now",
    "⭐ Trusted by your fellow Horns",
  ]);
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      setTimeout(() => {
        setIndex(i => (i + 1) % messages.length);
      }, 300);
    }, 3500);
    return () => clearInterval(interval);
  }, [messages.length, fadeAnim]);

  return (
    <View className="w-full flex items-center py-4 px-6">
      <Animated.View 
        style={{
          opacity: fadeAnim,
        }}
      >
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 24,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fef3c7',
            borderWidth: 0,
          }}
        >
          <Flame size={16} color="#d97706" />
          <Text
            style={{
              color: '#92400e',
              fontWeight: '600',
              marginLeft: 8,
              fontSize: 14,
            }}
          >
            {messages[index]}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

// Hero Section with Enhanced Animations
const HeroSection = () => {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <View className="px-6 mb-8">
      <View 
        style={{
          backgroundColor: 'white',
          borderRadius: 24,
          padding: 28,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        <View className="mb-6">
          <Text className="text-gray-900 text-2xl font-bold mb-3 leading-tight">
            Your campus marketplace awaits
          </Text>
          <Text className="text-gray-600 text-base leading-relaxed">
            Connect with fellow Longhorns to buy, sell, and discover amazing deals right on campus.
          </Text>
        </View>

        <View className="flex-row gap-4 mb-6">
          <AnimatedButton 
            onPress={() => router.push('/create')}
            hapticType="medium"
            scaleValue={0.95}
            style={{
              backgroundColor: COLORS.utOrange,
              paddingHorizontal: 24,
              paddingVertical: 14,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              flex: 1,
              justifyContent: 'center',
              shadowColor: COLORS.utOrange,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Plus size={18} color="white" />
            <Text style={{ color: 'white', fontWeight: '700', marginLeft: 8, fontSize: 16 }}>
              Create Listing
            </Text>
          </AnimatedButton>

          <AnimatedButton 
            onPress={() => router.push('/browse')}
            hapticType="light"
            scaleValue={0.97}
            style={{
              borderColor: '#d1d5db',
              borderWidth: 1.5,
              paddingHorizontal: 24,
              paddingVertical: 14,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              flex: 1,
              justifyContent: 'center',
              backgroundColor: 'white',
            }}
          >
            <Search size={18} color="#6b7280" />
            <Text style={{ color: '#374151', fontWeight: '600', marginLeft: 8, fontSize: 16 }}>
              Browse
            </Text>
          </AnimatedButton>
        </View>

        <View className="flex-row items-center justify-center">
          <Text className="text-2xl mr-2">🤘</Text>
          <Text style={{ color: COLORS.utOrange, fontSize: 13, fontWeight: '700' }}>
            Hook &apos;em Horns!
          </Text>
        </View>
      </View>
    </View>
  );
};

// Modern Categories
const CategoriesSection = () => {
  const router = useRouter();

  return (
    <View className="mb-8">
      <View className="flex-row justify-between items-center px-6 mb-5">
        <Text className="text-xl font-bold text-gray-900">Categories</Text>
        <TouchableOpacity 
          onPress={() => router.push('/browse')}
          className="flex-row items-center"
        >
          <Text style={{ color: COLORS.utOrange, fontWeight: '600', fontSize: 15 }}>See All</Text>
          <ArrowRight size={16} color={COLORS.utOrange} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={categories}
        renderItem={({ item }) => (
          <AnimatedButton 
            onPress={() => router.push({
              pathname: '/browse',
              params: { category: item.name }
            })}
            hapticType="light"
            scaleValue={0.94}
            style={{ marginRight: 16 }}
          >
            <View className="items-center">
              <View
                style={{
                  width: 64,
                  height: 64,
                  backgroundColor: item.color,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                  shadowColor: item.color,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 5,
                  borderWidth: 1,
                  borderColor: '#fed7aa',
                }}
              >
                {item.icon}
              </View>
              <Text className="text-xs text-gray-700 font-medium text-center" style={{ width: 70 }}>
                {item.name}
              </Text>
            </View>
          </AnimatedButton>
        )}
        keyExtractor={item => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 24, paddingRight: 24 }}
      />
    </View>
  );
};

// Trust Badge
const TrustBadge = () => {
  return (
    <View className="px-6 mb-8">
      <View
        style={{
          backgroundColor: '#ecfdf5',
          borderRadius: 16,
          padding: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: '#a7f3d0',
        }}
      >
        <ShieldCheck size={24} color="#059669" />
        <Text style={{ color: '#065f46', fontWeight: '700', fontSize: 16, marginLeft: 12 }}>
          Verified UT Students Only
        </Text>
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [recentListings, setRecentListings] = useState<Item[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    fetchRecentListings();
  }, []);

  const fetchRecentListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('is_sold', false)
        .eq('is_draft', false)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      if (data) {
        setRecentListings(data.map(item => ({
          id: item.id,
          title: item.title,
          price: item.price,
          image: item.images?.[0] || 'https://picsum.photos/200',
          location: item.location
        })));
      }
    } catch (error) {
      console.error('Error fetching recent listings:', error);
    } finally {
      setRecentLoading(false);
    }
  };

  const renderListingItem = ({ item }: { item: Item }) => (
    <AnimatedButton 
      onPress={() => router.push(`/listing/${item.id}`)}
      hapticType="light"
      scaleValue={0.96}
      style={{ marginRight: 16, width: 160 }}
    >
      <View 
        style={{
          backgroundColor: 'white',
          borderRadius: 16,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        <Image
          source={{ uri: item.image }}
          style={{ width: '100%', height: 120 }}
          resizeMode="cover"
        />
        <View className="p-4">
          <Text className="font-semibold text-gray-900 text-sm mb-2" numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={{ color: COLORS.utOrange, fontWeight: 'bold', fontSize: 16 }}>
            ${item.price}
          </Text>
          <Text className="text-gray-500 text-xs mt-1">{item.location}</Text>
        </View>
      </View>
    </AnimatedButton>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: '#fafafa' }}>
      {/* Enhanced Search Bar */}
      <View className="px-6 pt-4 pb-2">
        <AnimatedButton 
          onPress={() => router.push('/browse')}
          hapticType="light"
          scaleValue={0.98}
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            paddingHorizontal: 20,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <Search size={22} color="#9ca3af" />
          <Text className="ml-4 text-gray-500 text-base flex-1">What are you looking for?</Text>
        </AnimatedButton>
      </View>

      {/* Live Ticker */}
      <LiveTicker />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Hero Section */}
        <HeroSection />

        {/* Categories */}
        <CategoriesSection />

        {/* Recent Listings */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center px-6 mb-5">
            <Text className="text-xl font-bold text-gray-900">Recent Listings</Text>
            <TouchableOpacity 
              onPress={() => router.push('/browse')}
              className="flex-row items-center"
            >
              <Text style={{ color: COLORS.utOrange, fontWeight: '600', fontSize: 15 }}>See All</Text>
              <ArrowRight size={16} color={COLORS.utOrange} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
          
          {recentLoading ? (
            <View className="py-12">
              <ActivityIndicator size="large" color={COLORS.utOrange} />
            </View>
          ) : recentListings.length > 0 ? (
            <FlatList
              data={recentListings}
              renderItem={renderListingItem}
              keyExtractor={item => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 24, paddingRight: 24 }}
            />
          ) : (
            <View className="px-6">
              <Text className="text-gray-500 text-center py-12">No recent listings found.</Text>
            </View>
          )}
        </View>

        {/* Trust Badge */}
        <TrustBadge />
      </ScrollView>
    </View>
  );
} 