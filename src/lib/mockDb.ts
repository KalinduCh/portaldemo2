
import { INITIAL_USERS, INITIAL_EVENTS, INITIAL_ATTENDANCE, INITIAL_POINTS, INITIAL_PROJECT_IDEAS, INITIAL_GROUPS, INITIAL_TRANSACTIONS, INITIAL_TASKS } from './mockData';

class MockDb {
  private data: any = {};

  constructor() {
    if (typeof window !== 'undefined') {
      this.load();
    } else {
        this.data = {
            users: INITIAL_USERS,
            events: INITIAL_EVENTS,
            attendance: INITIAL_ATTENDANCE,
            points: INITIAL_POINTS,
            projectIdeas: INITIAL_PROJECT_IDEAS,
            groups: INITIAL_GROUPS,
            transactions: INITIAL_TRANSACTIONS,
            tasks: INITIAL_TASKS,
        };
    }
  }

  private load() {
    const stored = localStorage.getItem('mock_db');
    if (stored) {
      this.data = JSON.parse(stored);
    } else {
      this.data = {
        users: INITIAL_USERS,
        events: INITIAL_EVENTS,
        attendance: INITIAL_ATTENDANCE,
        points: INITIAL_POINTS,
        projectIdeas: INITIAL_PROJECT_IDEAS,
        groups: INITIAL_GROUPS,
        transactions: INITIAL_TRANSACTIONS,
        tasks: INITIAL_TASKS,
      };
      this.save();
    }
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mock_db', JSON.stringify(this.data));
    }
  }

  getAll(collection: string) {
    return this.data[collection] || [];
  }

  getOne(collection: string, id: string) {
    return (this.data[collection] || []).find((item: any) => item.id === id);
  }

  create(collection: string, item: any) {
    if (!this.data[collection]) this.data[collection] = [];
    const newItem = { ...item, id: item.id || Math.random().toString(36).substr(2, 9) };
    this.data[collection].push(newItem);
    this.save();
    return newItem;
  }

  update(collection: string, id: string, updates: any) {
    const index = (this.data[collection] || []).findIndex((item: any) => item.id === id);
    if (index !== -1) {
      this.data[collection][index] = { ...this.data[collection][index], ...updates };
      this.save();
      return this.data[collection][index];
    }
    return null;
  }

  delete(collection: string, id: string) {
    const index = (this.data[collection] || []).findIndex((item: any) => item.id === id);
    if (index !== -1) {
      this.data[collection].splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  // Helper for queries
  find(collection: string, predicate: (item: any) => boolean) {
      return (this.data[collection] || []).filter(predicate);
  }
}

export const mockDb = new MockDb();
