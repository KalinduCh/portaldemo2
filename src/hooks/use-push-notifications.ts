// src/hooks/use-push-notifications.ts
import { useState, useEffect, useCallback } from 'react';
import { updatePushSubscription } from '@/services/userService';
import type { User } from '@/types';

const VAPID_PUBLIC_KEY = "BIc9bH71DzSMqmg3pBlve0gm14FLcVAh4EacFVw4Ovg4uEd3k11ETlLIimkEinqQgObmFoOLWdKb4ZKCN1Nn-oM";

/**
 * Hook to manage standard Web Push subscriptions.
 * Optimized for iOS 16.4+ PWAs.
 */
export function usePushNotifications(user: User | null) {
  const [permission, setPermission] = useState<NotificationPermission | 'default'>(
    typeof window !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSubscribing, setIsSubscribing] = useState(false);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeUser = useCallback(async () => {
    if (typeof window === 'undefined' || !user || !('serviceWorker' in navigator)) {
        return false;
    }

    setIsSubscribing(true);
    try {
      // 1. Request permission (iOS 16.4+ requires user gesture)
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        throw new Error('Permission not granted for notifications');
      }

      // 2. Wait for SW to be ready
      const registration = await navigator.serviceWorker.ready;

      // 3. Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // 4. Create new subscription
        const subscribeOptions = {
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        };
        subscription = await registration.pushManager.subscribe(subscribeOptions);
      }

      // 5. Save to Firestore
      const subscriptionJson = subscription.toJSON();
      await updatePushSubscription(user.id, subscriptionJson);
      
      console.log('Successfully subscribed to Web Push:', subscriptionJson);
      return true;
    } catch (error) {
      console.error('Failed to subscribe user:', error);
      return false;
    } finally {
      setIsSubscribing(false);
    }
  }, [user]);

  // Check if current device is iOS and not added to home screen
  const isIosPwaEligible = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    return isIos && !isStandalone;
  }, []);

  return {
    permission,
    isSubscribing,
    subscribeUser,
    isIosPwaEligible: isIosPwaEligible()
  };
}
