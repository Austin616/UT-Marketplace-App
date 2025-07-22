import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  listing_id?: string;
}

interface Conversation {
  user_id: string;
  user_name: string;
  user_image?: string;
  listing_id: string;
  listing_title: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();
      subscribeToMessages();
    }
  }, [user]);

  const subscribeToMessages = () => {
    if (!user?.email) return;

    const messagesSubscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.email}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          if (newMessage.sender_id === user.email || newMessage.receiver_id === user.email) {
            fetchConversations();
          }
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
    };
  };

  const fetchConversations = async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      // Fetch all messages for the current user
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.email},receiver_id.eq.${user.email}`)
        .order("created_at", { ascending: false });

      if (messagesError) throw messagesError;

      const userEmail = user.email;
      const filteredMessages = messagesData?.filter(
        (msg) => msg.sender_id === userEmail || msg.receiver_id === userEmail
      ) || [];

      // Group by user_id and listing_id
      const conversationMap = new Map<string, Conversation>();
      for (const message of filteredMessages) {
        const partnerId = message.sender_id === user.email ? message.receiver_id : message.sender_id;
        const listingId = message.listing_id || "general";
        const key = `${partnerId}:${listingId}`;

        if (!conversationMap.has(key)) {
          conversationMap.set(key, {
            user_id: partnerId,
            user_name: "", // We'll fetch this later
            user_image: undefined,
            listing_id: listingId,
            listing_title: "",
            last_message: message.content,
            last_message_time: message.created_at,
            unread_count: message.receiver_id === user.email && !message.read ? 1 : 0,
          });
        } else {
          const conv = conversationMap.get(key)!;
          if (message.receiver_id === user.email && !message.read) {
            conv.unread_count++;
          }
        }
      }

      // Fetch user settings for all partner IDs
      const partnerIds = Array.from(conversationMap.values()).map((c) => c.user_id);
      const listingIds = Array.from(conversationMap.values())
        .map((c) => c.listing_id)
        .filter((id) => id !== "general");

      const { data: userSettingsData } = await supabase
        .from('user_settings')
        .select('email, display_name, profile_image_url')
        .in('email', partnerIds);

      // Fetch listing titles
      const { data: listingData } = await supabase
        .from("listings")
        .select("id, title")
        .in("id", listingIds.length > 0 ? listingIds : [""]);

      // Update conversation map with user info and listing titles
      for (const conv of conversationMap.values()) {
        const userSettings = userSettingsData?.find((u) => u.email === conv.user_id);
        if (userSettings) {
          conv.user_name = userSettings.display_name || conv.user_id;
          conv.user_image = userSettings.profile_image_url;
        }
        const listing = listingData?.find((l) => l.id === conv.listing_id);
        if (listing) {
          conv.listing_title = listing.title;
        }
      }

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m`;
    } else if (hours < 24) {
      return `${hours}h`;
    } else {
      return `${days}d`;
    }
  };

  const isValidUUID = (id: string) => typeof id === 'string' && /^[0-9a-fA-F-]{36}$/.test(id);

  const navigateToChat = (conversation: Conversation) => {
    router.push({
      pathname: '/chat/[id]',
      params: { 
        id: `${conversation.user_id}:${isValidUUID(conversation.listing_id) ? conversation.listing_id : 'general'}`,
        otherUserName: conversation.user_name,
        otherUserId: conversation.user_id,
        listingId: isValidUUID(conversation.listing_id) ? conversation.listing_id : 'general',
        listingTitle: conversation.listing_title
      }
    });
  };

  if (!user) {
    return (
      <View className="flex-1 bg-white px-4 justify-center">
        <Text className="text-xl text-center text-gray-600">
          Please sign in to view your messages
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#C1501F" />
      </View>
    );
  }

  if (conversations.length === 0) {
  return (
      <View className="flex-1 bg-white px-4 py-8">
        <View className="items-center">
          <View className="w-16 h-16 bg-orange-100 rounded-full items-center justify-center mb-4">
            <MaterialIcons name="forum" size={32} color="#C1501F" />
          </View>
          <Text className="text-xl font-semibold text-center mb-2">No conversations yet</Text>
          <Text className="text-gray-600 text-center mb-6">
            Start messaging with other Longhorns by browsing listings and reaching out to sellers.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/browse')}
            className="bg-[#C1501F] px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-medium">Browse Listings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={conversations}
        keyExtractor={(item) => `${item.user_id}:${item.listing_id}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigateToChat(item)}
            className="flex-row items-center px-4 py-3 border-b border-gray-100"
          >
            {/* Profile Picture */}
            <View className="w-12 h-12 rounded-full bg-gray-200 justify-center items-center mr-3">
              {item.user_image ? (
                <Image
                  source={{ uri: item.user_image }}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <Text className="text-lg font-semibold text-gray-500">
                  {item.user_name[0]?.toUpperCase()}
                </Text>
              )}
            </View>

            {/* Message Preview */}
            <View className="flex-1">
              <View className="flex-row justify-between items-center">
                <Text className="font-semibold text-base">
                  {item.user_name}
                </Text>
                {item.last_message_time && (
                  <Text className="text-gray-500 text-sm">
                    {formatTimestamp(item.last_message_time)}
                  </Text>
                )}
      </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-gray-600" numberOfLines={1}>
                  {item.listing_title || "General Chat"}
                </Text>
                {item.unread_count > 0 && (
                  <View className="bg-[#C1501F] rounded-full w-5 h-5 items-center justify-center">
                    <Text className="text-white text-xs">
                      {item.unread_count}
                    </Text>
                  </View>
                )}
              </View>

              {item.last_message && (
                <Text className="text-gray-500 text-sm" numberOfLines={1}>
                  {item.last_message}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
} 