
// src/lib/firebase/clientApp.ts

export const app = {} as any;
export const auth = {
    currentUser: null,
    onAuthStateChanged: () => () => {},
    signInWithEmailAndPassword: async () => ({ user: {} }),
    createUserWithEmailAndPassword: async () => ({ user: {} }),
    signOut: async () => {},
    sendPasswordResetEmail: async () => {},
} as any;
export const db = {} as any;
export const functions = {} as any;
export const analytics = undefined;
export const messaging = undefined;

export const httpsCallable = (functions: any, name: string) => {
    return async (data: any) => {
        console.log(`Mock function called: ${name}`, data);
        return { data: {} };
    };
};
