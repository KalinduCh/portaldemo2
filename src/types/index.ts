import type { ReactElement, ElementType } from 'react';

export type UserRole = 'super_admin' | 'admin' | 'member';

export type BadgeId = 'club_leader' | 'top_volunteer' | 'active_leo';

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  icon: ElementType;
}

export type AdminPermission = 'members' | 'events' | 'finance' | 'communication' | 'project_ideas' | 'reports' | 'leaderboard';

export interface User {
  id: string; 
  name: string;
  email: string;
  photoUrl?: string;
  role: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string; 
  designation?: string;
  nic?: string;
  dateOfBirth?: string; 
  gender?: string;
  mobileNumber?: string;
  badges?: BadgeId[];
  fcmToken?: string; // Kept for backward compatibility
  pushSubscription?: any; // Standard PushSubscription JSON object
  membershipFeeStatus?: 'paid' | 'pending' | 'partial';
  membershipFeeAmountPaid?: number;
  permissions?: Partial<Record<AdminPermission, boolean>>;
}

export type EventType = 'club_project' | 'district_project' | 'joint_project' | 'official_visit' | 'deadline' | 'other';

export interface Event {
  id: string; 
  name: string;
  startDate: string; 
  endDate?: string; 
  description: string;
  location: string; 
  latitude?: number;  
  longitude?: number; 
  reminderSent: boolean; 
  eventType?: EventType;
  points?: number;
}

export interface PointsEntry {
  id: string;
  userId: string;
  userName: string;
  date: string; 
  description: string;
  points: number;
  category: 'role' | 'participation' | 'other';
  projectName?: string; 
  addedBy: string; 
  createdAt: string; 
  eventId?: string; 
}

export interface AttendanceRecord {
  id: string; 
  eventId: string;
  timestamp: string; 
  status: 'present'; 
  attendanceType: 'member' | 'visitor';
  userId?: string; 
  visitorName?: string;
  visitorDesignation?: string;
  visitorClub?: string;
  visitorComment?: string;
  markedLatitude?: number;
  markedLongitude?: number;
}

export interface ProjectIdea {
    id: string; 
    projectName: string;
    goal: string;
    targetAudience: string;
    budget: string;
    timeline: string;
    specialConsiderations?: string;
    projectIdea: string;
    proposedActionPlan: {
        objective: string;
        preEventPlan: string[];
        executionPlan: string[];
        postEventPlan: string[];
    };
    implementationChallenges: string[];
    challengeSolutions: string[];
    communityInvolvement: string[];
    prPlan: {
        activity: string;
        date: string;
        time: string;
    }[];
    estimatedExpenses: {
        item: string;
        cost: string;
    }[];
    resourcePersonals: string[];
    status: 'draft' | 'pending_review' | 'needs_revision' | 'approved' | 'declined';
    authorId: string;
    authorName: string;
    createdAt: string; 
    updatedAt: string; 
    adminFeedback?: string; 
}

export interface EventParticipantSummary {
  id: string; 
  attendanceTimestamp: string; 
  type: 'member' | 'visitor';
  userName?: string; 
  userEmail?: string;
  userRole?: UserRole;
  userDesignation?: string;
  userPhotoUrl?: string;
  userNic?: string; 
  visitorName?: string;
  visitorDesignation?: string;
  visitorClub?: string;
  visitorComment?: string;
}

export interface CommunicationGroup {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string; 
  color?: string; 
}

export interface Transaction {
    id: string;
    type: 'income' | 'expense';
    date: string; 
    amount: number;
    category: string;
    source: string; 
    notes?: string;
    createdAt: string; 
}

export interface FinancialCategory {
    id: string;
    name: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskChecklistItem {
    id: string;
    text: string;
    completed: boolean;
}

export interface TaskComment {
    id: string;
    authorId: string;
    authorName: string;
    authorPhotoUrl?: string;
    content: string;
    createdAt: string;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string;
    assigneeIds: string[];
    eventId?: string; 
    eventName?: string; 
    checklist: TaskChecklistItem[];
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
