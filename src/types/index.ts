export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Category {
  id: string;
  name: string;
  nameEn: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  isCustom?: boolean;
}

export type AccountType = 'cash' | 'mobile_wallet' | 'bank' | 'card' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
  accountNumber?: string;
  color: string;
  icon: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  categoryColor?: string;
  accountId: string;
  accountName: string;
  toAccountId?: string;
  toAccountName?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  note?: string;
  person?: string;
  receiptImage?: string; // Base64 receipt voucher image
  createdAt: string;
  updatedAt: string;
}

export interface PersonRecord {
  id: string;
  name: string;
  phoneNumber?: string;
  address?: string;
  date: string;
  type: 'receive' | 'give'; // receive = পাবো, give = দিবো
  amount: number;
  photoUrl?: string;
  notes?: string;
}

export interface BudgetItem {
  id: string;
  type: 'percentage' | 'fixed';
  value: number;
  categoryId: string;
  categoryName: string;
  month: number;
  year: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  date: string;
  targetDate?: string;
  note?: string;
  category?: string;
}

export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
  hasReminder?: boolean;
  createdAt: string;
}

export interface RecurringItem {
  id: string;
  type: 'income' | 'expense';
  title: string;
  amount: number;
  frequency: 'daily' | 'monthly' | 'yearly';
  dayOfMonth: number;
  categoryName: string;
  isActive: boolean;
  nextDate: string;
}

export interface MessMember {
  id: string;
  name: string;
  meals: number;
  deposit: number;
}

export interface MessRecord {
  id: string; // e.g. "mess_2026_10"
  month: number;
  year: number;
  title: string;
  totalBazaarCost: number;
  calculationMode: 'auto' | 'custom';
  customMealRate?: number;
  effectiveMealRate: number;
  members: MessMember[];
  notes?: string;
  updatedAt: string;
}

export interface AppSettings {
  language: 'bn' | 'en';
  useBanglaNumerals: boolean;
  theme: 'light' | 'dark' | 'system';
  accentColor?: 'blue' | 'emerald' | 'indigo' | 'rose' | 'amber' | 'amoled';
  currencySymbol: string;
  monthlyBudget: number;
  enableBudgetAlerts: boolean;
  userName: string;
  userEmail?: string;
  privacyMode: boolean;
  isPinEnabled?: boolean;
  pinCode?: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'persons'
  | 'budget'
  | 'savings'
  | 'tasks'
  | 'profile_menu'
  | 'categories'
  | 'trash'
  | 'settings'
  | 'graph_view'
  | 'quick_entry'
  | 'recurring'
  | 'reports'
  | 'notes'
  | 'mess'
  | 'sms_parse'
  | 'calendar_heatmap'
  | 'health_score'
  | 'add_transaction';
