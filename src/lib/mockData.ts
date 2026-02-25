
import type { User, Event, AttendanceRecord, PointsEntry, ProjectIdea, CommunicationGroup, Transaction, Task } from '@/types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    name: 'Admin User',
    email: 'check22@gmail.com',
    password: '12345KC',
    photoUrl: 'https://i.pravatar.cc/150?u=admin',
    role: 'super_admin',
    status: 'approved',
    createdAt: '2023-01-15T08:00:00Z',
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
    name: 'Sarah Jenkins',
    email: 'sarah@example.com',
    password: 'password123',
    photoUrl: 'https://i.pravatar.cc/150?u=sarah',
    role: 'member',
    status: 'approved',
    createdAt: '2023-02-10T10:30:00Z',
    membershipFeeStatus: 'paid',
    membershipFeeAmountPaid: 1000,
    designation: 'Leo Member',
    mobileNumber: '+15551234567'
  },
  {
    id: 'user-member-2',
    name: 'Michael Chen',
    email: 'michael@example.com',
    password: 'password123',
    photoUrl: 'https://i.pravatar.cc/150?u=michael',
    role: 'member',
    status: 'approved',
    createdAt: '2023-03-05T14:20:00Z',
    membershipFeeStatus: 'pending',
    membershipFeeAmountPaid: 0,
    designation: 'Leo Member'
  },
  {
    id: 'user-member-3',
    name: 'Emily Rodriguez',
    email: 'emily@example.com',
    password: 'password123',
    photoUrl: 'https://i.pravatar.cc/150?u=emily',
    role: 'member',
    status: 'approved',
    createdAt: '2023-04-12T09:15:00Z',
    membershipFeeStatus: 'partial',
    membershipFeeAmountPaid: 500,
    designation: 'Leo Member'
  },
  {
    id: 'user-pending',
    name: 'Alex Thompson',
    email: 'alex@example.com',
    password: 'password123',
    photoUrl: 'https://i.pravatar.cc/150?u=alex',
    role: 'member',
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
];

const now = new Date();
const pastDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 2 weeks ago
const ongoingDateStart = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago
const ongoingDateEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week from now

export const INITIAL_EVENTS: Event[] = [
  {
    id: 'event-past',
    name: 'Beach Cleanup 2023',
    startDate: pastDate.toISOString(),
    endDate: new Date(pastDate.getTime() + 4 * 60 * 60 * 1000).toISOString(),
    description: 'Our annual beach cleanup project to preserve the local coastline.',
    location: 'Sunset Beach',
    reminderSent: true,
    eventType: 'club_project',
    points: 15
  },
  {
    id: 'event-ongoing',
    name: 'Monthly Strategy Meeting',
    startDate: ongoingDateStart.toISOString(),
    endDate: ongoingDateEnd.toISOString(),
    description: 'Current ongoing meeting to discuss next month\'s activities.',
    location: 'Main Conference Room / Zoom',
    reminderSent: true,
    eventType: 'other',
    points: 5
  },
  {
    id: 'event-future',
    name: 'Community Food Drive',
    startDate: futureDate.toISOString(),
    endDate: new Date(futureDate.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Collecting non-perishable food items for local families in need.',
    location: 'City Square',
    reminderSent: false,
    eventType: 'district_project',
    points: 20
  }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-1',
    eventId: 'event-past',
    userId: 'user-member-1',
    timestamp: pastDate.toISOString(),
    status: 'present',
    attendanceType: 'member'
  },
  {
    id: 'att-2',
    eventId: 'event-past',
    userId: 'user-member-2',
    timestamp: pastDate.toISOString(),
    status: 'present',
    attendanceType: 'member'
  },
  {
    id: 'att-3',
    eventId: 'event-past',
    visitorName: 'John Smith',
    visitorClub: 'Neighboring Leo Club',
    timestamp: pastDate.toISOString(),
    status: 'present',
    attendanceType: 'visitor'
  }
];

export const INITIAL_POINTS: PointsEntry[] = [
  {
    id: 'pts-1',
    userId: 'user-member-1',
    userName: 'Sarah Jenkins',
    date: pastDate.toISOString(),
    description: 'Participation in Beach Cleanup',
    points: 15,
    category: 'participation',
    projectName: 'Beach Cleanup 2023',
    addedBy: 'Admin User',
    createdAt: pastDate.toISOString(),
    eventId: 'event-past'
  },
  {
    id: 'pts-2',
    userId: 'user-member-2',
    userName: 'Michael Chen',
    date: pastDate.toISOString(),
    description: 'Participation in Beach Cleanup',
    points: 15,
    category: 'participation',
    projectName: 'Beach Cleanup 2023',
    addedBy: 'Admin User',
    createdAt: pastDate.toISOString(),
    eventId: 'event-past'
  }
];

export const INITIAL_PROJECT_IDEAS: ProjectIdea[] = [
  {
    id: 'idea-1',
    projectName: 'Tree Planting Initiative',
    goal: 'Plant 500 trees in the city park.',
    targetAudience: 'Local residents and environment enthusiasts.',
    budget: '$2000',
    timeline: '3 months',
    projectIdea: 'A collaborative effort with the city council to increase green cover.',
    proposedActionPlan: {
      objective: 'Environmental conservation',
      preEventPlan: ['Survey site', 'Procure saplings'],
      executionPlan: ['Tree planting event', 'Volunteer coordination'],
      postEventPlan: ['Regular watering', 'Growth monitoring']
    },
    implementationChallenges: ['Securing water source'],
    challengeSolutions: ['Coordinate with fire department'],
    communityInvolvement: ['Local schools'],
    prPlan: [{ activity: 'Social media campaign', date: '2024-06-01', time: '10:00' }],
    estimatedExpenses: [{ item: 'Saplings', cost: '1500' }],
    resourcePersonals: ['City Arborist'],
    status: 'approved',
    authorId: 'user-member-1',
    authorName: 'Sarah Jenkins',
    createdAt: '2024-05-10T11:00:00Z',
    updatedAt: '2024-05-15T09:00:00Z'
  },
  {
    id: 'idea-2',
    projectName: 'Digital Literacy Workshop',
    goal: 'Teach senior citizens basic computer skills.',
    targetAudience: 'Seniors in the community.',
    budget: '$500',
    timeline: '1 month',
    projectIdea: 'Weekly workshops held at the community library.',
    proposedActionPlan: {
      objective: 'Bridge digital divide',
      preEventPlan: ['Curriculum development'],
      executionPlan: ['4 weekly sessions'],
      postEventPlan: ['Feedback collection']
    },
    implementationChallenges: ['Finding enough laptops'],
    challengeSolutions: ['Member contributions'],
    communityInvolvement: ['Public library'],
    prPlan: [{ activity: 'Flyers in library', date: '2024-07-01', time: '09:00' }],
    estimatedExpenses: [{ item: 'Printing flyers', cost: '50' }],
    resourcePersonals: ['IT students'],
    status: 'pending_review',
    authorId: 'user-member-3',
    authorName: 'Emily Rodriguez',
    createdAt: '2024-05-20T15:30:00Z',
    updatedAt: '2024-05-20T15:30:00Z'
  }
];

export const INITIAL_GROUPS: CommunicationGroup[] = [
  {
    id: 'group-1',
    name: 'Executive Board',
    memberIds: ['user-admin', 'user-member-1'],
    createdAt: '2023-01-20T10:00:00Z',
    color: '#3b82f6'
  },
  {
    id: 'group-2',
    name: 'Service Project Committee',
    memberIds: ['user-member-1', 'user-member-2', 'user-member-3'],
    createdAt: '2023-02-15T11:00:00Z',
    color: '#10b981'
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'trans-1',
    type: 'income',
    date: '2024-01-05T00:00:00Z',
    amount: 5000,
    category: 'Donations',
    source: 'Annual Gala Fundraiser',
    createdAt: '2024-01-05T12:00:00Z'
  },
  {
    id: 'trans-2',
    type: 'expense',
    date: pastDate.toISOString(),
    amount: 350,
    category: 'Project Costs',
    source: 'Beach Cleanup supplies',
    notes: 'Gloves, bags, and water for volunteers',
    createdAt: pastDate.toISOString()
  },
  {
    id: 'trans-3',
    type: 'income',
    date: '2024-02-15T00:00:00Z',
    amount: 1000,
    category: 'Membership Fees',
    source: 'Sarah Jenkins',
    createdAt: '2024-02-15T10:00:00Z'
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Confirm Food Drive Location',
    description: 'Need to get formal approval from the city square management.',
    status: 'todo',
    priority: 'high',
    dueDate: futureDate.toISOString(),
    assigneeIds: ['user-member-1'],
    eventId: 'event-future',
    eventName: 'Community Food Drive',
    checklist: [
      { id: 'ck-1', text: 'Call management', completed: false },
      { id: 'ck-2', text: 'Send formal email', completed: false }
    ],
    createdBy: 'user-admin',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  },
  {
    id: 'task-2',
    title: 'Design Flyers',
    description: 'Create eye-catching flyers for the food drive.',
    status: 'in_progress',
    priority: 'medium',
    assigneeIds: ['user-member-3'],
    checklist: [],
    createdBy: 'user-admin',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  },
  {
    id: 'task-3',
    title: 'Inventory Audit',
    description: 'Check stock of cleanup kits.',
    status: 'done',
    priority: 'low',
    assigneeIds: ['user-member-2'],
    checklist: [],
    createdBy: 'user-admin',
    createdAt: pastDate.toISOString(),
    updatedAt: pastDate.toISOString()
  }
];
