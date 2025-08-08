import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsContextType {
  notificationsEnabled: boolean;
  darkModeEnabled: boolean;
  locationEnabled: boolean;
  hapticFeedbackEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setDarkModeEnabled: (enabled: boolean) => Promise<void>;
  setLocationEnabled: (enabled: boolean) => Promise<void>;
  setHapticFeedbackEnabled: (enabled: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [darkModeEnabled, setDarkModeEnabledState] = useState(false);
  const [locationEnabled, setLocationEnabledState] = useState(true);
  const [hapticFeedbackEnabled, setHapticFeedbackEnabledState] = useState(true);

  const loadSettings = async () => {
    try {
      const [notifications, darkMode, location, haptic] = await Promise.all([
        AsyncStorage.getItem('notificationsEnabled'),
        AsyncStorage.getItem('darkModeEnabled'),
        AsyncStorage.getItem('locationEnabled'),
        AsyncStorage.getItem('hapticFeedbackEnabled'),
      ]);

      if (notifications !== null) setNotificationsEnabledState(JSON.parse(notifications));
      if (darkMode !== null) setDarkModeEnabledState(JSON.parse(darkMode));
      if (location !== null) setLocationEnabledState(JSON.parse(location));
      if (haptic !== null) setHapticFeedbackEnabledState(JSON.parse(haptic));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSetting = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
    }
  };

  const setNotificationsEnabled = async (enabled: boolean) => {
    setNotificationsEnabledState(enabled);
    await saveSetting('notificationsEnabled', enabled);
  };

  const setDarkModeEnabled = async (enabled: boolean) => {
    setDarkModeEnabledState(enabled);
    await saveSetting('darkModeEnabled', enabled);
  };

  const setLocationEnabled = async (enabled: boolean) => {
    setLocationEnabledState(enabled);
    await saveSetting('locationEnabled', enabled);
  };

  const setHapticFeedbackEnabled = async (enabled: boolean) => {
    setHapticFeedbackEnabledState(enabled);
    await saveSetting('hapticFeedbackEnabled', enabled);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const value = {
    notificationsEnabled,
    darkModeEnabled,
    locationEnabled,
    hapticFeedbackEnabled,
    setNotificationsEnabled,
    setDarkModeEnabled,
    setLocationEnabled,
    setHapticFeedbackEnabled,
    loadSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};