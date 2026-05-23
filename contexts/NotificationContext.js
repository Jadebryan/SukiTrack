import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import * as notificationApi from '@/services/notificationApi';
import * as notificationService from '@/services/notificationService';

let Notifications = null;

function getNotifications() {
  if (Notifications === null) {
    try {
      Notifications = require('expo-notifications');
    } catch (error) {
      return null;
    }
  }
  return Notifications;
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const receivedListener = useRef(null);
  const responseListener = useRef(null);

  useEffect(() => {
    const Notif = getNotifications();
    if (!Notif) {
      return;
    }

    receivedListener.current = Notif.addNotificationReceivedListener(
      (notification) => {
        const title = notification.request.content.title || undefined;
        const body = notification.request.content.body || '';
        if (body) {
          showToast({ message: body, type: 'info', durationMs: 5000 });
        }
      }
    );

    responseListener.current = Notif.addNotificationResponseReceivedListener(
      () => {
        // Tapping the system notification is handled by the OS / router.
      }
    );

    return () => {
      receivedListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;

    async function registerPushToken() {
      if (!user?.token) return;
      const deviceId = await notificationService.getDeviceId();
      const existingToken = await notificationService.getStoredPushToken();
      const pushToken = existingToken || (await notificationService.registerExpoPushTokenAsync());
      if (!pushToken) return;
      if (cancelled) return;
      try {
        await notificationApi.registerPushToken({ pushToken, deviceId });
      } catch (e) {
        console.warn('[NotificationProvider] registerPushToken failed', e?.message || e);
      }
    }

    registerPushToken();
    return () => {
      cancelled = true;
    };
  }, [user?.token]);

  return <>{children}</>;
}
