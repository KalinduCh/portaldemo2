// src/services/taskService.ts
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  orderBy,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { Task, TaskStatus, TaskComment } from '@/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const tasksCollection = collection(db, 'tasks');

const docToTask = (docSnap: any): Task => {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        dueDate: data.dueDate ? (data.dueDate as Timestamp).toDate().toISOString() : undefined,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
    } as Task;
};

export function createTask(data: Omit<Task, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'checklist'> & { eventId?: string }): Promise<string> {
  return new Promise(async (resolve, reject) => {
      const { eventId, ...restOfData } = data;
      const taskData: any = {
        ...restOfData,
        status: 'todo',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        checklist: [],
      };

      if (eventId && eventId !== 'standalone') {
        taskData.eventId = eventId;
      }

      if (data.dueDate) {
          taskData.dueDate = Timestamp.fromDate(new Date(data.dueDate));
      }
      
      const docRef = doc(tasksCollection);
      setDoc(docRef, taskData)
        .then(() => resolve(docRef.id))
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: taskData
            });
            errorEmitter.emit('permission-error', permissionError);
            reject(permissionError);
        });
  });
}

export async function getTasks(): Promise<Task[]> {
    const q = query(tasksCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToTask);
}

export async function getTask(taskId: string): Promise<Task | null> {
    const docRef = doc(db, 'tasks', taskId);
    const docSnap = await getDoc(docRef);
    if(docSnap.exists()){
        return docToTask(docSnap);
    }
    return null;
}

export function updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const docRef = doc(db, 'tasks', taskId);
        const updateData: any = { ...updates, updatedAt: serverTimestamp() };
        if (updates.dueDate) {
            updateData.dueDate = Timestamp.fromDate(new Date(updates.dueDate));
        }
        delete updateData.id;

        updateDoc(docRef, updateData)
            .then(() => resolve())
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'update',
                    requestResourceData: updateData
                });
                errorEmitter.emit('permission-error', permissionError);
                reject(permissionError);
            });
    });
}

export function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const docRef = doc(db, 'tasks', taskId);
        const updateData = { status, updatedAt: serverTimestamp() };
        updateDoc(docRef, updateData)
            .then(() => resolve())
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'update',
                    requestResourceData: updateData
                });
                errorEmitter.emit('permission-error', permissionError);
                reject(permissionError);
            });
    });
}

export function deleteTask(taskId: string): Promise<void> {
     return new Promise(async (resolve, reject) => {
        const docRef = doc(db, 'tasks', taskId);
        deleteDoc(docRef)
            .then(() => resolve())
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
                reject(permissionError);
            });
    });
}

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
    const commentsRef = collection(db, `tasks/${taskId}/comments`);
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: (docSnap.data().createdAt as Timestamp).toDate().toISOString(),
    } as TaskComment));
}

export function addTaskComment(taskId: string, commentData: Omit<TaskComment, 'id' | 'createdAt'>): Promise<string> {
    return new Promise(async (resolve, reject) => {
        const commentsRef = collection(db, `tasks/${taskId}/comments`);
        const finalCommentData = {
             ...commentData,
             createdAt: serverTimestamp(),
        };

        addDoc(commentsRef, finalCommentData)
            .then((docRef) => resolve(docRef.id))
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: `tasks/${taskId}/comments/`,
                    operation: 'create',
                    requestResourceData: finalCommentData
                });
                errorEmitter.emit('permission-error', permissionError);
                reject(permissionError);
            });
    });
}