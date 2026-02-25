
// src/services/pointsService.ts
import { mockDb } from '@/lib/mockDb';
import type { PointsEntry } from '@/types';

export async function addPointsEntry(data: Omit<PointsEntry, 'id' | 'createdAt'>): Promise<string> {
  const entryData: any = {
    ...data,
    createdAt: new Date().toISOString(),
  };

  if (!entryData.projectName) {
    delete entryData.projectName;
  }
  if (!entryData.eventId) {
    delete entryData.eventId;
  }
  
  const newEntry = mockDb.create('points', entryData);
  return newEntry.id;
}

export async function getPointsForPeriod(month: number, year: number): Promise<PointsEntry[]> {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const points = mockDb.find('points', (p) => {
        const d = new Date(p.date);
        return d >= startDate && d <= endDate;
    }) as PointsEntry[];
    return points.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}


export async function deletePointsEntry(id: string): Promise<void> {
  mockDb.delete('points', id);
}
