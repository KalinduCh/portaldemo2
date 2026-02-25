
// src/hooks/use-fcm.ts
import { useEffect, useState } from 'react';
import type { User } from '@/types';

export function useFcm(user: User | null) {
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermissionStatus(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    
    try {
        const permission = await Notification.requestPermission();
        setNotificationPermissionStatus(permission);
        return permission === 'granted';
    } catch (error) {
        console.error("Error requesting notification permission:", error);
        return false;
    }
  };

  return { requestPermission, notificationPermissionStatus };
}
