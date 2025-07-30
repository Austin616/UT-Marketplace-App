import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Star, X, Send } from 'lucide-react-native';
import { COLORS } from '~/theme/colors';
import { supabase } from '~/lib/supabase';
import { useAuth } from '~/contexts/AuthContext';

interface RatingSubmissionModalProps {
  visible: boolean;
  onClose: () => void;
  ratedUserId: string;
  ratedUserName: string;
  onRatingSubmitted: () => void;
}

export const RatingSubmissionModal: React.FC<RatingSubmissionModalProps> = ({
  visible,
  onClose,
  ratedUserId,
  ratedUserName,
  onRatingSubmitted
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStarPress = (starNumber: number) => {
    setRating(starNumber);
  };

  const handleSubmit = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'Please sign in to submit a rating');
      return;
    }

    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }

    if (user.email === ratedUserId) {
      Alert.alert('Error', 'You cannot rate yourself');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if user has already rated this person
      const { data: existingRating } = await supabase
        .from('ratings')
        .select('id')
        .eq('rater_id', user.email)
        .eq('rated_id', ratedUserId)
        .single();

      if (existingRating) {
        Alert.alert(
          'Already Rated', 
          'You have already rated this user. Would you like to update your rating?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Update', onPress: () => updateRating() }
          ]
        );
        return;
      }

      // Insert new rating
      const { error } = await supabase
        .from('ratings')
        .insert({
          rater_id: user.email,
          rated_id: ratedUserId,
          rating: rating,
          comment: comment.trim() || null,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      Alert.alert(
        'Rating Submitted',
        'Thank you for your feedback!',
        [
          { text: 'Add Another Rating', style: 'default', onPress: () => {
            setRating(0);
            setComment('');
            onRatingSubmitted();
          }},
          { text: 'Done', style: 'default', onPress: handleSuccess }
        ]
      );

    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateRating = async () => {
    try {
      const { error } = await supabase
        .from('ratings')
        .update({
          rating: rating,
          comment: comment.trim() || null,
          created_at: new Date().toISOString()
        })
        .eq('rater_id', user.email)
        .eq('rated_id', ratedUserId);

      if (error) throw error;

      Alert.alert(
        'Rating Updated',
        'Your rating has been updated!',
        [
          { text: 'Update Another', style: 'default', onPress: () => {
            setRating(0);
            setComment('');
            onRatingSubmitted();
          }},
          { text: 'Done', style: 'default', onPress: handleSuccess }
        ]
      );

    } catch (error) {
      console.error('Error updating rating:', error);
      Alert.alert('Error', 'Failed to update rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccess = () => {
    setRating(0);
    setComment('');
    onRatingSubmitted();
    onClose();
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl overflow-hidden" style={{ maxHeight: '80%', minHeight: '60%' }}>
          {/* Header */}
          <View className="flex-row items-center justify-between p-6 border-b border-gray-200">
            <Text className="text-xl font-bold text-gray-900">Rate User</Text>
            <TouchableOpacity onPress={handleClose} className="p-2">
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            className="flex-1" 
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            <View className="p-6">
              {/* User Info */}
              <View className="items-center mb-6">
                <View className="w-16 h-16 bg-gray-200 rounded-full items-center justify-center mb-3">
                  <Text className="text-2xl font-bold text-gray-600">
                    {ratedUserName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text className="text-lg font-semibold text-gray-900">
                  Rating {ratedUserName}
                </Text>
                <Text className="text-gray-600 text-center mt-1">
                  Share your experience with this user
                </Text>
              </View>

              {/* Star Rating */}
              <View className="items-center mb-6">
                <Text className="text-base font-medium text-gray-900 mb-4">
                  How would you rate this user?
                </Text>
                <View className="flex-row gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => handleStarPress(star)}
                      className="p-1"
                    >
                      <Star
                        size={40}
                        color={star <= rating ? '#FFB800' : '#D1D5DB'}
                        fill={star <= rating ? '#FFB800' : 'transparent'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                {rating > 0 && (
                  <Text className="text-gray-600 mt-2">
                    {rating === 1 && 'Poor'}
                    {rating === 2 && 'Fair'}
                    {rating === 3 && 'Good'}
                    {rating === 4 && 'Very Good'}
                    {rating === 5 && 'Excellent'}
                  </Text>
                )}
              </View>

              {/* Comment */}
              <View className="mb-6">
                <Text className="text-base font-medium text-gray-900 mb-3">
                  Add a comment (optional)
                </Text>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Share details about your experience..."
                  multiline
                  numberOfLines={4}
                  className="border border-gray-300 rounded-xl p-4 text-base text-gray-900 bg-gray-50"
                  style={{ textAlignVertical: 'top' }}
                  maxLength={500}
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onSubmitEditing={() => {
                    if (rating > 0 && !isSubmitting) {
                      handleSubmit();
                    }
                  }}
                />
                <Text className="text-gray-500 text-sm mt-2 text-right">
                  {comment.length}/500
                </Text>
              </View>

              {/* Guidelines */}
              <View className="bg-blue-50 rounded-xl p-4 mb-6">
                <Text className="text-sm font-medium text-blue-900 mb-2">
                  Rating Guidelines
                </Text>
                <Text className="text-sm text-blue-800 leading-relaxed">
                  • Be honest and fair in your rating{'\n'}
                  • Focus on the user&apos;s communication and reliability{'\n'}
                  • Keep comments respectful and constructive{'\n'}
                  • Avoid personal information or inappropriate content
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View className="p-6 border-t border-gray-200">
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              className={`rounded-xl py-4 flex-row items-center justify-center ${
                rating === 0 || isSubmitting
                  ? 'bg-gray-300'
                  : 'bg-orange-600'
              }`}
              style={rating > 0 && !isSubmitting ? { backgroundColor: COLORS.utOrange } : {}}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Send size={20} color="white" />
                  <Text className="text-white font-bold text-lg ml-2">
                    Submit Rating
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};