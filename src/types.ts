import { Timestamp } from 'firebase/firestore';

export type TransactionType = 'income' | 'expense' | 'transfer';
export type PaymentMethod = 'upi' | 'cash';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  securityPin?: string;
  useBiometrics?: boolean;
  setupComplete: boolean;
}

export interface WishlistItem {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  uid: string;
  createdAt: Timestamp;
}

export interface MonthlyBudget {
  id: string;
  month: string; // YYYY-MM
  amount: number;
  uid: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  uid: string;
}

export interface Transaction {
  id?: string;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  category: string;
  otherCategory?: string;
  date: Timestamp;
  description: string;
  uid: string;
  accountId: string;
  createdAt: Timestamp;
}

export interface DailyTotal {
  date: string;
  income: number;
  expense: number;
}

export interface CategoryTotal {
  category: string;
  amount: number;
}

export interface Debt {
  id: string;
  personName: string;
  amount: number;
  description: string;
  isPaid: boolean;
  uid: string;
  createdAt: Timestamp;
}
