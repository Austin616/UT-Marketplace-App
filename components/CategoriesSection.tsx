import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Sofa, Home, Laptop, Car, Book, Shirt, Utensils, ShoppingBag, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '~/theme/colors';
import { AnimatedButton } from './AnimatedButton';

interface Category {
  id: number;
  name: string;
  icon: React.ReactNode;
  color: string;
}

const categories: Category[] = [
  { id: 1, name: 'Furniture', icon: <Sofa size={18} color={COLORS.utOrange} />, color: COLORS.iconBg },
  { id: 2, name: 'Housing', icon: <Home size={18} color={COLORS.utOrange} />, color: COLORS.iconBg },
  { id: 3, name: 'Tech', icon: <Laptop size={18} color={COLORS.utOrange} />, color: COLORS.iconBg },
  { id: 4, name: 'Vehicles', icon: <Car size={18} color={COLORS.utOrange} />, color: COLORS.iconBg },
  { id: 5, name: 'Books', icon: <Book size={18} color={COLORS.utOrange} />, color: COLORS.iconBg },
  { id: 6, name: 'Clothing', icon: <Shirt size={18} color={COLORS.utOrange} />, color: COLORS.iconBg },
  { id: 7, name: 'Kitchen', icon: <Utensils size={18} color={COLORS.utOrange} />, color: COLORS.iconBg },
  { id: 8, name: 'Other', icon: <ShoppingBag size={18} color={COLORS.utOrange} />, color: COLORS.iconBg },
];

export const CategoriesSection = () => {
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