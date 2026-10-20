import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  Transaction,
  Category,
  Account,
  PersonRecord,
  BudgetItem,
  SavingsGoal,
  TaskItem,
  RecurringItem,
  AppSettings,
  ActiveTab,
  MessRecord,
} from '../types';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_ACCOUNTS,
  getTodayString,
  getCurrentTimeString,
  generateSampleTransactions,
} from '../utils/formatters';
import { firebaseAuthService, firestoreSyncService } from '../services/firebaseSyncService';

interface NoteItem {
  id: string;
  title: string;
  content: string;
  date: string;
  isPinned?: boolean;
}

interface AppContextType {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  persons: PersonRecord[];
  budgets: BudgetItem[];
  savings: SavingsGoal[];
  tasks: TaskItem[];
  trash: any[];
  recurringItems: RecurringItem[];
  settings: AppSettings;
  notes: NoteItem[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedMonth: number;
  selectedYear: number;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;

  // Firebase Auth & Cloud Sync
  currentUser: User | null;
  isAuthLoading: boolean;
  isCloudSyncing: boolean;
  lastCloudSyncTime: string | null;
  cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  isOnline: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  manualCloudSync: () => Promise<void>;

  // Notes
  addNote: (note: { title: string; content: string }) => void;
  updateNote: (id: string, note: Partial<NoteItem>) => void;
  deleteNote: (id: string) => void;

  // Modals
  isAddTxOpen: boolean;
  setIsAddTxOpen: (open: boolean) => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (tx: Transaction | null) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  isProfileOpen: boolean;
  setIsProfileOpen: (open: boolean) => void;
  isFirebaseModalOpen: boolean;
  setIsFirebaseModalOpen: (open: boolean) => void;
  isVoiceModalOpen: boolean;
  setIsVoiceModalOpen: (open: boolean) => void;
  isAppUnlocked: boolean;
  setIsAppUnlocked: (unlocked: boolean) => void;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  transferBetweenAccounts: (
    fromId: string,
    toId: string,
    amount: number,
    date?: string,
    time?: string,
    note?: string
  ) => void;

  addPerson: (p: Omit<PersonRecord, 'id'>) => void;
  updatePerson: (id: string, p: Partial<PersonRecord>) => void;
  deletePerson: (id: string) => void;

  messRecords: MessRecord[];
  saveMessRecord: (record: MessRecord) => void;
  deleteMessRecord: (id: string) => void;

  addBudget: (b: Omit<BudgetItem, 'id'>) => void;
  deleteBudget: (id: string) => void;

  addSavings: (s: Omit<SavingsGoal, 'id' | 'currentAmount'>) => void;
  updateSavings: (id: string, s: Partial<SavingsGoal>) => void;
  depositToSavings: (id: string, amount: number) => void;
  deleteSavings: (id: string) => void;

  addTask: (text: string, dueDate?: string, hasReminder?: boolean) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;

  addRecurringItem: (item: Omit<RecurringItem, 'id' | 'nextDate'>) => void;
  toggleRecurringItem: (id: string) => void;
  deleteRecurringItem: (id: string) => void;
  applyRecurringToTransactions: (id: string) => void;

  addCategory: (cat: Omit<Category, 'id'>) => Category;
  updateCategory: (id: string, cat: Partial<Category>) => void;
  deleteCategory: (id: string) => { success: boolean; message?: string };

  addAccount: (acc: Omit<Account, 'id' | 'currentBalance'>) => void;
  updateAccount: (id: string, acc: Partial<Account>) => void;
  deleteAccount: (id: string) => { success: boolean; message?: string };

  updateSettings: (newSettings: Partial<AppSettings>) => void;
  emptyTrash: () => void;
  exportJSON: () => string;
  importJSON: (dataStr: string) => boolean;
  loadSampleData: () => void;
  resetAllData: () => void;

  // Computed Totals
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyBalance: number;
  totalReceivable: number;
  totalPayable: number;
  totalPersonsCount: number;
  totalAccountBalance: number;
}

const STORAGE_KEY = 'ay_byay_app_v2';

const persistLocal = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Keep the app usable when storage is disabled or full; cloud backup remains separate.
    console.warn('Local storage could not save data:', key, error);
  }
};

const defaultSettings: AppSettings = {
  language: 'bn',
  useBanglaNumerals: true,
  theme: 'light',
  accentColor: 'blue',
  currencySymbol: '৳',
  monthlyBudget: 0,
  enableBudgetAlerts: true,
  userName: '',
  userEmail: '',
  privacyMode: false,
  isPinEnabled: false,
  pinCode: '',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Firebase Auth and Cloud Sync states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('offline');
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Notes state
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    try {
      const saved = localStorage.getItem('ay_byay_user_notes');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    persistLocal('ay_byay_user_notes', notes);
  }, [notes]);

  // States
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_transactions`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return generateSampleTransactions();
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_categories`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_accounts`);
      if (saved) {
        const parsed: Account[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map((a) => a.id));
        const missing = DEFAULT_ACCOUNTS.filter((d) => !existingIds.has(d.id));
        return [...parsed, ...missing];
      }
    } catch {}
    return DEFAULT_ACCOUNTS;
  });

  const [persons, setPersons] = useState<PersonRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_persons`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 'p_1', name: 'করিম ভাই', type: 'receive', amount: 2500, date: getTodayString(), phoneNumber: '01711223344', notes: 'ল্যাপটপ মেরামত বাবদ বাকি' },
      { id: 'p_2', name: 'রহিম চাচা', type: 'give', amount: 1200, date: getTodayString(), phoneNumber: '01811223344', notes: 'দোকানের বাকি পরিশোধ' }
    ];
  });

  const [budgets, setBudgets] = useState<BudgetItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_budgets`);
      if (saved) return JSON.parse(saved);
    } catch {}
    const now = new Date();
    return [
      { id: 'b_1', type: 'fixed', value: 12000, categoryId: 'cat_groceries', categoryName: 'মুদি ও কাঁচাবাজার', month: now.getMonth() + 1, year: now.getFullYear() },
      { id: 'b_2', type: 'fixed', value: 4000, categoryId: 'cat_food', categoryName: 'খাবার ও রেস্তোরাঁ', month: now.getMonth() + 1, year: now.getFullYear() }
    ];
  });

  const [savings, setSavings] = useState<SavingsGoal[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_savings`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 's_1', name: 'জরুরি তহবিল (Emergency Fund)', targetAmount: 50000, currentAmount: 18500, date: `${new Date().getFullYear()}-12-31` }
    ];
  });

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_tasks`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 't_1', text: 'বিদ্যুৎ বিল ও ওয়াইফাই বিল পরিশোধ করা', completed: false, dueDate: getTodayString(), hasReminder: true, createdAt: new Date().toISOString() },
      { id: 't_2', text: 'মাসিক সঞ্চয় তহবিলে ৫,০০০ টাকা স্থানান্তর', completed: true, dueDate: getTodayString(), createdAt: new Date().toISOString() }
    ];
  });

  const [trash, setTrash] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_trash`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_settings`);
      if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
    } catch {}
    return defaultSettings;
  });

  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_recurring`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [messRecords, setMessRecords] = useState<MessRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_mess_records`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [isAppUnlocked, setIsAppUnlocked] = useState<boolean>(() => !settings.isPinEnabled);

  useEffect(() => {
    persistLocal(`${STORAGE_KEY}_recurring`, recurringItems);
  }, [recurringItems]);

  useEffect(() => {
    persistLocal(`${STORAGE_KEY}_mess_records`, messRecords);
  }, [messRecords]);

  // Dynamically compute exact account balances from opening balance (initialBalance) + confirmed transactions
  // This is the absolute single source of truth:
  // - bKash transactions ONLY modify bKash balance
  // - Nagad transactions ONLY modify Nagad balance
  // - Cash transactions ONLY modify Cash balance
  // - Bank transactions ONLY modify Bank balance
  // - Deleting or editing a transaction instantly recalculates without duplicates
  const computedAccounts = useMemo(() => {
    return accounts.map((acc) => {
      let delta = 0;
      for (const tx of transactions) {
        if (tx.type === 'income' && tx.accountId === acc.id) {
          delta += tx.amount;
        } else if (tx.type === 'expense' && tx.accountId === acc.id) {
          delta -= tx.amount;
        } else if (tx.type === 'transfer') {
          if (tx.accountId === acc.id) delta -= tx.amount;
          if (tx.toAccountId === acc.id) delta += tx.amount;
        }
      }
      return {
        ...acc,
        currentBalance: (acc.initialBalance || 0) + delta,
      };
    });
  }, [accounts, transactions]);

  // LocalStorage persistence
  useEffect(() => {
    persistLocal(`${STORAGE_KEY}_transactions`, transactions);
  }, [transactions]);
  useEffect(() => {
    persistLocal(`${STORAGE_KEY}_categories`, categories);
  }, [categories]);
  useEffect(() => {
    persistLocal(`${STORAGE_KEY}_accounts`, accounts);
  }, [accounts]);
  useEffect(() => {
    persistLocal(`${STORAGE_KEY}_persons`, persons);
  }, [persons]);
  useEffect(() => {
    persistLocal(`${STORAGE_KEY}_budgets`, budgets);
  }, [budgets]);
  useEffect(() => {
    persistLocal(`${STORAGE_KEY}_savings`, savings);
  }, [savings]);
  useEffect(() => {
    persistLocal(`${STORAGE_KEY}_tasks`, tasks);
  }, [tasks]);
  useEffect(() => {
    persistLocal(`${STORAGE_KEY}_trash`, trash);
  }, [trash]);
  useEffect(() => {
    persistLocal(`${STORAGE_KEY}_settings`, settings);
    const root = document.documentElement;

    const applyTheme = () => {
      const isDark =
        settings.theme === 'dark' ||
        (settings.theme === 'system' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);
      const accent = settings.accentColor || 'blue';
      root.setAttribute('data-accent', accent);

      if (isDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
        root.setAttribute('data-theme', 'dark');
        if (accent === 'amoled') {
          root.setAttribute('data-amoled', 'true');
        } else {
          root.removeAttribute('data-amoled');
        }
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
        root.setAttribute('data-theme', 'light');
        root.removeAttribute('data-amoled');
      }
    };

    applyTheme();

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings]);

  // Firebase auth listener, initial restore, then real-time cross-device sync.
  useEffect(() => {
    let unsubscribeLiveData: (() => void) | null = null;
    let disposed = false;

    const unsubscribeAuth = firebaseAuthService.onAuthChange(async (user) => {
      unsubscribeLiveData?.();
      unsubscribeLiveData = null;
      setCurrentUser(user);
      setIsAuthLoading(false);

      if (!user) {
        setCloudSyncStatus('offline');
        return;
      }

      setCloudSyncStatus('syncing');
      setIsCloudSyncing(true);
      try {
        const cloudData = await firestoreSyncService.fetchAllUserData(user.uid);
        if (disposed) return;
        const hasCloudData = Boolean(
          cloudData.settings || cloudData.transactions?.length || cloudData.categories?.length ||
          cloudData.accounts?.length || cloudData.persons?.length || cloudData.budgets?.length ||
          cloudData.savings?.length || cloudData.tasks?.length || cloudData.recurring?.length ||
          cloudData.messRecords?.length || cloudData.notes?.length || cloudData.trash?.length
        );

        if (hasCloudData) {
          if (cloudData.transactions) setTransactions(cloudData.transactions);
          if (cloudData.categories?.length) setCategories(cloudData.categories);
          if (cloudData.accounts?.length) setAccounts(cloudData.accounts);
          if (cloudData.persons) setPersons(cloudData.persons);
          if (cloudData.budgets) setBudgets(cloudData.budgets);
          if (cloudData.savings) setSavings(cloudData.savings);
          if (cloudData.tasks) setTasks(cloudData.tasks);
          if (cloudData.recurring) setRecurringItems(cloudData.recurring);
          if (cloudData.messRecords) setMessRecords(cloudData.messRecords);
          if (cloudData.notes) setNotes(cloudData.notes);
          if (cloudData.trash) setTrash(cloudData.trash);
          if (cloudData.settings) {
            setSettings((prev) => ({
              ...prev,
              ...cloudData.settings,
              userName: user.displayName || cloudData.settings?.userName || prev.userName,
              userEmail: user.email || cloudData.settings?.userEmail || prev.userEmail,
            }));
          }
        } else {
          // First sign-in: preserve this device's local data as the initial cloud dataset.
          await firestoreSyncService.uploadAllData(user.uid, {
            settings: { ...settings, userName: user.displayName || settings.userName, userEmail: user.email || settings.userEmail },
            transactions, categories, accounts, persons, budgets, savings, tasks,
            recurring: recurringItems, messRecords, notes, trash,
          });
        }

        if (disposed) return;
        unsubscribeLiveData = firestoreSyncService.subscribeUserData(user.uid, (patch) => {
          if (disposed) return;
          if (patch.transactions) setTransactions(patch.transactions);
          if (patch.categories) setCategories(patch.categories);
          if (patch.accounts) setAccounts(patch.accounts);
          if (patch.persons) setPersons(patch.persons);
          if (patch.budgets) setBudgets(patch.budgets);
          if (patch.savings) setSavings(patch.savings);
          if (patch.tasks) setTasks(patch.tasks);
          if (patch.recurring) setRecurringItems(patch.recurring);
          if (patch.messRecords) setMessRecords(patch.messRecords);
          if (patch.notes) setNotes(patch.notes as NoteItem[]);
          if (patch.trash) setTrash(patch.trash);
          if (patch.settings) {
            setSettings((prev) => ({ ...prev, ...patch.settings,
              userName: user.displayName || patch.settings?.userName || prev.userName,
              userEmail: user.email || patch.settings?.userEmail || prev.userEmail,
            }));
          }
          setCloudSyncStatus('synced');
          setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
        }, (error) => {
          console.error('Live cloud sync failed:', error);
          setCloudSyncStatus('error');
        });
        setCloudSyncStatus('synced');
        setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
      } catch (err) {
        console.error('Error syncing cloud data:', err);
        setCloudSyncStatus('error');
      } finally {
        if (!disposed) setIsCloudSyncing(false);
      }
    });

    return () => {
      disposed = true;
      unsubscribeLiveData?.();
      unsubscribeAuth();
    };
  }, []);

  // Automatic sync when device reconnects to internet
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (currentUser) {
        setIsCloudSyncing(true);
        setCloudSyncStatus('syncing');
        try {
          await firestoreSyncService.uploadAllData(currentUser.uid, {
            settings,
            transactions,
            categories,
            accounts,
            persons,
            budgets,
            savings,
            tasks,
            recurring: recurringItems,
            messRecords,
            notes,
            trash,
          });
          setCloudSyncStatus('synced');
          setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
        } catch (err) {
          console.warn('[Auto-Sync] Reconnect sync warning:', err);
          setCloudSyncStatus('error');
        } finally {
          setIsCloudSyncing(false);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setCloudSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [
    currentUser,
    settings,
    transactions,
    categories,
    accounts,
    persons,
    budgets,
    savings,
    tasks,
    recurringItems,
    messRecords,
    notes,
    trash,
  ]);

  const signInWithGoogle = async () => {
    try {
      setIsCloudSyncing(true);
      await firebaseAuthService.loginWithGoogle();
    } catch (error: any) {
      if (error?.code !== 'auth/unauthorized-domain') {
        console.error('Google Sign-In failed:', error);
      }
      throw error;
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const signOutUser = async () => {
    try {
      await firebaseAuthService.logout();
      setCloudSyncStatus('offline');
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const manualCloudSync = async () => {
    if (!currentUser) {
      setIsFirebaseModalOpen(true);
      return;
    }
    setIsCloudSyncing(true);
    setCloudSyncStatus('syncing');
    try {
      await firestoreSyncService.uploadAllData(currentUser.uid, {
        settings,
        transactions,
        categories,
        accounts,
        persons,
        budgets,
        savings,
        tasks,
        recurring: recurringItems,
        messRecords,
        notes,
        trash,
      });
      setCloudSyncStatus('synced');
      setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
    } catch (error) {
      console.error('Manual sync failed:', error);
      setCloudSyncStatus('error');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Notes actions
  const addNote = (noteData: { title: string; content: string }) => {
    const newNote: NoteItem = {
      id: `note_${Date.now()}`,
      title: noteData.title,
      content: noteData.content,
      date: getTodayString(),
      isPinned: false,
    };
    setNotes((prev) => [newNote, ...prev]);
    if (currentUser) {
      firestoreSyncService.saveDoc(currentUser.uid, 'notes', newNote.id, newNote);
      setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
    }
  };

  const updateNote = (id: string, noteData: Partial<NoteItem>) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, ...noteData } : n));
      const target = next.find((n) => n.id === id);
      if (currentUser && target) {
        firestoreSyncService.saveDoc(currentUser.uid, 'notes', id, target);
        setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
      }
      return next;
    });
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (currentUser) {
      firestoreSyncService.deleteDoc(currentUser.uid, 'notes', id);
    }
  };

  // Actions
  const addTransaction = (txData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);
    if (currentUser) {
      firestoreSyncService.saveDoc(currentUser.uid, 'transactions', newTx.id, newTx);
      setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
    }
  };

  const updateTransaction = (id: string, txData: Partial<Transaction>) => {
    setTransactions((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, ...txData, updatedAt: new Date().toISOString() } : item
      );
      const target = next.find((item) => item.id === id);
      if (currentUser && target) {
        firestoreSyncService.saveDoc(currentUser.uid, 'transactions', id, target);
        setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
      }
      return next;
    });
  };

  const deleteTransaction = (id: string) => {
    const target = transactions.find((t) => t.id === id);
    if (target) {
      setTrash((prev) => [{ ...target, deletedType: 'transaction', deletedAt: new Date().toISOString() }, ...prev]);
    }
    setTransactions((prev) => prev.filter((item) => item.id !== id));
    if (currentUser) {
      firestoreSyncService.deleteDoc(currentUser.uid, 'transactions', id);
    }
  };

  const transferBetweenAccounts = (
    fromId: string,
    toId: string,
    amount: number,
    date = getTodayString(),
    time = getCurrentTimeString(),
    note = 'অ্যাকাউন্ট স্থানান্তর'
  ) => {
    const fromAcc = accounts.find((a) => a.id === fromId);
    const toAcc = accounts.find((a) => a.id === toId);
    if (!fromAcc || !toAcc || amount <= 0) return;

    const newTx: Transaction = {
      id: `tx_tr_${Date.now()}`,
      type: 'transfer',
      amount,
      categoryId: 'cat_transfer',
      categoryName: 'অ্যাকাউন্ট স্থানান্তর',
      categoryIcon: 'RefreshCw',
      categoryColor: '#6366f1',
      accountId: fromId,
      accountName: fromAcc.name,
      toAccountId: toId,
      toAccountName: toAcc.name,
      date,
      time,
      note,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);
    if (currentUser) {
      firestoreSyncService.saveDoc(currentUser.uid, 'transactions', newTx.id, newTx);
      setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
    }
  };

  const addPerson = (pData: Omit<PersonRecord, 'id'>) => {
    const newP: PersonRecord = {
      ...pData,
      id: `p_${Date.now()}`,
    };
    setPersons((prev) => [newP, ...prev]);
    if (currentUser) {
      firestoreSyncService.saveDoc(currentUser.uid, 'persons', newP.id, newP);
      setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
    }
  };

  const updatePerson = (id: string, personData: Partial<PersonRecord>) => {
    setPersons((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...personData } : p));
      const target = next.find((p) => p.id === id);
      if (currentUser && target) {
        firestoreSyncService.saveDoc(currentUser.uid, 'persons', id, target);
        setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
      }
      return next;
    });
  };

  const deletePerson = (id: string) => {
    const target = persons.find((p) => p.id === id);
    if (target) {
      setTrash((prev) => [{ ...target, deletedType: 'person', deletedAt: new Date().toISOString() }, ...prev]);
    }
    setPersons((prev) => prev.filter((p) => p.id !== id));
    if (currentUser) {
      firestoreSyncService.deleteDoc(currentUser.uid, 'persons', id);
    }
  };

  const saveMessRecord = (record: MessRecord) => {
    setMessRecords((prev) => {
      const exists = prev.some((r) => r.id === record.id);
      const next = exists ? prev.map((r) => (r.id === record.id ? record : r)) : [record, ...prev];
      if (currentUser) {
        firestoreSyncService.saveDoc(currentUser.uid, 'mess_records', record.id, record);
        setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
      }
      return next;
    });
  };

  const deleteMessRecord = (id: string) => {
    setMessRecords((prev) => prev.filter((r) => r.id !== id));
    if (currentUser) {
      firestoreSyncService.deleteDoc(currentUser.uid, 'mess_records', id);
    }
  };

  const addBudget = (bData: Omit<BudgetItem, 'id'>) => {
    const newB: BudgetItem = {
      ...bData,
      id: `b_${Date.now()}`,
    };
    setBudgets((prev) => [newB, ...prev]);
    if (currentUser) {
      firestoreSyncService.saveDoc(currentUser.uid, 'budgets', newB.id, newB);
      setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
    }
  };

  const deleteBudget = (id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    if (currentUser) {
      firestoreSyncService.deleteDoc(currentUser.uid, 'budgets', id);
    }
  };

  const addSavings = (sData: Omit<SavingsGoal, 'id' | 'currentAmount'>) => {
    const newS: SavingsGoal = {
      ...sData,
      id: `s_${Date.now()}`,
      currentAmount: 0,
    };
    setSavings((prev) => [newS, ...prev]);
    if (currentUser) {
      firestoreSyncService.saveDoc(currentUser.uid, 'savings', newS.id, newS);
      setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
    }
  };

  const updateSavings = (id: string, sData: Partial<SavingsGoal>) => {
    setSavings((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...sData } : s));
      const target = next.find((s) => s.id === id);
      if (currentUser && target) {
        firestoreSyncService.saveDoc(currentUser.uid, 'savings', id, target);
        setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
      }
      return next;
    });
  };

  const depositToSavings = (id: string, amount: number) => {
    if (amount <= 0) return;
    setSavings((prev) => {
      const next = prev.map((s) =>
        s.id === id ? { ...s, currentAmount: (s.currentAmount || 0) + amount } : s
      );
      const target = next.find((s) => s.id === id);
      if (currentUser && target) {
        firestoreSyncService.saveDoc(currentUser.uid, 'savings', id, target);
        setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
      }
      return next;
    });
  };

  const deleteSavings = (id: string) => {
    setSavings((prev) => prev.filter((s) => s.id !== id));
    if (currentUser) {
      firestoreSyncService.deleteDoc(currentUser.uid, 'savings', id);
    }
  };

  const addTask = (text: string, dueDate?: string, hasReminder = false) => {
    const newT: TaskItem = {
      id: `t_${Date.now()}`,
      text,
      completed: false,
      dueDate,
      hasReminder,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newT, ...prev]);
    if (currentUser) {
      firestoreSyncService.saveDoc(currentUser.uid, 'tasks', newT.id, newT);
      setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
    }
  };

  const toggleTask = (id: string) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
      const target = next.find((t) => t.id === id);
      if (currentUser && target) {
        firestoreSyncService.saveDoc(currentUser.uid, 'tasks', id, target);
      }
      return next;
    });
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (currentUser) {
      firestoreSyncService.deleteDoc(currentUser.uid, 'tasks', id);
    }
  };

  const addRecurringItem = (itemData: Omit<RecurringItem, 'id' | 'nextDate'>) => {
    const newItem: RecurringItem = {
      ...itemData,
      id: `rec_${Date.now()}`,
      nextDate: `${itemData.dayOfMonth} নভেম্বর, ২০২৬`,
    };
    setRecurringItems((prev) => [newItem, ...prev]);
    if (currentUser) {
      firestoreSyncService.saveDoc(currentUser.uid, 'recurring', newItem.id, newItem);
      setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
    }
  };

  const toggleRecurringItem = (id: string) => {
    setRecurringItems((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r));
      const target = next.find((r) => r.id === id);
      if (currentUser && target) {
        firestoreSyncService.saveDoc(currentUser.uid, 'recurring', id, target);
      }
      return next;
    });
  };

  const deleteRecurringItem = (id: string) => {
    setRecurringItems((prev) => prev.filter((r) => r.id !== id));
    if (currentUser) {
      firestoreSyncService.deleteDoc(currentUser.uid, 'recurring', id);
    }
  };

  const applyRecurringToTransactions = (id: string) => {
    const item = recurringItems.find((r) => r.id === id);
    if (!item) return;
    const acc = accounts[0] || { id: 'acc_cash', name: 'নগদ ক্যাশ (টাকা)' };
    addTransaction({
      type: item.type,
      amount: item.amount,
      categoryId: 'cat_recurring',
      categoryName: item.categoryName,
      categoryIcon: 'Repeat',
      categoryColor: item.type === 'expense' ? '#ef4444' : '#10b981',
      accountId: acc.id,
      accountName: acc.name,
      date: getTodayString(),
      time: getCurrentTimeString(),
      note: `${item.title} (নিয়মিত রিকারিং)`,
    });
  };

  const addCategory = (catData: Omit<Category, 'id'>): Category => {
    const newCat: Category = {
      ...catData,
      id: `cat_c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      isCustom: true,
    };
    setCategories((prev) => [...prev, newCat]);
    if (currentUser) {
      firestoreSyncService.saveDoc(currentUser.uid, 'categories', newCat.id, newCat);
      setLastCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
    }
    return newCat;
  };

  const updateCategory = (id: string, catData: Partial<Category>) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...catData } : c))
    );
  };

  const deleteCategory = (id: string) => {
    const hasTx = transactions.some((t) => t.categoryId === id);
    if (hasTx) {
      return { success: false, message: 'এই ক্যাটাগরিতে লেনদেন রয়েছে।' };
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    return { success: true };
  };

  const addAccount = (accData: Omit<Account, 'id' | 'currentBalance'>) => {
    const newAcc: Account = {
      ...accData,
      id: `acc_${Date.now()}`,
      currentBalance: accData.initialBalance,
    };
    setAccounts((prev) => [...prev, newAcc]);
    if (currentUser) {
      firestoreSyncService.saveDoc(currentUser.uid, 'accounts', newAcc.id, newAcc);
    }
  };

  const updateAccount = (id: string, accData: Partial<Account>) => {
    setAccounts((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...accData } : a));
      const target = next.find((a) => a.id === id);
      if (currentUser && target) {
        firestoreSyncService.saveDoc(currentUser.uid, 'accounts', id, target);
      }
      return next;
    });
  };

  const deleteAccount = (id: string) => {
    if (accounts.length <= 1) {
      return { success: false, message: 'কমপক্ষে একটি অ্যাকাউন্ট থাকা আবশ্যক।' };
    }
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    if (currentUser) {
      firestoreSyncService.deleteDoc(currentUser.uid, 'accounts', id);
    }
    return { success: true };
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...newSettings };
      if (currentUser) {
        firestoreSyncService.saveUserSettings(currentUser.uid, next);
      }
      return next;
    });
  };

  const emptyTrash = () => {
    const itemsToDelete = trash;
    setTrash([]);
    if (currentUser && itemsToDelete.length) {
      void Promise.all(itemsToDelete.filter((item) => item?.id).map((item) =>
        firestoreSyncService.deleteDoc(currentUser.uid, 'trash', item.id)
      )).catch((error) => {
        console.error('Could not empty the cloud recycle bin:', error);
        setTrash(itemsToDelete);
        setCloudSyncStatus('error');
      });
    }
  };

  const exportJSON = () => {
    return JSON.stringify({ transactions, categories, accounts, persons, budgets, savings, tasks, recurring: recurringItems, messRecords, trash, settings, notes }, null, 2);
  };

  const importJSON = (dataStr: string): boolean => {
    try {
      const parsed = JSON.parse(dataStr);
      if (parsed.transactions) setTransactions(parsed.transactions);
      if (parsed.categories) setCategories(parsed.categories);
      if (parsed.accounts) setAccounts(parsed.accounts);
      if (parsed.persons) setPersons(parsed.persons);
      if (parsed.budgets) setBudgets(parsed.budgets);
      if (parsed.savings) setSavings(parsed.savings);
      if (parsed.tasks) setTasks(parsed.tasks);
      if (parsed.recurring) setRecurringItems(parsed.recurring);
      if (parsed.messRecords) setMessRecords(parsed.messRecords);
      if (parsed.trash) setTrash(parsed.trash);
      if (parsed.notes) setNotes(parsed.notes);
      return true;
    } catch {
      return false;
    }
  };

  const loadSampleData = () => {
    setTransactions(generateSampleTransactions());
    setPersons([
      { id: 'p_1', name: 'করিম ভাই', type: 'receive', amount: 2500, date: getTodayString(), phoneNumber: '01711223344', notes: 'ল্যাপটপ মেরামত বাবদ বাকি' },
      { id: 'p_2', name: 'রহিম চাচা', type: 'give', amount: 1200, date: getTodayString(), phoneNumber: '01811223344', notes: 'দোকানের বাকি পরিশোধ' }
    ]);
    setBudgets([
      { id: 'b_1', type: 'fixed', value: 12000, categoryId: 'cat_groceries', categoryName: 'মুদি ও কাঁচাবাজার', month: selectedMonth, year: selectedYear },
      { id: 'b_2', type: 'fixed', value: 4000, categoryId: 'cat_food', categoryName: 'খাবার ও রেস্তোরাঁ', month: selectedMonth, year: selectedYear }
    ]);
    setSavings([
      { id: 's_1', name: 'জরুরি তহবিল (Emergency Fund)', targetAmount: 50000, currentAmount: 18500, date: `${selectedYear}-12-31` }
    ]);
    setTasks([
      { id: 't_1', text: 'বিদ্যুৎ বিল ও ওয়াইফাই বিল পরিশোধ করা', completed: false, dueDate: getTodayString(), hasReminder: true, createdAt: new Date().toISOString() },
      { id: 't_2', text: 'মাসিক সঞ্চয় তহবিলে ৫,০০০ টাকা স্থানান্তর', completed: true, dueDate: getTodayString(), createdAt: new Date().toISOString() }
    ]);
  };

  const resetAllData = () => {
    setTransactions([]);
    setPersons([]);
    setBudgets([]);
    setSavings([]);
    setTasks([]);
    setMessRecords([]);
  };

  // Calculations
  const monthlyTransactions = transactions.filter((tx) => {
    try {
      const [year, month] = tx.date.split('-').map(Number);
      return year === selectedYear && month === selectedMonth;
    } catch {
      return false;
    }
  });

  const monthlyIncome = monthlyTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const monthlyExpense = monthlyTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const monthlyBalance = monthlyIncome - monthlyExpense;

  const totalReceivable = persons
    .filter((p) => p.type === 'receive')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPayable = persons
    .filter((p) => p.type === 'give')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPersonsCount = persons.length;

  const totalAccountBalance = computedAccounts.reduce((s, a) => s + a.currentBalance, 0);

  return (
    <AppContext.Provider
      value={{
        transactions,
        categories,
        accounts: computedAccounts,
        persons,
        budgets,
        savings,
        tasks,
        trash,
        recurringItems,
        messRecords,
        settings,
        notes,
        activeTab,
        setActiveTab,
        selectedMonth,
        selectedYear,
        setSelectedMonth,
        setSelectedYear,
        currentUser,
        isAuthLoading,
        isCloudSyncing,
        lastCloudSyncTime,
        cloudSyncStatus,
        isOnline,
        signInWithGoogle,
        signOutUser,
        manualCloudSync,
        addNote,
        updateNote,
        deleteNote,
        isAddTxOpen,
        setIsAddTxOpen,
        editingTransaction,
        setEditingTransaction,
        isNotificationsOpen,
        setIsNotificationsOpen,
        isProfileOpen,
        setIsProfileOpen,
        isFirebaseModalOpen,
        setIsFirebaseModalOpen,
        isVoiceModalOpen,
        setIsVoiceModalOpen,
        isAppUnlocked,
        setIsAppUnlocked,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        transferBetweenAccounts,
        addPerson,
        updatePerson,
        deletePerson,
        saveMessRecord,
        deleteMessRecord,
        addBudget,
        deleteBudget,
        addSavings,
        updateSavings,
        depositToSavings,
        deleteSavings,
        addTask,
        toggleTask,
        deleteTask,
        addRecurringItem,
        toggleRecurringItem,
        deleteRecurringItem,
        applyRecurringToTransactions,
        addCategory,
        updateCategory,
        deleteCategory,
        addAccount,
        updateAccount,
        deleteAccount,
        updateSettings,
        emptyTrash,
        exportJSON,
        importJSON,
        loadSampleData,
        resetAllData,
        monthlyIncome,
        monthlyExpense,
        monthlyBalance,
        totalReceivable,
        totalPayable,
        totalPersonsCount,
        totalAccountBalance,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
