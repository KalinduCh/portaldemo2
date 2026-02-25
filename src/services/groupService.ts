
// src/services/groupService.ts
import { mockDb } from '@/lib/mockDb';
import type { CommunicationGroup } from '@/types';

export async function createGroup(name: string, memberIds: string[], color?: string): Promise<string> {
  const groupData: any = {
    name,
    memberIds,
    createdAt: new Date().toISOString(),
  };
  if (color) {
    groupData.color = color;
  }
  const newGroup = mockDb.create('groups', groupData);
  return newGroup.id;
}

export async function getGroups(): Promise<CommunicationGroup[]> {
  const groups = mockDb.getAll('groups') as CommunicationGroup[];
  return [...groups].sort((a: CommunicationGroup, b: CommunicationGroup) => (a.name || "").localeCompare(b.name || ""));
}

export async function getGroup(groupId: string): Promise<CommunicationGroup | null> {
    return mockDb.getOne('groups', groupId) || null;
}

export async function updateGroup(groupId: string, updates: Partial<{ name: string; memberIds: string[]; color: string }>): Promise<void> {
  mockDb.update('groups', groupId, updates);
}

export async function deleteGroup(groupId: string): Promise<void> {
  mockDb.delete('groups', groupId);
}

export async function addMemberToGroup(groupId: string, userId: string): Promise<void> {
    const group = await getGroup(groupId);
    if (group) {
        const memberIds = [...group.memberIds];
        if (!memberIds.includes(userId)) {
            memberIds.push(userId);
            await updateGroup(groupId, { memberIds });
        }
    }
}

export async function removeMemberFromGroup(groupId: string, userId: string): Promise<void> {
    const group = await getGroup(groupId);
    if (group) {
        const memberIds = group.memberIds.filter(id => id !== userId);
        await updateGroup(groupId, { memberIds });
    }
}
