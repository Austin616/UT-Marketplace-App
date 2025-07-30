import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Calendar, Star, MessageCircle } from 'lucide-react-native';
import { COLORS } from '~/theme/colors';
import { supabase } from '~/lib/supabase';
import { useAuth } from '~/contexts/AuthContext';
import { getTimeAgo } from '~/utils/timeago';
import UserRatingDisplay from '~/components/UserRatingDisplay';

interface Rating {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  rater_id: string;
  rater_name: string;
}

export default function ReviewsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avgRating, setAvgRating] = useState<number | null>(null);

  const fetchRatings = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      
      // Fetch ratings
      const { data: ratingsData } = await supabase
        .from('ratings')
        .select('*')
        .eq('rated_id', user.email)
        .order('created_at', { ascending: false });
      
      // Get rater names for each rating
      const formattedRatings = [];
      if (ratingsData) {
        for (const rating of ratingsData) {
          const { data: raterData } = await supabase
            .from('user_settings')
            .select('display_name')
            .eq('email', rating.rater_id)
            .single();
          
          formattedRatings.push({
            ...rating,
            rater_name: raterData?.display_name || rating.rater_id || 'Anonymous User'
          });
        }
      }
      
      setRatings(formattedRatings);
      
      // Calculate average rating
      if (formattedRatings.length > 0) {
        const avg = formattedRatings.reduce((sum, r) => sum + Number(r.rating), 0) / formattedRatings.length;
        setAvgRating(avg);
      } else {
        setAvgRating(null);
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRatings();
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.utOrange} />
        <Text className="text-gray-500 mt-4 text-lg">Loading reviews...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={24} color={COLORS.utOrange} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Reviews</Text>
          <View className="w-6" />
        </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Rating Summary */}
        <View className="bg-white mx-4 mt-4 rounded-2xl p-6 shadow-sm">
          <View className="items-center">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Overall Rating</Text>
            {avgRating ? (
              <>
                <View className="flex-row items-center mb-2">
                  <Text className="text-4xl font-bold text-gray-900 mr-2">
                    {avgRating.toFixed(1)}
                  </Text>
                  <Star size={32} color="#FFB800" fill="#FFB800" />
                </View>
                <Text className="text-gray-600 mb-4">
                  Based on {ratings.length} review{ratings.length !== 1 ? 's' : ''}
                </Text>
                <UserRatingDisplay userId={user?.email || ''} rating={avgRating} />
              </>
            ) : (
              <View className="py-8">
                <Text className="text-gray-400 text-center text-lg">No reviews yet</Text>
                <Text className="text-gray-500 text-center mt-2">
                  Complete some transactions to receive reviews
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Reviews List */}
        {ratings.length > 0 && (
          <View className="bg-white mx-4 mt-4 mb-6 rounded-2xl shadow-sm overflow-hidden">
            <View className="px-6 py-4 border-b border-gray-100">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-gray-900">All Reviews</Text>
                <View className="bg-yellow-500 rounded-full px-3 py-1">
                  <Text className="text-white font-semibold text-sm">{ratings.length}</Text>
                </View>
              </View>
            </View>

            <View className="px-6 py-4">
              {ratings.map((item, index) => (
                <View key={item.id} className="py-4 border-b border-gray-100 last:border-b-0">
                  <View className="flex-row items-center justify-between mb-3">
                    <TouchableOpacity 
                      className="flex-row items-center"
                      onPress={() => router.push({
                        pathname: '/profile/[userId]',
                        params: { userId: item.rater_id }
                      })}
                      activeOpacity={0.8}
                    >
                      <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: COLORS.utOrange }}>
                        <Text className="text-white font-bold text-lg">
                          {item.rater_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text className="font-semibold text-gray-900 text-lg">{item.rater_name}</Text>
                        <View className="flex-row items-center mt-1">
                          <Calendar size={12} color="#6b7280" />
                          <Text className="text-gray-500 text-xs ml-1">{getTimeAgo(item.created_at)}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    
                    <View className="bg-gray-50 rounded-full px-3 py-1">
                      <View className="flex-row items-center">
                        <Text className="font-bold text-gray-900 mr-1">{item.rating}</Text>
                        <Star size={14} color="#FFB800" fill="#FFB800" />
                      </View>
                    </View>
                  </View>
                  
                  {item.comment && (
                    <Text className="text-gray-700 text-base leading-relaxed bg-gray-50 rounded-xl p-4">
                      {item.comment}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {ratings.length === 0 && (
          <View className="bg-white mx-4 mt-4 mb-6 rounded-2xl p-8 shadow-sm">
            <View className="items-center">
              <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
                <MessageCircle size={32} color="#9ca3af" />
              </View>
              <Text className="text-xl font-semibold text-gray-900 mb-2">No Reviews Yet</Text>
              <Text className="text-gray-600 text-center leading-relaxed">
                Start selling and providing great service to receive your first reviews from buyers.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}