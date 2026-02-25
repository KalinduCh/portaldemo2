
// src/services/taskService.ts
import { mockDb } from '@/lib/mockDb';
import type { Task, TaskStatus, TaskComment } from '@/types';

export async function createTask(data: Omit<Task, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'checklist'> & { eventId?: string }): Promise<string> {
  const { eventId, ...restOfData } = data;
  const taskData: any = {
    ...restOfData,
    status: 'todo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    checklist: [],
  };

  if (eventId && eventId !== 'standalone') {
    taskData.eventId = eventId;
  }

  const newTask = mockDb.create('tasks', taskData);
  return newTask.id;
}

export async function getTasks(): Promise<Task[]> {
    const tasks = mockDb.getAll('tasks') as Task[];
    return [...tasks].sort((a: Task, b: Task) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getTask(taskId: string): Promise<Task | null> {
    return mockDb.getOne('tasks', taskId) || null;
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const updateData: any = { ...updates, updatedAt: new Date().toISOString() };
    delete updateData.id;
    mockDb.update('tasks', taskId, updateData);
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    await updateTask(taskId, { status });
}

export async function deleteTask(taskId: string): Promise<void> {
    mockDb.delete('tasks', taskId);
}

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
    const comments = mockDb.find('taskComments', (c) => c.taskId === taskId) as TaskComment[];
    return [...comments].sort((a: TaskComment, b: TaskComment) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function addTaskComment(taskId: string, commentData: Omit<TaskComment, 'id' | 'createdAt'>): Promise<string> {
    const finalCommentData = {
         ...commentData,
         taskId,
         createdAt: new Date().toISOString(),
    };
    const newComment = mockDb.create('taskComments', finalCommentData);
    return newComment.id;
}
