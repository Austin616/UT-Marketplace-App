import { Stack } from 'expo-router';

export default function ChatLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={
          {
            headerShown: false,
          }
        }
      />
    </Stack>
  );
} 