
// src/services/financeService.ts
import { mockDb } from '@/lib/mockDb';
import type { Transaction, FinancialCategory } from '@/types';

// Centralized category definitions
export const FINANCIAL_CATEGORIES: {
    income: FinancialCategory[];
    expense: FinancialCategory[];
} = {
    income: [
        { id: 'membership_fees', name: 'Membership Fees' },
        { id: 'donations', name: 'Donations' },
        { id: 'fundraising', name: 'Fundraising Projects' },
        { id: 'sponsorships', name: 'Sponsorships' },
        { id: 'other', name: 'Other Income' },
    ],
    expense: [
        { id: 'event_costs', name: 'Event Costs' },
        { id: 'charity_donations', name: 'Charity Donations' },
        { id: 'administrative', name: 'Administrative Costs' },
        { id: 'travel', name: 'Travel & Accommodation' },
        { id: 'supplies', name: 'Supplies & Materials' },
        { id: 'other', name: 'Other Expenses' },
    ],
};

export async function addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<string> {
  const newTransaction = mockDb.create('transactions', {
    ...data,
    createdAt: new Date().toISOString(),
  });
  return newTransaction.id;
}

export async function getTransactions(): Promise<Transaction[]> {
  const transactions = mockDb.getAll('transactions') as Transaction[];
  return [...transactions].sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function updateTransaction(id: string, data: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<void> {
  mockDb.update('transactions', id, data);
}

export async function deleteTransaction(id: string): Promise<void> {
  mockDb.delete('transactions', id);
}
