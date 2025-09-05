import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '~/lib/supabase';
import { useAuth } from '~/contexts/AuthContext';
import { COLORS } from '~/theme/colors';
import Dropdown from '~/components/ui/Dropdown';
import * as ImagePicker from 'expo-image-picker';
import { 
  FileText, 
  Tag, 
  DollarSign, 
  Star, 
  MapPin, 
  Camera, 
  X, 
  Plus,
  Save
} from 'lucide-react-native';

const categories = [
  'Select a category',
  'Furniture',
  'Subleases', 
  'Tech',
  'Vehicles',
  'Textbooks',
  'Clothing',
  'Kitchen',
  'Other',
] as const;

const conditions = [
  'Select condition',
  'New',
  'Like New',
  'Good',
  'Fair',
  'Poor',
] as const;

const locations = [
  'Select a location',
  'West Campus',
  'North Campus',
  'Riverside',
  'UT Campus',
  'Jester Circle',
  'PCL',
  'Union Starbucks',
  'Greg Gym',
  'Littlefield Fountain',
  'Dobie',
  'Other',
] as const;

interface Listing {
  id: string;
  title: string;
  price: number;
  description: string;
  images: string[];
  category: string;
  condition: string;
  location: string;
  user_id: string;
}

export default function EditListingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listing, setListing] = useState<Listing | null>(null);
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<typeof categories[number]>('Select a category');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<typeof locations[number]>('Select a location');
  const [condition, setCondition] = useState<typeof conditions[number]>('Select condition');
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    fetchListing();
  }, [id]);

  const fetchListing = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Listing not found');

      // Check if user owns this listing
      if (user?.id !== data.user_id) {
        Alert.alert('Error', 'You can only edit your own listings');
        router.back();
        return;
      }

      setListing(data);
      setTitle(data.title);
      
      // Convert database values back to UI format
      const convertFromDbFormat = (value: string, type: 'category' | 'condition') => {
        if (type === 'category') {
          const categoryMap: Record<string, string> = {
            'furniture': 'Furniture',
            'subleases': 'Subleases', 
            'tech': 'Tech',
            'vehicles': 'Vehicles',
            'textbooks': 'Textbooks',
            'clothing': 'Clothing',
            'kitchen': 'Kitchen',
            'other': 'Other'
          };
          return categoryMap[value] || value.charAt(0).toUpperCase() + value.slice(1);
        } else if (type === 'condition') {
          const conditionMap: Record<string, string> = {
            'like_new': 'Like New',
            'good': 'Good',
            'fair': 'Fair',
            'poor': 'Poor'
          };
          return conditionMap[value] || value.charAt(0).toUpperCase() + value.slice(1);
        }
        return value.charAt(0).toUpperCase() + value.slice(1);
      };
      
      setCategory(convertFromDbFormat(data.category, 'category') as typeof categories[number]);
      setPrice(data.price.toString());
      setDescription(data.description);
      setLocation(data.location as typeof locations[number]);
      setCondition(convertFromDbFormat(data.condition, 'condition') as typeof conditions[number]);
      setImages(data.images || []);
      
    } catch (error) {
      console.error('Error fetching listing:', error);
      Alert.alert('Error', 'Failed to load listing');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages(prev => [...prev, ...newImages].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const isValid = title && 
    category !== 'Select a category' && 
    price && 
    description && 
    location !== 'Select a location' && 
    condition !== 'Select condition';

  // Helper function to convert UI values to database enum values
  const convertToDbFormat = (value: string, type: 'category' | 'condition') => {
    if (type === 'category') {
      // Convert UI category names to database enum values
      const categoryMap: Record<string, string> = {
        'Furniture': 'furniture',
        'Subleases': 'subleases', 
        'Tech': 'tech',
        'Vehicles': 'vehicles',
        'Textbooks': 'textbooks',
        'Clothing': 'clothing',
        'Kitchen': 'kitchen',
        'Other': 'other'
      };
      return categoryMap[value] || value.toLowerCase();
    } else if (type === 'condition') {
      // Convert UI condition names to database enum values
      const conditionMap: Record<string, string> = {
        'Like New': 'like_new',
        'Good': 'good',
        'Fair': 'fair',
        'Poor': 'poor'
      };
      return conditionMap[value] || value.toLowerCase();
    }
    return value.toLowerCase();
  };

  const handleSave = async () => {
    if (!isValid || !listing) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('listings')
        .update({
          title,
          category: convertToDbFormat(category, 'category'),
          price: parseFloat(price),
          description,
          location,
          condition: convertToDbFormat(condition, 'condition'),
          images,
        })
        .eq('id', listing.id);

      if (error) throw error;

      Alert.alert('Success', 'Listing updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      
    } catch (error) {
      console.error('Error updating listing:', error);
      Alert.alert('Error', 'Failed to update listing');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.utOrange} />
          <Text className="text-gray-500 mt-4">Loading listing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} style={{ backgroundColor: 'white' }}>
          <View className="p-6">
            {/* Header Section */}
            <View className="items-center mb-8">
              <View className="w-16 h-16 bg-orange-50 rounded-full items-center justify-center mb-4">
                <FileText size={28} color={COLORS.utOrange} />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2">Edit Your Listing</Text>
              <Text className="text-gray-600 text-center text-base leading-6">
                Update your listing details and photos
              </Text>
            </View>
              {/* Images Section */}
              <View className="mb-6">
                <View className="flex-row items-center mb-3">
                  <View className="w-8 h-8 bg-blue-50 rounded-full items-center justify-center mr-3">
                    <Camera size={16} color="#3B82F6" />
                  </View>
                  <Text className="text-sm font-semibold text-gray-700">Photos</Text>
                </View>
                <Text className="text-xs text-gray-500 mb-3">Add up to 5 photos</Text>
                
                <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                  {images.map((uri, index) => (
                    <View key={index} className="relative" style={{ width: '30%', aspectRatio: 1 }}>
                      <View className="w-full h-full rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
                        <Image source={{ uri }} className="w-full h-full" resizeMode="cover" />
                        <TouchableOpacity
                          onPress={() => removeImage(index)}
                          className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full items-center justify-center shadow-lg"
                        >
                          <X size={14} color="white" />
                        </TouchableOpacity>
                      </View>
                      <View className="absolute bottom-2 left-2 bg-black/60 rounded-full w-6 h-6 items-center justify-center">
                        <Text className="text-white text-xs font-bold">{index + 1}</Text>
                      </View>
                    </View>
                  ))}
                  {images.length < 5 && (
                    <View style={{ width: '30%', aspectRatio: 1 }}>
                      <TouchableOpacity
                        onPress={pickImage}
                        className="w-full h-full rounded-2xl items-center justify-center border-2 border-dashed"
                        style={{ borderColor: '#C1501F', backgroundColor: '#FFF7ED' }}
                      >
                        <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center mb-2">
                          <Plus size={20} color={COLORS.utOrange} />
                        </View>
                        <Text className="text-xs font-semibold" style={{ color: '#C1501F' }}>
                          Add Photo
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {images.length > 0 && (
                  <View className="mt-4 pt-4 border-t border-gray-100">
                    <Text className="text-sm font-medium text-gray-700">
                      Photos added: {images.length}/5
                    </Text>
                  </View>
                )}
              </View>

              <View className="mb-5">
                <View className="flex-row items-center mb-2">
                  <View className="w-8 h-8 bg-blue-50 rounded-full items-center justify-center mr-3">
                    <FileText size={16} color="#3B82F6" />
                  </View>
                  <Text className="text-sm font-semibold text-gray-700">Title</Text>
                </View>
                <TextInput
                  className="text-base bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus:border-blue-200"
                  placeholder="What are you selling?"
                  value={title}
                  onChangeText={setTitle}
                  placeholderTextColor="#9CA3AF"
                  style={{ fontSize: 16 }}
                />
              </View>

              <View className="mb-5">
                <View className="flex-row items-center mb-2">
                  <View className="w-8 h-8 bg-purple-50 rounded-full items-center justify-center mr-3">
                    <Tag size={16} color="#8B5CF6" />
                  </View>
                  <Text className="text-sm font-semibold text-gray-700">Category</Text>
                </View>
                <Dropdown
                  value={category}
                  options={categories}
                  onSelect={(value) => setCategory(value as typeof categories[number])}
                  placeholder="Select a category"
                />
              </View>

              <View className="mb-5">
                <View className="flex-row items-center mb-2">
                  <View className="w-8 h-8 bg-green-50 rounded-full items-center justify-center mr-3">
                    <DollarSign size={16} color="#10B981" />
                  </View>
                  <Text className="text-sm font-semibold text-gray-700">Price</Text>
                </View>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus-within:border-green-200">
                  <Text className="text-gray-500 mr-2 text-base font-medium">$</Text>
                  <TextInput
                    className="flex-1 text-base p-0"
                    placeholder="0.00"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    placeholderTextColor="#9CA3AF"
                    style={{ fontSize: 16 }}
                  />
                </View>
              </View>

              <View className="mb-5">
                <View className="flex-row items-center mb-2">
                  <View className="w-8 h-8 bg-yellow-50 rounded-full items-center justify-center mr-3">
                    <Star size={16} color="#F59E0B" />
                  </View>
                  <Text className="text-sm font-semibold text-gray-700">Condition</Text>
                </View>
                <Dropdown
                  value={condition}
                  options={conditions}
                  onSelect={(value) => setCondition(value as typeof conditions[number])}
                  placeholder="Select condition"
                />
              </View>

              <View className="mb-5">
                <View className="flex-row items-center mb-2">
                  <View className="w-8 h-8 bg-red-50 rounded-full items-center justify-center mr-3">
                    <MapPin size={16} color="#EF4444" />
                  </View>
                  <Text className="text-sm font-semibold text-gray-700">Location</Text>
                </View>
                <Dropdown
                  value={location}
                  options={locations}
                  onSelect={(value) => setLocation(value as typeof locations[number])}
                  placeholder="Select a location"
                />
              </View>

              <View>
                <View className="flex-row items-center mb-2">
                  <View className="w-8 h-8 bg-indigo-50 rounded-full items-center justify-center mr-3">
                    <FileText size={16} color="#6366F1" />
                  </View>
                  <Text className="text-sm font-semibold text-gray-700">Description</Text>
                </View>
                <TextInput
                  className="text-base bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus:border-indigo-200"
                  placeholder="Describe your item in detail..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor="#9CA3AF"
                  style={{ fontSize: 16, minHeight: 100 }}
                />
              </View>
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View className="px-4 py-3 border-t mb-8 border-gray-100 flex-row gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-1 flex-row items-center justify-center py-3.5 rounded-xl border-2"
            style={{ borderColor: COLORS.utOrange }}
          >
            <Text className="font-medium" style={{ color: COLORS.utOrange }}>
              Cancel
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleSave}
            disabled={!isValid || saving}
            className={`flex-1 flex-row items-center justify-center py-3.5 rounded-xl ${
              isValid && !saving ? 'bg-[#C1501F]' : 'bg-gray-100'
            }`}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Text className={`font-medium mr-2 ${isValid && !saving ? 'text-white' : 'text-gray-400'}`}>
                  Save Changes
                </Text>
                <Save 
                  size={20} 
                  color={isValid && !saving ? 'white' : '#9CA3AF'} 
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}