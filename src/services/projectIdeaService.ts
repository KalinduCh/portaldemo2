
// src/services/projectIdeaService.ts
import { mockDb } from '@/lib/mockDb';
import type { ProjectIdea } from '@/types';

// Create a new project idea (can be a draft or submitted directly)
export async function createProjectIdea(ideaData: Omit<ProjectIdea, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const newIdea = mockDb.create('projectIdeas', {
    ...ideaData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return newIdea.id;
}

// Get all project ideas for admin review (not drafts)
export async function getProjectIdeasForAdmin(): Promise<ProjectIdea[]> {
  const ideas = mockDb.find('projectIdeas', (i) => i.status !== 'draft') as ProjectIdea[];
  return ideas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}


// Get all of a specific user's project ideas (drafts and submitted)
export async function getProjectIdeasForUser(userId: string): Promise<ProjectIdea[]> {
    const ideas = mockDb.find('projectIdeas', (i) => i.authorId === userId) as ProjectIdea[];
    return ideas.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}


// Get a single project idea by ID
export async function getProjectIdea(id: string): Promise<ProjectIdea | null> {
    return mockDb.getOne('projectIdeas', id) || null;
}

// Update a project idea (e.g., to change its status or content)
export async function updateProjectIdea(id: string, updates: Partial<Omit<ProjectIdea, 'id' | 'createdAt'>>): Promise<void> {
  mockDb.update('projectIdeas', id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}
