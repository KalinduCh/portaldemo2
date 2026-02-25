
import type { User, Event, AttendanceRecord, PointsEntry, ProjectIdea, CommunicationGroup, Transaction, Task } from '@/types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    name: 'Admin User',
    email: 'check22@gmail.com',
    password: '12345KC',
    photoUrl: 'https://placehold.co/100x100.png?text=A',
    role: 'super_admin',
    status: 'approved',
    createdAt: new Date().toISOString(),
    membershipFeeStatus: 'paid',
    membershipFeeAmountPaid: 1000,
    permissions: {
      members: true,
      events: true,
      finance: true,
      communication: true,
      project_ideas: true,
      reports: true,
      leaderboard: true,
    }
  },
  {
    id: 'user-member-1',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    photoUrl: 'https://placehold.co/100x100.png?text=J',
    role: 'member',
    status: 'approved',
    createdAt: new Date().toISOString(),
    membershipFeeStatus: 'pending',
    membershipFeeAmountPaid: 0,
  }
];

export const INITIAL_EVENTS: Event[] = [
  {
    id: 'event-1',
    name: 'Annual Charity Drive',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Join us for our annual charity drive.',
    location: 'Community Hall, Downtown',
    reminderSent: false,
    eventType: 'district_project',
    points: 10
  }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];
export const INITIAL_POINTS: PointsEntry[] = [];
export const INITIAL_PROJECT_IDEAS: ProjectIdea[] = [];
export const INITIAL_GROUPS: CommunicationGroup[] = [];
export const INITIAL_TRANSACTIONS: Transaction[] = [];
export const INITIAL_TASKS: Task[] = [];
