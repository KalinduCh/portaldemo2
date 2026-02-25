
// src/services/eventService.ts
import { mockDb } from '@/lib/mockDb';
import type { Event } from '@/types';
import type { EventFormValues } from '@/components/events/event-form';

export async function createEvent(data: EventFormValues): Promise<string> {
  const eventData: any = {
    name: data.name,
    startDate: data.startDate.toISOString(),
    description: data.description,
    reminderSent: false,
  };

  if (data.eventType !== 'deadline' && data.endDate) {
    eventData.endDate = data.endDate.toISOString();
  }

  if (data.eventType !== 'deadline') {
    eventData.location = data.location;
    if (data.enableGeoRestriction && typeof data.latitude === 'number' && !isNaN(data.latitude)) {
        eventData.latitude = data.latitude;
    }
    if (data.enableGeoRestriction && typeof data.longitude === 'number' && !isNaN(data.longitude)) {
        eventData.longitude = data.longitude;
    }
    if (typeof data.points === 'number' && data.points > 0) {
        eventData.points = data.points;
    }
  }

  if (data.eventType) {
      eventData.eventType = data.eventType;
  }

  const newEvent = mockDb.create('events', eventData);
  return newEvent.id;
}

export async function getEvents(): Promise<Event[]> {
    const events = mockDb.getAll('events') as Event[];
    return [...events].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export async function getEvent(eventId: string): Promise<Event | null> {
    return mockDb.getOne('events', eventId) || null;
}

export async function updateEvent(eventId: string, data: EventFormValues): Promise<void> {
  const updatePayload: any = {
    name: data.name,
    startDate: data.startDate.toISOString(),
    description: data.description,
    eventType: data.eventType || null,
  };

  if (data.eventType === 'deadline') {
    updatePayload.endDate = null;
    updatePayload.location = null;
    updatePayload.latitude = null;
    updatePayload.longitude = null;
    updatePayload.points = null;
  } else {
    updatePayload.endDate = data.endDate ? data.endDate.toISOString() : null;
    updatePayload.location = data.location;
    updatePayload.points = (typeof data.points === 'number' && data.points > 0) ? data.points : null;
    if (data.enableGeoRestriction && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        updatePayload.latitude = data.latitude;
        updatePayload.longitude = data.longitude;
    } else {
        updatePayload.latitude = null;
        updatePayload.longitude = null;
    }
  }
  
  mockDb.update('events', eventId, updatePayload);
}

export async function deleteEvent(eventId: string): Promise<void> {
  mockDb.delete('events', eventId);
}
