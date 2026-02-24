// src/services/userService.ts
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, updateDoc, deleteDoc, collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
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
  const userRef = doc(db, 'users', uid);
  const placeholderChar = name && name.trim().length > 0 ? name.trim().charAt(0).toUpperCase() : 'U';
  
  const profileData: Partial<User> & { createdAt: any } = { 
    uid,
    email,
    name: name || "Unnamed User",
    role,
    status,
    createdAt: serverTimestamp(),
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

  await setDoc(userRef, profileData);
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    const userName = data.name || ""; 
    const placeholderChar = userName && userName.trim().length > 0 ? userName.trim().charAt(0).toUpperCase() : 'U';

    const userProfile: User = {
        id: userSnap.id,
        name: data.name || "Unnamed User",
        email: data.email,
        photoUrl: data.photoUrl || `https://placehold.co/100x100.png?text=${placeholderChar}`,
        role: data.role,
        status: data.status || 'approved', 
        designation: data.designation,
        nic: data.nic,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        mobileNumber: data.mobileNumber,
        fcmToken: data.fcmToken, 
        pushSubscription: data.pushSubscription, // Include pushSubscription
        membershipFeeStatus: data.membershipFeeStatus || 'pending',
        membershipFeeAmountPaid: data.membershipFeeAmountPaid || 0,
        permissions: data.permissions || {},
     };

     if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        userProfile.createdAt = (data.createdAt as Timestamp).toDate().toISOString();
     }

     return userProfile;
  }
  return null;
}

export async function getAllUsers(): Promise<User[]> {
    const usersRef = collection(db, "users");
    const q = query(usersRef); 
    const querySnapshot = await getDocs(q);
    const fetchedUsers: User[] = [];
    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const userProfile: User = {
            id: docSnap.id, 
            name: data.name,
            email: data.email,
            photoUrl: data.photoUrl,
            role: data.role,
            status: data.status || 'approved',
            designation: data.designation,
            nic: data.nic,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            mobileNumber: data.mobileNumber,
            fcmToken: data.fcmToken,
            pushSubscription: data.pushSubscription,
            membershipFeeStatus: data.membershipFeeStatus || 'pending',
            membershipFeeAmountPaid: data.membershipFeeAmountPaid || 0,
            permissions: data.permissions || {},
        };
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            userProfile.createdAt = (data.createdAt as Timestamp).toDate().toISOString();
        }
        fetchedUsers.push(userProfile);
    });
    return fetchedUsers.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const updateData: { [key: string]: any } = { ...data };
  
  delete updateData.id; 
  delete updateData.createdAt; 
  
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  if (Object.keys(updateData).length > 0) {
    await updateDoc(userRef, updateData);
  }
}

export async function approveUser(uid: string): Promise<void> {
    await updateUserProfile(uid, { status: 'approved' });
}

export async function rejectUser(uid: string): Promise<void> {
    await updateUserProfile(uid, { status: 'rejected' });
}

export async function deleteUserProfile(uid: string): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
}

export async function updatePushSubscription(userId: string, subscription: any): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { pushSubscription: subscription });
}

export async function updateFcmToken(userId: string, token: string | null): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { fcmToken: token });
}
