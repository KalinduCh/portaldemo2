
// src/services/offlineSyncService.ts
'use client';
import { bulkAddAttendance } from './attendanceService';

const OFFLINE_ATTENDANCE_QUEUE_KEY = 'offline_attendance_queue';

type QueuedAttendanceRecord = any; 

export function isOfflineError(error: any): boolean {
  return false;
}

function getQueue(): QueuedAttendanceRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const storedQueue = localStorage.getItem(OFFLINE_ATTENDANCE_QUEUE_KEY);
    return storedQueue ? JSON.parse(storedQueue) : [];
  } catch (error) {
    console.error("Error parsing offline queue:", error);
    return [];
  }
}

function saveQueue(queue: QueuedAttendanceRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_ATTENDANCE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Error saving offline queue:", error);
  }
}

export async function addOfflineAttendance(record: any): Promise<void> {
  const queue = getQueue();
  const newRecord = { ...record, clientId: `offline_${Date.now()}` };
  queue.push(newRecord);
  saveQueue(queue);
}

export async function syncOfflineAttendance(): Promise<number> {
  const queue = getQueue();
  if (queue.length === 0) return 0;
  
  try {
    await bulkAddAttendance(queue);
    saveQueue([]);
    return queue.length;
  } catch (error) {
    console.error("Offline sync: Failed to sync records.", error);
    throw error;
  }
}
