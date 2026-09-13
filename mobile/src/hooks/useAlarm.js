import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { RING_PATTERN } from '../utils/constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowListBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export default function useAlarm(soundEnabled = true) {
  useEffect(() => {
    async function ensureAndroidChannel() {
      if (Platform.OS !== 'android') return;
      await Notifications.setNotificationChannelAsync('alarm', {
        name: 'Wakework alarms',
        importance: Notifications.AndroidImportance.MAX,
        sound: soundEnabled ? 'default' : null,
        vibrationPattern: soundEnabled ? RING_PATTERN : null,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC
      });
    }
    ensureAndroidChannel();
  }, [soundEnabled]);

  const scheduleAlarmNotification = async (date, body) => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return Notifications.scheduleNotificationAsync({
      content: {
        title: 'Wakework — time to work',
        body: body || 'Get up and start your session.',
        sound: soundEnabled ? 'default' : null,
      },
      trigger: { type: 'date', date, channelId: 'alarm' }
    });
  };

  const dismissAll = async () => {
    await Notifications.dismissAllNotificationsAsync();
  };

  return { scheduleAlarmNotification, dismissAll };
}
