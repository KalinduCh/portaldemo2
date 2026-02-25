
// src/hooks/use-auth.tsx
"use client";

import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react';
import { mockDb } from '@/lib/mockDb';
import { getAllUsers, createUserProfile, getUserProfile } from '@/services/userService';
import type { User } from '@/types';
import { useToast } from './use-toast';
import { useRouter } from 'next/navigation';

export type AdminViewMode = 'admin_view' | 'member_view';
const SUPER_ADMIN_EMAIL = "check22@gmail.com";

export interface LoginResult {
  user: User | null;
  success: boolean;
  reason?: 'pending' | 'not_found' | 'invalid_credentials';
}

export interface PasswordResetResult {
    success: boolean;
    message?: string;
    error?: any; 
}

interface AuthState {
  user: User | null;
  firebaseUser: any | null;
  isLoading: boolean;
  isAuthOperationInProgress: boolean;
  adminViewMode: AdminViewMode;
  setAdminViewMode: (mode: AdminViewMode) => void;
  login: (email: string, pass: string) => Promise<LoginResult>;
  signup: (name: string, email: string, pass: string) => Promise<User | null>;
  logout: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<PasswordResetResult>;
  performAdminAuthOperation: (asyncTask: () => Promise<void>) => Promise<void>;
  setAuthOperationInProgress: (inProgress: boolean) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authState = useProvideAuth();
  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function useProvideAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthOperationInProgress, setIsAuthOperationInProgress] = useState(false);
  const [adminViewMode, setAdminViewMode] = useState<AdminViewMode>('admin_view');
  const { toast } = useToast();
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter(); 

  useEffect(() => {
    const storedViewMode = localStorage.getItem('adminViewMode') as AdminViewMode;
    if (storedViewMode) {
      setAdminViewMode(storedViewMode);
    }

    const storedUserId = localStorage.getItem('demo_user_id');
    if (storedUserId) {
        getUserProfile(storedUserId).then(profile => {
            if (profile) {
                if (profile.email === SUPER_ADMIN_EMAIL && profile.role !== 'super_admin') {
                    profile.role = 'super_admin';
                }
                setUser(profile);
            }
            setIsLoading(false);
        });
    } else {
        setIsLoading(false);
    }
  }, []);

  const handleSetAdminViewMode = (mode: AdminViewMode) => {
    setAdminViewMode(mode);
    localStorage.setItem('adminViewMode', mode);
    window.location.href = '/dashboard';
  };

  const logoutDueToInactivity = useCallback(() => {
    logout().then(() => {
        toast({
            title: "Session Expired",
            description: "You have been logged out due to inactivity.",
            variant: "destructive",
            duration: 7000
        });
        window.location.href = '/login';
    });
  }, [toast]);

  const resetInactivityTimeout = useCallback(() => {
    if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
    }
    
    if (user) {
        const timeoutDuration = user.role === 'admin' || user.role === 'super_admin'
            ? 30 * 60 * 1000
            : 20 * 60 * 1000;

        inactivityTimeoutRef.current = setTimeout(logoutDueToInactivity, timeoutDuration);
    }
  }, [user, logoutDueToInactivity]);
  
  useEffect(() => {
    if (user && !isLoading) {
        const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        resetInactivityTimeout();
        events.forEach(event => window.addEventListener(event, resetInactivityTimeout));
        return () => {
            if (inactivityTimeoutRef.current) {
                clearTimeout(inactivityTimeoutRef.current);
            }
            events.forEach(event => window.removeEventListener(event, resetInactivityTimeout));
        };
    }
  }, [user, isLoading, resetInactivityTimeout]);


  const login = useCallback(async (email: string, pass: string): Promise<LoginResult> => {
    setIsAuthOperationInProgress(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const users = await getAllUsers();
    const foundUser = users.find(u => u.email === email);

    if (!foundUser) {
        setIsAuthOperationInProgress(false);
        return { user: null, success: false, reason: 'not_found' };
    }

    // Check password against mock data
    if (foundUser.password && foundUser.password !== pass) {
        setIsAuthOperationInProgress(false);
        return { user: null, success: false, reason: 'invalid_credentials' };
    }

    if (!pass) {
        setIsAuthOperationInProgress(false);
        return { user: null, success: false, reason: 'invalid_credentials' };
    }

    if (foundUser.email === SUPER_ADMIN_EMAIL && foundUser.role !== 'super_admin') {
      foundUser.role = 'super_admin';
    }

    if (foundUser.status === 'pending' || foundUser.status === 'rejected') {
      setIsAuthOperationInProgress(false);
      return { user: null, success: false, reason: 'pending' };
    }

    localStorage.setItem('demo_user_id', foundUser.id);
    setUser(foundUser);
    setIsAuthOperationInProgress(false);
    return { user: foundUser, success: true };
  }, []);

  const signup = useCallback(async (name: string, email: string, pass: string): Promise<User | null> => {
    setIsAuthOperationInProgress(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const uid = 'user-' + Math.random().toString(36).substr(2, 9);
    await createUserProfile(uid, email, name, 'member', 'pending');
    const newUserProfile = await getUserProfile(uid);

    setIsAuthOperationInProgress(false);
    return newUserProfile;
  }, []);

  const logout = useCallback(async () => {
    if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
    }
    
    localStorage.removeItem('demo_user_id');
    setUser(null);
    setIsAuthOperationInProgress(false);
  }, []);

   const sendPasswordResetEmail = useCallback(async (email: string): Promise<PasswordResetResult> => {
    setIsAuthOperationInProgress(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsAuthOperationInProgress(false);
    return { success: true };
   }, []);

  const performAdminAuthOperation = useCallback(async (asyncTask: () => Promise<void>): Promise<void> => {
    setIsAuthOperationInProgress(true);
    setIsLoading(true);
    try {
      await asyncTask();
    } catch (error: any) {
      console.error("Admin auth operation error:", error.message);
      throw error;
    } finally {
       setIsLoading(false);
       setIsAuthOperationInProgress(false);
    }
  }, []);

  return { 
      user, 
      firebaseUser: null,
      isLoading, 
      isAuthOperationInProgress, 
      login, 
      signup, 
      logout,
      sendPasswordResetEmail,
      performAdminAuthOperation, 
      setAuthOperationInProgress: setIsAuthOperationInProgress, 
      adminViewMode, 
      setAdminViewMode: handleSetAdminViewMode 
    };
}
