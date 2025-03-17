import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_SETTINGS_KEY = 'notificationSettings';

export interface NotificationSettings {
  timerEnd: boolean;
  overtime: boolean;
  overtimeReminder: boolean;
  longestPause: boolean;
  achievements: boolean;
}

const defaultSettings: NotificationSettings = {
  timerEnd: true,
  overtime: true,
  overtimeReminder: true,
  longestPause: true,
  achievements: true,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const useNotifications = () => {
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  const registerForPushNotificationsAsync = async () => {
    if (Platform.OS === 'web') return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
  };

  const loadNotificationSettings = async (): Promise<NotificationSettings> => {
    try {
      const settings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      return settings ? JSON.parse(settings) : defaultSettings;
    } catch (error) {
      console.error('Error loading notification settings:', error);
      return defaultSettings;
    }
  };

  const saveNotificationSettings = async (settings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      return false;
    }
  };

  const scheduleTimerEndNotification = async (minutes: number) => {
    if (Platform.OS === 'web') return;
    
    const settings = await loadNotificationSettings();
    if (!settings.timerEnd) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Dags att spotta ut!',
        body: 'Din snustid är slut.',
      },
      trigger: {
        seconds: minutes * 60,
      },
    });
  };

  const scheduleOvertimeNotification = async () => {
    if (Platform.OS === 'web') return;
    
    const settings = await loadNotificationSettings();
    if (!settings.overtime) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Övertid!',
        body: 'Du har nu gått över din rekommenderade snustid.',
      },
      trigger: {
        seconds: 1,
      },
    });
  };

  const scheduleOvertimeReminderNotification = async () => {
    if (Platform.OS === 'web') return;
    
    const settings = await loadNotificationSettings();
    if (!settings.overtimeReminder) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Fortfarande övertid',
        body: 'Du har haft snusen inne i 30 minuter över rekommenderad tid.',
      },
      trigger: {
        seconds: 30 * 60,
      },
    });
  };

  const sendLongestPauseNotification = async () => {
    if (Platform.OS === 'web') return;
    
    const settings = await loadNotificationSettings();
    if (!settings.longestPause) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Nytt rekord!',
        body: 'Du har just slagit ditt rekord för längsta paus utan snus!',
      },
      trigger: null,
    });
  };

  const sendAchievementNotification = async (title: string, description: string) => {
    if (Platform.OS === 'web') return;
    
    const settings = await loadNotificationSettings();
    if (!settings.achievements) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Ny prestation upplåst!',
        body: `${title}: ${description}`,
      },
      trigger: null,
    });
  };

  const cancelAllNotifications = async () => {
    if (Platform.OS === 'web') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  };

  return {
    loadNotificationSettings,
    saveNotificationSettings,
    scheduleTimerEndNotification,
    scheduleOvertimeNotification,
    scheduleOvertimeReminderNotification,
    sendLongestPauseNotification,
    sendAchievementNotification,
    cancelAllNotifications,
  };
};