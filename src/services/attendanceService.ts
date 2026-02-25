
// src/services/attendanceService.ts
import { mockDb } from '@/lib/mockDb';
import type { AttendanceRecord } from '@/types';
import type { VisitorAttendanceFormValues } from '@/components/events/visitor-attendance-form';

export interface MarkAttendanceResult {
  status: 'success' | 'already_marked' | 'error' | 'offline_queued';
  message: string;
  record?: AttendanceRecord;
}

export async function markUserAttendance(
  eventId: string,
  userId: string,
  markedLatitude?: number,
  markedLongitude?: number
): Promise<MarkAttendanceResult> {
  const existingAttendance = await getUserAttendanceForEvent(eventId, userId);
  if (existingAttendance) {
    return {
      status: 'already_marked',
      message: 'Attendance already marked for this event.',
      record: existingAttendance
    };
  }

  const attendanceData: any = {
    eventId,
    userId,
    status: 'present',
    attendanceType: 'member',
    timestamp: new Date().toISOString(),
  };

  if (markedLatitude !== undefined && markedLongitude !== undefined) {
    attendanceData.markedLatitude = markedLatitude;
    attendanceData.markedLongitude = markedLongitude;
  }

  const newRecord = mockDb.create('attendance', attendanceData) as AttendanceRecord;
  return { status: 'success', message: 'Your attendance has been recorded.', record: newRecord };
}

export async function markVisitorAttendance(
  eventId: string,
  visitorData: VisitorAttendanceFormValues,
  markedLatitude?: number,
  markedLongitude?: number
): Promise<MarkAttendanceResult> {
  const attendanceData: any = {
    eventId,
    status: 'present',
    attendanceType: 'visitor',
    visitorName: visitorData.name,
    visitorDesignation: visitorData.designation,
    visitorClub: visitorData.club,
    visitorComment: visitorData.comment || '',
    timestamp: new Date().toISOString(),
  };

  if (markedLatitude !== undefined && markedLongitude !== undefined) {
    attendanceData.markedLatitude = markedLatitude;
    attendanceData.markedLongitude = markedLongitude;
  }

  mockDb.create('attendance', attendanceData);
  return { status: 'success', message: 'Your attendance has been recorded.' };
}


export async function getUserAttendanceForEvent(
  eventId: string,
  userId: string
): Promise<AttendanceRecord | null> {
  const records = mockDb.find('attendance', (r) => r.eventId === eventId && r.userId === userId && r.attendanceType === 'member');
  return records.length > 0 ? records[0] : null;
}

export async function getAttendanceRecordsForUser(userId: string): Promise<AttendanceRecord[]> {
  return (mockDb.find('attendance', (r) => r.userId === userId && r.attendanceType === 'member') as AttendanceRecord[])
    .sort((a: AttendanceRecord, b: AttendanceRecord) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getAttendanceRecordsForEvent(eventId: string): Promise<AttendanceRecord[]> {
  return (mockDb.find('attendance', (r) => r.eventId === eventId) as AttendanceRecord[])
    .sort((a: AttendanceRecord, b: AttendanceRecord) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  const records = mockDb.getAll('attendance') as AttendanceRecord[];
  return [...records].sort((a: AttendanceRecord, b: AttendanceRecord) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function bulkAddAttendance(records: any[]): Promise<void> {
  records.forEach(record => {
    mockDb.create('attendance', record);
  });
}
