import { View, Text, TouchableOpacity, ScrollView, Alert, Image, TextInput, ActivityIndicator, Switch, Linking , useColorScheme } from 'react-native';
import { useAuth } from '~/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { LogOut, Camera, User, Save, Bell, Shield, HelpCircle, Mail, Star, Moon, Globe, Info, MessageCircle, Code, ExternalLink } from 'lucide-react-native';
import ModalHeader from '~/components/layout/ModalHeader';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect } from 'react';
import { supabase } from '~/lib/supabase';
import { decode } from 'base64-arraybuffer';
import { COLORS } from '~/theme/colors';
import { useSettings } from '~/contexts/SettingsContext';

interface UserSettings {
  display_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [bio, setBio] = useState('');
  const [editingBio, setEditingBio] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const colorScheme = useColorScheme();
  const {
    notificationsEnabled,
    darkModeEnabled,
    locationEnabled,
    hapticFeedbackEnabled,
    setNotificationsEnabled,
    setDarkModeEnabled,
    setLocationEnabled,
    setHapticFeedbackEnabled
  } = useSettings();

  useEffect(() => {
    if (user) fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setSettings(data);
      setBio(data?.bio || '');
      setDisplayName(data?.display_name || '');
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleToggleDarkMode = async () => {
    Alert.alert('Coming Soon', 'Dark mode is coming soon!');
  };

  const handleSaveBio = async () => {
    if (!user?.email) return;

    try {
      setSavingBio(true);
      const { error } = await supabase
        .from('users')
        .update({ bio })
        .eq('id', user.id);

      if (error) throw error;
      setSettings(prev => prev ? { ...prev, bio } : null);
      setEditingBio(false);
    } catch (error) {
      console.error('Error saving bio:', error);
      Alert.alert('Error', 'Failed to save bio. Please try again.');
    } finally {
      setSavingBio(false);
    }
  };

  const handleSaveDisplayName = async () => {
    if (!user?.email) return;

    try {
      setSavingDisplayName(true);
      const { error } = await supabase
        .from('users')
        .update({ display_name: displayName })
        .eq('id', user.id);

      if (error) throw error;
      setSettings(prev => prev ? { ...prev, display_name: displayName } : null);
      setEditingDisplayName(false);
    } catch (error) {
      console.error('Error saving display name:', error);
      Alert.alert('Error', 'Failed to save display name. Please try again.');
    } finally {
      setSavingDisplayName(false);
    }
  };

  const handleImagePick = async () => {
    try {
      setLoading(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        
        if (!file.base64) {
          Alert.alert('Error', 'Failed to process image. Please try again.');
          return;
        }

        if (!user?.id || !user?.email) {
          Alert.alert('Error', 'User information not available. Please try signing in again.');
          return;
        }

        const filePath = `${user.email}/profile/${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, decode(file.base64), {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          Alert.alert('Upload Error', uploadError.message || 'Failed to upload image');
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        const { error: updateError } = await supabase
          .from('users')
          .update({ profile_image_url: publicUrl })
          .eq('id', user.id);

        if (updateError) {
          console.error('Database update error:', updateError);
          Alert.alert('Update Error', updateError.message || 'Failed to update profile');
          return;
        }

        setSettings(prev => prev ? { ...prev, profile_image_url: publicUrl } : null);
        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', error.message || 'Failed to upload image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/welcome');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign out');
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ModalHeader title="Settings" />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <View className="mx-5 mb-6">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity onPress={handleImagePick} disabled={loading}>
              {settings?.profile_image_url ? (
                <Image
                  source={{ uri: settings.profile_image_url }}
                  className="w-16 h-16 rounded-full bg-gray-100"
                />
              ) : (
                <View className="w-16 h-16 rounded-full bg-orange-50 items-center justify-center">
                  <User size={26} color={COLORS.utOrange} />
                </View>
              )}
            </TouchableOpacity>
            <View className="ml-4">
              <Text className="text-base font-semibold text-gray-900">
                {settings?.display_name || (user?.email ? user.email.split('@')[0] : 'User')}
              </Text>
              <TouchableOpacity onPress={handleImagePick} disabled={loading}>
                <Text className="text-xs text-gray-500 mt-1">
                  {loading ? 'Uploading...' : 'Change photo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="border-t border-gray-100 pt-4">
            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-600 mb-2">Display name</Text>
              {editingDisplayName ? (
                <View>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Enter your display name"
                    className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-base"
                    autoFocus
                    style={{ fontSize: 16 }}
                  />
                  <View className="flex-row gap-3 mt-3">
                    <TouchableOpacity
                      onPress={handleSaveDisplayName}
                      disabled={savingDisplayName}
                      className="flex-1 rounded-xl py-3 items-center"
                      style={{ backgroundColor: COLORS.utOrange }}
                    >
                      {savingDisplayName ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text className="text-white font-semibold">Save</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingDisplayName(false);
                        setDisplayName(settings?.display_name || '');
                      }}
                      className="flex-1 bg-gray-100 rounded-xl py-3 items-center"
                    >
                      <Text className="text-gray-600 font-semibold">Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setEditingDisplayName(true)}
                  className="flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
                >
                  <Text className="text-gray-900 text-base">
                    {settings?.display_name || 'Add a display name'}
                  </Text>
                  <Text className="text-sm font-semibold" style={{ color: COLORS.utOrange }}>
                    Edit
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View>
              <Text className="text-xs font-semibold text-gray-600 mb-2">Bio</Text>
              {editingBio ? (
                <View>
                  <TextInput
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Write something about yourself..."
                    multiline
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-gray-800"
                    placeholderTextColor="#9CA3AF"
                    style={{ minHeight: 110, fontSize: 16, textAlignVertical: 'top' }}
                  />
                  <View className="flex-row gap-3 mt-3">
                    <TouchableOpacity
                      onPress={() => {
                        setEditingBio(false);
                        setBio(settings?.bio || '');
                      }}
                      className="flex-1 bg-gray-100 rounded-xl py-3 items-center"
                    >
                      <Text className="text-gray-600 font-semibold">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSaveBio}
                      disabled={savingBio}
                      className="flex-1 rounded-xl py-3 items-center"
                      style={{ backgroundColor: COLORS.utOrange }}
                    >
                      {savingBio ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text className="text-white font-semibold">Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setEditingBio(true)}
                  className="flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
                >
                  <Text className="text-gray-900 text-base">
                    {settings?.bio || 'Add a short bio'}
                  </Text>
                  <Text className="text-sm font-semibold" style={{ color: COLORS.utOrange }}>
                    Edit
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Preferences */}
        <View className="mx-5 mb-6">
          <Text className="text-xs font-semibold text-gray-500 mb-2">Preferences</Text>
          <View className="border-t border-gray-100">
            <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <Bell size={18} color={COLORS.utOrange} />
                <Text className="ml-3 text-base text-gray-900">Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#D1D5DB', true: COLORS.utOrange }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <Moon size={18} color={COLORS.utOrange} />
                <Text className="ml-3 text-base text-gray-900">Dark Mode</Text>
              </View>
              <Switch
                value={darkModeEnabled}
                onValueChange={handleToggleDarkMode}
                trackColor={{ false: '#D1D5DB', true: COLORS.utOrange }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <Globe size={18} color={COLORS.utOrange} />
                <Text className="ml-3 text-base text-gray-900">Location Services</Text>
              </View>
              <Switch
                value={locationEnabled}
                onValueChange={setLocationEnabled}
                trackColor={{ false: '#D1D5DB', true: COLORS.utOrange }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="flex-row items-center justify-between py-4">
              <View className="flex-row items-center">
                <MessageCircle size={18} color={COLORS.utOrange} />
                <Text className="ml-3 text-base text-gray-900">Haptic Feedback</Text>
              </View>
              <Switch
                value={hapticFeedbackEnabled}
                onValueChange={setHapticFeedbackEnabled}
                trackColor={{ false: '#D1D5DB', true: COLORS.utOrange }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>





        {/* About */}
        <View className="mx-5 mb-6">
          <Text className="text-xs font-semibold text-gray-500 mb-2">About</Text>
          <View className="border-t border-gray-100">
            <View className="py-4 border-b border-gray-100">
              <Text className="text-base text-gray-900">UT Marketplace</Text>
              <Text className="text-xs text-gray-500 mt-1">Built for UT students</Text>
            </View>
            <View className="py-4 border-b border-gray-100">
              <TouchableOpacity
                onPress={() => Linking.openURL('https://apps.apple.com/')}
                className="flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <Star size={18} color={COLORS.utOrange} />
                  <Text className="ml-3 text-base text-gray-900">Rate the app</Text>
                </View>
                <ExternalLink size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <View className="py-4 border-b border-gray-100">
              <TouchableOpacity
                onPress={() => Linking.openURL('https://github.com/austin616/utmarketplace')}
                className="flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <Code size={18} color={COLORS.utOrange} />
                  <Text className="ml-3 text-base text-gray-900">Source code</Text>
                </View>
                <ExternalLink size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <View className="py-4 border-b border-gray-100">
              <TouchableOpacity
                onPress={() => Linking.openURL('https://github.com/austin616/utmarketplace/issues')}
                className="flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <HelpCircle size={18} color={COLORS.utOrange} />
                  <Text className="ml-3 text-base text-gray-900">Report issues</Text>
                </View>
                <ExternalLink size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <View className="py-4 border-b border-gray-100">
              <TouchableOpacity
                onPress={() => Linking.openURL('mailto:austintran616@utexas.edu?subject=UT Marketplace Support')}
                className="flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <Mail size={18} color={COLORS.utOrange} />
                  <Text className="ml-3 text-base text-gray-900">Contact support</Text>
                </View>
                <ExternalLink size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <View className="py-4">
              <TouchableOpacity
                onPress={() => Linking.openURL('https://github.com/austin616/utmarketplace/blob/main/PRIVACY_POLICY.md')}
                className="flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <Shield size={18} color={COLORS.utOrange} />
                  <Text className="ml-3 text-base text-gray-900">Privacy policy</Text>
                </View>
                <ExternalLink size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* App Info */}
        <View className="mx-5 mb-6">
          <View className="flex-row items-center justify-between py-3 border-t border-gray-100">
            <View className="flex-row items-center">
              <Info size={16} color={COLORS.utOrange} />
              <Text className="ml-3 text-sm text-gray-700">UT Marketplace v1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Sign Out */}
        <View className="mx-5 mb-8">
          <TouchableOpacity
            onPress={handleSignOut}
            className="flex-row items-center py-4 border-t border-gray-100"
            activeOpacity={0.8}
          >
            <LogOut size={18} color="#DC2626" />
            <Text className="ml-3 text-base text-red-600 font-semibold">Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
} 
