import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ChatHeader from '../../components/ChatHeader';
import ChatSettingsModal from '../../components/modals/ChatSettingsModal';
import { Message } from '../../types/chat';
import { formatTime, shouldShowTimestamp, buildMessageQuery, isRelevantMessage } from '../../utils/chat';

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const { otherUserName, otherUserId, listingId, listingTitle } = params;
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [otherUserImage, setOtherUserImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const [pressedMessageId, setPressedMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (!otherUserId || !otherUserName) {
      router.back();
      return;
    }

    if (user) {
      fetchMessages();
      fetchOtherUserProfile();
      const subscription = subscribeToMessages();
      
      return () => {
        subscription?.unsubscribe();
      };
    }
  }, [user, otherUserId, otherUserName]);

  const fetchOtherUserProfile = async () => {
    if (!otherUserId) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('profile_image_url')
        .eq('email', otherUserId.toString())
        .single();

      if (error) throw error;
      setOtherUserImage(data?.profile_image_url);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!user?.email || !otherUserId) return;

    const subscription = supabase
      .channel('messages_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const message = (payload.new || payload.old) as Message;
          
          if (!isRelevantMessage(
            message, 
            user?.email || '', 
            otherUserId.toString(), 
            listingId?.toString() || "general"
          )) {
            return;
          }
          
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as Message;
            setMessages(prev => [...prev, newMessage]);
            
            if (newMessage.sender_id === otherUserId) {
              await supabase
                .from('messages')
                .update({ read: true })
                .eq('id', newMessage.id);
            }
          } 
          else if (payload.eventType === 'UPDATE') {
            const updatedMessage = payload.new as Message;
            setMessages(prev => 
              prev.map(msg => 
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            );
          }
          else if (payload.eventType === 'DELETE') {
            const deletedMessage = payload.old as Message;
            setMessages(prev => 
              prev.filter(msg => msg.id !== deletedMessage.id)
            );
          }
        }
      )
      .subscribe();

    return subscription;
  };

  const fetchMessages = async () => {
    if (!user?.email || !otherUserId) return;

    try {
      setLoading(true);
      
      const { data: messages, error } = await buildMessageQuery(
        supabase,
        user.email,
        otherUserId as string,
        (listingId as string) || "general"
      );

      if (error) throw error;

      setMessages(messages || []);

      const unreadMessages = (messages || []).filter(
        (msg: Message) => !msg.read && msg.sender_id === otherUserId
      );

      if (unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ read: true })
          .in(
            'id',
            unreadMessages.map((msg: Message) => msg.id)
          );
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const isValidUUID = (id: string) => typeof id === 'string' && /^[0-9a-fA-F-]{36}$/.test(id);

  const sendMessage = async () => {
    if (!user?.email || !otherUserId || !newMessage.trim()) return;

    try {
      setSending(true);
      
      const messageData = {
        sender_id: user.email,
        receiver_id: otherUserId,
        content: newMessage.trim(),
        listing_id: (listingId === "general" || !isValidUUID(listingId)) ? null : listingId,
        read: false,
      };

      const { error } = await supabase
        .from('messages')
        .insert([messageData]);

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!user?.email || !otherUserId) return;

    try {
      Alert.alert(
        "Delete Conversation",
        "Are you sure you want to delete this conversation? This cannot be undone.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setShowSettings(false);
              const { error } = await supabase
                .from("messages")
                .delete()
                .or(
                  `and(sender_id.eq.${user.email},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.email})`
                )
                .eq("listing_id", listingId === "general" ? null : listingId);

              if (error) {
                Alert.alert("Error", "Failed to delete conversation");
              } else {
                router.back();
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting conversation:', error);
      Alert.alert("Error", "Failed to delete conversation");
    }
  };

  const handleBlock = () => {
    Alert.alert(
      "Block User",
      "Are you sure you want to block this user? You won't receive messages from them.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Block",
          style: "destructive",
          onPress: () => {
            setShowSettings(false);
            // TODO: Implement block functionality
            Alert.alert("Coming Soon", "This feature will be available soon!");
          }
        }
      ]
    );
  };

  const handleReport = () => {
    setShowSettings(false);
    // TODO: Implement report functionality
    Alert.alert("Coming Soon", "This feature will be available soon!");
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#C1501F" />
      </View>
    );
  }

  if (!otherUserId || !otherUserName) {
    return null;
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ChatHeader
        otherUserName={otherUserName.toString()}
        otherUserImage={otherUserImage}
        listingId={listingId?.toString() || "general"}
        listingTitle={listingTitle?.toString() || ""}
        onSettingsPress={() => setShowSettings(true)}
      />

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        className="flex-1 p-4"
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item, index }) => {
          const isOwnMessage = item.sender_id === user?.email;
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showTimestamp = shouldShowTimestamp(item, prevMessage);
          const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
          const isLastInGroup = !nextMessage || nextMessage.sender_id !== item.sender_id;

          return (
            <View>
              <Pressable 
                onLongPress={() => setPressedMessageId(item.id)}
                onPressOut={() => setPressedMessageId(null)}
                className={`flex-row items-end ${
                  isOwnMessage ? 'justify-end' : 'justify-start'
                } ${!isLastInGroup ? 'mb-1' : 'mb-3'}`}
              >
                {!isOwnMessage && (
                  <View className="w-8 h-8 rounded-full bg-gray-200 justify-center items-center mr-2">
                    {otherUserImage ? (
                      <Image
                        source={{ uri: otherUserImage }}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <Text className="text-sm font-semibold text-gray-500">
                        {otherUserName?.[0]?.toUpperCase()}
                      </Text>
                    )}
                  </View>
                )}
                <View 
                  className={`
                    px-4 py-2 rounded-2xl max-w-[75%]
                    ${isOwnMessage 
                      ? 'bg-[#C1501F] rounded-br-sm' 
                      : 'bg-gray-200 rounded-bl-sm'
                    }
                  `}
                >
                  <Text 
                    className={`text-base ${
                      isOwnMessage ? 'text-white' : 'text-black'
                    }`}
                  >
                    {item.content}
                  </Text>
                  {pressedMessageId === item.id && (
                    <Text 
                      className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-white/70' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(item.created_at)}
                    </Text>
                  )}
                </View>
              </Pressable>
              {isLastInGroup && showTimestamp && nextMessage && (
                <Text className="text-gray-500 text-xs text-center my-2">
                  {formatTime(nextMessage.created_at)}
                </Text>
              )}
            </View>
          );
        }}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
      />

      {/* Message Input */}
      <View className="px-4 py-2 border-t border-gray-200 flex-row items-center pb-10">
        <TextInput
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 mr-2"
          placeholder="Message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={sending || !newMessage.trim()}
          className={`
            rounded-full p-2
            ${(!newMessage.trim() || sending) ? 'bg-gray-300' : 'bg-[#C1501F]'}
          `}
        >
          <MaterialIcons 
            name="send" 
            size={24} 
            color="white"
          />
        </TouchableOpacity>
      </View>

      <ChatSettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onBlock={handleBlock}
        onReport={handleReport}
        onDelete={handleDeleteConversation}
      />
    </KeyboardAvoidingView>
  );
} 