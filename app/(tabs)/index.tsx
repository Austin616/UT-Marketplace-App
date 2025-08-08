import { View, Text, ScrollView, TouchableOpacity, Image, FlatList, ActivityIndicator, Animated, Dimensions, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, LogIn, BookOpen, Smartphone, Armchair, Shirt, Home, Wrench, Flame, MessageCircle, Users, Star, CheckCircle, ShieldCheck, Zap, TrendingUp, Eye, Heart, Sparkles, ArrowRight, MapPin, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '~/contexts/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '~/lib/supabase';
import { COLORS } from '~/theme/colors';
import * as Haptics from 'expo-haptics';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSettings } from '~/contexts/SettingsContext';

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
  { id: 1, name: 'Textbooks', icon: <BookOpen size={18} color="#BF5700" />, color: COLORS.iconBg },
  { id: 2, name: 'Electronics', icon: <Smartphone size={18} color="#BF5700" />, color: COLORS.iconBg },
  { id: 3, name: 'Furniture', icon: <Armchair size={18} color="#BF5700" />, color: COLORS.iconBg },
  { id: 4, name: 'Clothing', icon: <Shirt size={18} color="#BF5700" />, color: COLORS.iconBg },
  { id: 5, name: 'Housing', icon: <Home size={18} color="#BF5700" />, color: COLORS.iconBg },
  { id: 6, name: 'Services', icon: <Wrench size={18} color="#BF5700" />, color: COLORS.iconBg },
];


// Home Content Section
const HomeContent = () => {
  const router = useRouter();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    opacity.value = withSpring(0.8, { damping: 15, stiffness: 400 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    opacity.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const getTimeOfDayGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View className="px-6 pb-6 pt-6">
      {/* Greeting */}
      <View className="mb-6">
        <Text className="text-3xl font-black text-gray-900 mb-1">
          {getTimeOfDayGreeting()}
        </Text>
        <Text className="text-lg text-gray-600 font-medium">
          Ready to find something great?
        </Text>
      </View>

      {/* Search Bar */}
      <Reanimated.View style={animatedStyle}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => router.push('/browse')}
          className="bg-white rounded-lg p-4 flex-row items-center border border-gray-200 mb-6"
          style={{
            shadowColor: '#BF5700',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Search size={20} color="#9CA3AF" />
          <Text className="ml-3 text-gray-500 text-base flex-1 font-medium">
            What are you looking for?
          </Text>
          <ChevronRight size={16} color="#9CA3AF" />
        </Pressable>
      </Reanimated.View>

      {/* Quick Actions */}
      <View className="flex-row gap-3">
        <QuickActionCard 
          title="Sell Item"
          description="List something"
          icon={<Plus size={18} color="#BF5700" />}
          onPress={() => router.push('/create')}
        />
        <QuickActionCard 
          title="Browse All"
          description="Find deals"
          icon={<Search size={18} color="#BF5700" />}
          onPress={() => router.push('/browse')}
        />
      </View>
    </View>
  );
};

// Quick Action Card Component
const QuickActionCard = ({ title, description, icon, onPress }: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    opacity.value = withSpring(0.8, { damping: 15, stiffness: 400 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    opacity.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <Reanimated.View style={[{ flex: 1 }, animatedStyle]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        className="bg-white rounded-lg p-4 border border-gray-200 flex-1"
        style={{
          shadowColor: '#BF5700',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View className="w-10 h-10 bg-orange-50 rounded-full items-center justify-center mb-3">
          {icon}
        </View>
        <Text className="text-gray-900 font-bold text-base mb-1">{title}</Text>
        <Text className="text-gray-500 text-sm font-medium">{description}</Text>
      </Pressable>
    </Reanimated.View>
  );
};

// Category Item Component
const CategoryItem = ({ item }: { item: Category }) => {
  const router = useRouter();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    opacity.value = withSpring(0.8, { damping: 15, stiffness: 400 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    opacity.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <Reanimated.View style={animatedStyle}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => router.push({
          pathname: '/browse',
          params: { category: item.name }
        })}
        className="mb-3 flex-row items-center justify-between rounded-lg p-4 border border-gray-200 bg-white mx-6"
        style={{
          shadowColor: '#BF5700',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center gap-4">
          <View className="w-12 h-12 bg-orange-50 rounded-full items-center justify-center">
            {item.icon}
          </View>
          <View>
            <Text className="font-bold text-lg text-gray-900">
              {item.name}
            </Text>
            <Text className="text-sm text-gray-500 font-medium">
              Browse {item.name.toLowerCase()}
            </Text>
          </View>
        </View>
        <ChevronRight size={20} color="#BF5700" />
      </Pressable>
    </Reanimated.View>
  );
};

// Categories Section with UT Dining-style cards
const CategoriesSection = () => {
  const renderCategoryItem = ({ item }: { item: Category }) => (
    <CategoryItem item={item} />
  );

  return (
    <View className="mb-8">
      <View className="px-6 mb-4">
        <Text className="text-2xl font-black text-gray-900 mb-1">Browse Categories</Text>
        <Text className="text-gray-500 font-medium">Find exactly what you need</Text>
      </View>
      
      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={item => item.id.toString()}
        scrollEnabled={false}
        contentContainerStyle={{ paddingBottom: 0 }}
      />
    </View>
  );
};

// Enhanced Trust Section
const TrustSection = () => {
  return (
    <View className="px-6 mb-8">
      <LinearGradient
        colors={['#f0fdf4', '#ecfdf5']}
        style={{
          borderRadius: 20,
          padding: 24,
          borderWidth: 1,
          borderColor: '#bbf7d0',
        }}
      >
        <View className="items-center mb-6">
          <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center mb-4">
            <ShieldCheck size={32} color="#059669" />
          </View>
          <Text className="text-xl font-black text-green-900 text-center mb-2">
            Safe & Secure Trading
          </Text>
          <Text className="text-green-700 text-center font-medium">
            Every user is a verified UT student
          </Text>
        </View>
        
        <View className="flex-row justify-between">
          <View className="items-center flex-1">
            <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mb-2">
              <Users size={18} color="#059669" />
            </View>
            <Text className="text-green-900 font-bold text-lg">500+</Text>
            <Text className="text-green-600 text-xs font-medium">Students</Text>
          </View>
          <View className="items-center flex-1">
            <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mb-2">
              <Star size={18} color="#059669" />
            </View>
            <Text className="text-green-900 font-bold text-lg">4.9★</Text>
            <Text className="text-green-600 text-xs font-medium">Rating</Text>
          </View>
          <View className="items-center flex-1">
            <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mb-2">
              <CheckCircle size={18} color="#059669" />
            </View>
            <Text className="text-green-900 font-bold text-lg">100%</Text>
            <Text className="text-green-600 text-xs font-medium">Verified</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

// Listing Item Component
const ListingItem = ({ item }: { item: Item }) => {
  const router = useRouter();
  const { locationEnabled } = useSettings();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    opacity.value = withSpring(0.8, { damping: 15, stiffness: 400 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    opacity.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <Reanimated.View style={[animatedStyle, { marginRight: 16, width: 170 }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => router.push(`/listing/${item.id}`)}
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          overflow: 'hidden',
          shadowColor: '#BF5700',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
          borderWidth: 1,
          borderColor: 'rgba(191, 87, 0, 0.1)',
        }}
      >
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: item.image }}
            style={{ width: '100%', height: 120 }}
            resizeMode="cover"
          />
          <View style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderRadius: 12,
            padding: 4,
          }}>
            <Heart size={14} color="#ef4444" />
          </View>
        </View>
        <View className="p-4">
          <Text className="font-bold text-gray-900 text-base mb-2" numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={{ color: COLORS.utOrange, fontWeight: '800', fontSize: 16 }}>
            ${item.price}
          </Text>
          {locationEnabled && (
            <View className="flex-row items-center mt-2">
              <MapPin size={12} color="#9ca3af" />
              <Text className="text-gray-500 text-xs ml-1" numberOfLines={1}>{item.location}</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Reanimated.View>
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
    <ListingItem item={item} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>      
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Home Content */}
        <HomeContent />

        {/* Categories */}
        <CategoriesSection />

        {/* Recent Listings */}
        <View className="mb-8">
          <View className="px-6 mb-4">
            <Text className="text-2xl font-black text-gray-900 mb-1">Recent Listings</Text>
            <Text className="text-gray-500 font-medium">Fresh deals from your fellow Horns</Text>
          </View>
          
          {recentLoading ? (
            <View className="py-16">
              <ActivityIndicator size="large" color={COLORS.utOrange} />
              <Text className="text-center text-gray-500 mt-4 font-medium">Loading listings...</Text>
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
              <View className="bg-white rounded-lg p-8 items-center border border-gray-200">
                <Text className="text-6xl mb-4">📦</Text>
                <Text className="text-gray-700 text-center font-bold text-lg mb-2">No listings yet</Text>
                <Text className="text-gray-500 text-center font-medium">Be the first to create a listing!</Text>
              </View>
            </View>
          )}
        </View>

        {/* Trust Section */}
        <TrustSection />
      </ScrollView>
    </View>
  );
} 