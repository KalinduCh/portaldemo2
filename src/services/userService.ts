
// src/services/userService.ts
import { mockDb } from '@/lib/mockDb';
import type { User, UserRole } from '@/types';

export async function createUserProfile(
  uid: string, 
  email: string, 
  name: string, 
  role: UserRole = 'member',
  status: 'pending' | 'approved' | 'rejected' = 'pending',
  photoUrl?: string,
  nic?: string,
  dateOfBirth?: string,
  gender?: string,
  mobileNumber?: string,
  designation?: string
): Promise<void> {
  const placeholderChar = name && name.trim().length > 0 ? name.trim().charAt(0).toUpperCase() : 'U';
  
  const profileData: User = {
    id: uid,
    email,
    name: name || "Unnamed User",
    role,
    status,
    createdAt: new Date().toISOString(),
    photoUrl: photoUrl || `https://placehold.co/100x100.png?text=${placeholderChar}`,
    membershipFeeStatus: 'pending',
    membershipFeeAmountPaid: 0,
    permissions: role === 'admin' ? { 
        members: true,
        events: true,
        finance: true,
        communication: true,
        project_ideas: true,
        reports: true,
        leaderboard: true,
    } : {}
  };

  if (nic) profileData.nic = nic;
  if (dateOfBirth) profileData.dateOfBirth = dateOfBirth;
  if (gender) profileData.gender = gender;
  if (mobileNumber) profileData.mobileNumber = mobileNumber;
  if (designation) profileData.designation = designation;

  mockDb.create('users', profileData);
}

export async function getUserProfile(uid: string): Promise<User | null> {
  return mockDb.getOne('users', uid) || null;
}

export async function getAllUsers(): Promise<User[]> {
    const users = mockDb.getAll('users') as User[];
    return [...users].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
  mockDb.update('users', uid, data);
}

export async function approveUser(uid: string): Promise<void> {
    await updateUserProfile(uid, { status: 'approved' });
}

export async function rejectUser(uid: string): Promise<void> {
    await updateUserProfile(uid, { status: 'rejected' });
}

export async function deleteUserProfile(uid: string): Promise<void> {
    mockDb.delete('users', uid);
}

export async function updatePushSubscription(userId: string, subscription: any): Promise<void> {
    mockDb.update('users', userId, { pushSubscription: subscription });
}

export async function updateFcmToken(userId: string, token: string | null): Promise<void> {
    mockDb.update('users', userId, { fcmToken: token });
}
