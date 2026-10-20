import React, { useState, useMemo } from 'react';
import {
  Plus,
  RotateCw,
  MoreVertical,
  Search,
  X,
  PieChart,
  Zap,
  Repeat,
  Filter,
  Calendar as CalendarIcon,
  Check,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  AlertTriangle,
  Mic,
  Utensils,
  Calendar,
  Cloud,
  Sunrise,
  Sunset,
  Lightbulb,
  Image as ImageIcon,
  Wallet,
  ArrowRightLeft,
  Sparkles,
  CreditCard,
  Copy,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  FileSpreadsheet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { CashMemoModal } from './CashMemoModal';
import { Transaction } from '../types';
import {
  formatCurrency,
  toBanglaNumber,
  getTodayString,
  BANGLA_MONTHS,
  formatBengaliDate,
} from '../utils/formatters';
import { renderCategoryIcon } from '../utils/iconMap';
import { AnimatedNumber } from './AnimatedNumber';
import { ReceiptViewModal } from './ReceiptViewModal';
import { WalletTransferModal } from './WalletTransferModal';

export const Dashboard: React.FC = () => {
  const {
    transactions,
    settings,
    setEditingTransaction,
    deleteTransaction,
    addTransaction,
    setActiveTab,
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    updateSettings,
    monthlyExpense,
    setIsVoiceModalOpen,
    setIsFirebaseModalOpen,
    accounts,
  } = useApp();

  const [period, setPeriod] = useState<'today' | 'month' | 'total'>('today');
  const [activeMetric, setActiveMetric] = useState<'all' | 'income' | 'expense' | 'balance'>('all');
  const [showBudgetAlert, setShowBudgetAlert] = useState(true);
  const [selectedMemoTx, setSelectedMemoTx] = useState<Transaction | null>(null);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<Transaction | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [showTip, setShowTip] = useState(true);

  // Speed Dial & Toast states
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Smart Filter Chips & Insights states
  const [filterChip, setFilterChip] = useState<'all' | 'expense' | 'income' | 'receipt' | 'high'>('all');
  const [showInsights, setShowInsights] = useState(true);

  // Menu items and toggles matching video
  const [showMenu, setShowMenu] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(true);
  const [showPercentageBar, setShowPercentageBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTxMenuId, setActiveTxMenuId] = useState<string | null>(null);

  // Filter Modal ('নির্বাচন করুন') matching video 00:26-00:28
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);

  const todayStr = getTodayString();
  const currentMonthName =
    settings.language === 'en'
      ? new Date(selectedYear, selectedMonth - 1).toLocaleString('en', { month: 'short' })
      : BANGLA_MONTHS[selectedMonth - 1] || 'অক্টোবর';

  const periodTransactions = useMemo(() => {
    let list = transactions;
    if (period === 'today') {
      list = transactions.filter((t) => t.date === todayStr);
    } else if (period === 'month') {
      list = transactions.filter((t) => {
        try {
          const [year, month] = t.date.split('-').map(Number);
          return year === selectedYear && month === selectedMonth;
        } catch {
          return false;
        }
      });
    }

    // Quick Filter Chips
    if (filterChip === 'expense') {
      list = list.filter((t) => t.type === 'expense');
    } else if (filterChip === 'income') {
      list = list.filter((t) => t.type === 'income');
    } else if (filterChip === 'receipt') {
      list = list.filter((t) => !!t.receiptImage);
    } else if (filterChip === 'high') {
      list = list.filter((t) => t.amount >= 500);
    }

    if (showSearchBar && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.categoryName.toLowerCase().includes(q) ||
          (t.accountName && t.accountName.toLowerCase().includes(q)) ||
          (t.note && t.note.toLowerCase().includes(q))
      );
    }

    return list;
  }, [transactions, period, todayStr, selectedYear, selectedMonth, filterChip, showSearchBar, searchQuery]);

  const income = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const expense = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const balance = income - expense;

  const displayedTransactions = useMemo(() => {
    if (activeMetric === 'income') return periodTransactions.filter((t) => t.type === 'income');
    if (activeMetric === 'expense') return periodTransactions.filter((t) => t.type === 'expense');
    return periodTransactions;
  }, [periodTransactions, activeMetric]);

  // Duplicate Transaction Handler
  const handleDuplicateTransaction = (tx: Transaction) => {
    addTransaction({
      type: tx.type,
      amount: tx.amount,
      categoryId: tx.categoryId,
      categoryName: tx.categoryName,
      categoryIcon: tx.categoryIcon,
      categoryColor: tx.categoryColor,
      accountId: tx.accountId,
      accountName: tx.accountName,
      toAccountId: tx.toAccountId,
      toAccountName: tx.toAccountName,
      date: todayStr,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      note: tx.note ? `${tx.note} (কপি)` : 'পুনরাবৃত্তি এন্ট্রি',
      person: tx.person,
      receiptImage: tx.receiptImage,
    });
    setToastMsg(
      settings.language === 'en'
        ? 'Transaction duplicated for today'
        : 'লেনদেনটি আজ সফলভাবে পুনরাবৃত্তি করা হয়েছে'
    );
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Financial Insights calculations
  const now = new Date();
  const isCurrentMonthSelected =
    selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
  const totalDaysInSelectedMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysPassed = isCurrentMonthSelected ? now.getDate() : totalDaysInSelectedMonth;
  const daysRemaining = Math.max(1, totalDaysInSelectedMonth - (isCurrentMonthSelected ? now.getDate() : 0));

  const selectedMonthExpenses = useMemo(() => {
    return transactions.filter((t) => {
      try {
        const [year, month] = t.date.split('-').map(Number);
        return year === selectedYear && month === selectedMonth && t.type === 'expense';
      } catch {
        return false;
      }
    });
  }, [transactions, selectedYear, selectedMonth]);

  const totalMonthExpense = useMemo(() => {
    return selectedMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
  }, [selectedMonthExpenses]);

  const dailyAverageExpense =
    totalMonthExpense > 0 ? Math.round(totalMonthExpense / Math.max(1, daysPassed)) : 0;

  const remainingBudget = Math.max(0, (settings.monthlyBudget || 0) - totalMonthExpense);
  const dailyBudgetPace =
    settings.monthlyBudget > 0 ? Math.round(remainingBudget / daysRemaining) : 0;

  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const prevMonthTotalExpense = useMemo(() => {
    return transactions
      .filter((t) => {
        try {
          const [y, m] = t.date.split('-').map(Number);
          return y === prevYear && m === prevMonth && t.type === 'expense';
        } catch {
          return false;
        }
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, prevYear, prevMonth]);

  const monthComparePercent =
    prevMonthTotalExpense > 0
      ? Math.round(((totalMonthExpense - prevMonthTotalExpense) / prevMonthTotalExpense) * 100)
      : null;

  const topExpenseCategory = useMemo<{
    name: string;
    amount: number;
    color?: string;
    icon?: string;
  } | null>(() => {
    const map: { [name: string]: { amount: number; color?: string; icon?: string } } = {};
    selectedMonthExpenses.forEach((t) => {
      if (!map[t.categoryName]) {
        map[t.categoryName] = { amount: 0, color: t.categoryColor, icon: t.categoryIcon };
      }
      map[t.categoryName].amount += t.amount;
    });

    let top: { name: string; amount: number; color?: string; icon?: string } | null = null;
    Object.entries(map).forEach(([name, data]) => {
      if (!top || data.amount > top.amount) {
        top = { name, ...data };
      }
    });
    return top;
  }, [selectedMonthExpenses]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  const getEmptyStateMessage = () => {
    const isEn = settings.language === 'en';
    if (activeMetric === 'income') return isEn ? 'No income transactions' : 'কোন আয় নেই';
    if (activeMetric === 'expense') return isEn ? 'No expense transactions' : 'কোন ব্যয় নেই';
    if (activeMetric === 'balance') return isEn ? 'No carryforward balance' : 'কোনো ক্যারি ফরওয়ার্ড ব্যালেন্স নেই';
    if (period === 'today') return isEn ? 'No transactions today' : 'আজকে কোন লেনদেন নেই';
    if (period === 'month') return isEn ? `No transactions in ${currentMonthName}, ${selectedYear}` : `${currentMonthName}, ${settings.useBanglaNumerals ? toBanglaNumber(selectedYear) : selectedYear} মাসে কোন লেনদেন নেই`;
    return isEn ? 'No transactions found' : 'কোন লেনদেন নেই';
  };

  return (
    <div className="space-y-4 pb-24 pt-1">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold backdrop-blur-sm border border-slate-700/50 dark:border-slate-300"
          >
            <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 flex-shrink-0" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dismissible Top Notification Banner matching video 00:27 */}
      {showPercentageBar && (
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 animate-in fade-in">
          <span className="text-[11px] font-medium">
            গত বছর থেকে উদ্বৃত্ত/ঘাটতি যোগ নেই
          </span>
          <button
            onClick={() => setShowPercentageBar(false)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Smart Budget Alert Banner */}
      {settings.monthlyBudget > 0 && monthlyExpense >= settings.monthlyBudget * 0.8 && showBudgetAlert && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-200 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-[11px] font-semibold">
              বাজেট সতর্কতা: চলতি মাসে বাজেটের {Math.round((monthlyExpense / settings.monthlyBudget) * 100)}% খরচ হয়ে গেছে!
            </span>
          </div>
          <button
            onClick={() => setShowBudgetAlert(false)}
            className="p-1 text-amber-500 hover:text-amber-700"
            title="বন্ধ করুন"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Main Summary Card matching video 00:00-00:04 */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs">
        {/* Top Header inside card with Segmented Pill + Privacy Toggle */}
        <div className="flex items-center gap-2">
          {/* Segmented Pill Selector: আজ | অক্টোবর | মোট */}
          <div className="flex-1 bg-[#f0f3f8] dark:bg-slate-800/80 rounded-xl p-1 flex items-center text-xs font-semibold">
            <button
              onClick={() => {
                setPeriod('today');
                setActiveMetric('all');
              }}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                period === 'today'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {settings.language === 'en' ? 'Today' : 'আজ'}
            </button>

            <button
              onClick={() => {
                setPeriod('month');
                setActiveMetric('all');
              }}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                period === 'month'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {currentMonthName}
            </button>

            <button
              onClick={() => {
                setPeriod('total');
                setActiveMetric('all');
              }}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                period === 'total'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {settings.language === 'en' ? 'Total' : 'মোট'}
            </button>
          </div>

          {/* Privacy Eye Toggle */}
          <button
            onClick={() => updateSettings({ privacyMode: !settings.privacyMode })}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-400 hover:text-blue-600 transition-colors"
            title={
              settings.privacyMode
                ? settings.language === 'en'
                  ? 'Show balance'
                  : 'ব্যালেন্স দেখান'
                : settings.language === 'en'
                ? 'Privacy mode (hide amounts)'
                : 'প্রাইভেসি মোড (গোপন রাখুন)'
            }
          >
            {settings.privacyMode ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* 3 Metric Columns: Income | Expense | Balance */}
        <div className="grid grid-cols-3 gap-2 mt-4 items-center">
          {/* Income */}
          <div
            onClick={() => setActiveMetric('income')}
            className={`text-center cursor-pointer p-1.5 rounded-xl transition-all ${
              activeMetric === 'income'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-400'
                : ''
            }`}
          >
            <span className="text-xs font-semibold text-emerald-500 block mb-0.5">
              {settings.language === 'en' ? 'Income' : 'আয়'}
            </span>
            <span className="text-base font-bold text-emerald-500 block truncate">
              {settings.privacyMode ? (
                '••••••'
              ) : income > 0 ? (
                formatCurrency(income, settings.useBanglaNumerals && settings.language === 'bn')
              ) : (
                settings.useBanglaNumerals && settings.language === 'bn' ? '০' : '0'
              )}
            </span>
          </div>

          {/* Expense */}
          <div
            onClick={() => setActiveMetric('expense')}
            className={`text-center cursor-pointer p-1.5 rounded-xl transition-all ${
              activeMetric === 'expense'
                ? 'bg-rose-50 dark:bg-rose-950/40 ring-1 ring-rose-400'
                : ''
            }`}
          >
            <span className="text-xs font-semibold text-rose-500 block mb-0.5">
              {settings.language === 'en' ? 'Expense' : 'ব্যয়'}
            </span>
            <span className="text-base font-bold text-rose-500 block truncate">
              {settings.privacyMode ? (
                '••••••'
              ) : expense > 0 ? (
                formatCurrency(expense, settings.useBanglaNumerals && settings.language === 'bn')
              ) : (
                settings.useBanglaNumerals && settings.language === 'bn' ? '০' : '0'
              )}
            </span>
          </div>

          {/* Balance / Remaining */}
          <div
            onClick={() => setActiveMetric('balance')}
            className={`rounded-xl py-2 px-3 text-center cursor-pointer transition-all ${
              activeMetric === 'balance'
                ? 'bg-[#e4efff] dark:bg-blue-950/60 ring-1 ring-blue-400'
                : 'bg-slate-50 dark:bg-slate-800/60'
            }`}
          >
            <span className="text-xs font-semibold text-[#1a73e8] dark:text-blue-400 block mb-0.5">
              {settings.language === 'en' ? 'Balance' : 'অবশিষ্ট'}
            </span>
            <span className="text-base font-bold text-[#1a73e8] dark:text-blue-400 block truncate">
              {settings.privacyMode ? (
                '••••••'
              ) : balance !== 0 ? (
                formatCurrency(balance, settings.useBanglaNumerals && settings.language === 'bn')
              ) : (
                settings.useBanglaNumerals && settings.language === 'bn' ? '০' : '0'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Smart Financial Insights & Comparison Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                {settings.language === 'en' ? 'Financial Insights' : 'স্মার্ট আর্থিক বিশ্লেষণ'}
                {monthComparePercent !== null && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                      monthComparePercent <= 0
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}
                  >
                    {monthComparePercent <= 0
                      ? `${settings.useBanglaNumerals && settings.language === 'bn' ? toBanglaNumber(Math.abs(monthComparePercent)) : Math.abs(monthComparePercent)}% কম ব্যয়`
                      : `${settings.useBanglaNumerals && settings.language === 'bn' ? toBanglaNumber(monthComparePercent) : monthComparePercent}% বেশি ব্যয়`}
                  </span>
                )}
              </h4>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowInsights((v) => !v)}
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            {showInsights ? (settings.language === 'en' ? 'Hide' : 'সংক্ষেপ') : (settings.language === 'en' ? 'Details' : 'বিস্তারিত')}
          </button>
        </div>

        {showInsights && (
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            {/* Daily Average Spend */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] font-medium text-slate-400 block mb-0.5">
                {settings.language === 'en' ? 'Daily Avg Spending' : 'দৈনিক গড় ব্যয়'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {formatCurrency(dailyAverageExpense, settings.useBanglaNumerals && settings.language === 'bn')}
                </span>
                <span className="text-[10px] text-slate-400">/ দিন</span>
              </div>
            </div>

            {/* Budget Pace / Days Left */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] font-medium text-slate-400 block mb-0.5">
                {settings.monthlyBudget > 0
                  ? (settings.language === 'en' ? 'Daily Budget Pace' : 'বাজেটের দৈনিক সীমা')
                  : (settings.language === 'en' ? 'Days Remaining' : 'মাসের বাকি দিন')}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {settings.monthlyBudget > 0
                    ? formatCurrency(dailyBudgetPace, settings.useBanglaNumerals && settings.language === 'bn')
                    : (settings.useBanglaNumerals && settings.language === 'bn' ? toBanglaNumber(daysRemaining) : daysRemaining)}
                </span>
                <span className="text-[10px] text-slate-400">
                  {settings.monthlyBudget > 0 ? '/ দিন' : ' দিন'}
                </span>
              </div>
            </div>

            {/* Top Expense Category */}
            {topExpenseCategory && (
              <div className="col-span-2 p-2 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100/70 dark:border-blue-900/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {settings.language === 'en' ? 'Top Category:' : 'সর্বোচ্চ খরচ:'}
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {topExpenseCategory.name}
                  </span>
                </div>
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(topExpenseCategory.amount, settings.useBanglaNumerals && settings.language === 'bn')}
                  {totalMonthExpense > 0 && (
                    <span className="text-[10px] font-normal text-slate-500 ml-1">
                      ({Math.round((topExpenseCategory.amount / totalMonthExpense) * 100)}%)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Power Features Strip (Features 3, 4, 5, 6) */}
      <div className="grid grid-cols-4 gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('sms_parse')}
          className="p-2.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 flex flex-col items-center text-center gap-1 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-2xs"
        >
          <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 leading-tight">
            {settings.language === 'en' ? 'SMS Tracker' : 'SMS ট্র্যাকার'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('persons')}
          className="p-2.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 flex flex-col items-center text-center gap-1 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-2xs"
        >
          <RotateCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-200 leading-tight">
            {settings.language === 'en' ? 'Debt Reminder' : 'বাকির তাগাদা'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('budget')}
          className="p-2.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 flex flex-col items-center text-center gap-1 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-2xs"
        >
          <PiggyBank className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-[10px] font-bold text-blue-900 dark:text-blue-200 leading-tight">
            {settings.language === 'en' ? 'Budget Health' : 'বাজেট স্বাস্থ্য'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className="p-2.5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/60 flex flex-col items-center text-center gap-1 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-2xs"
        >
          <FileSpreadsheet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-[10px] font-bold text-purple-900 dark:text-purple-200 leading-tight">
            {settings.language === 'en' ? 'Excel & PDF' : 'এক্সেল ও মেমো'}
          </span>
        </button>
      </div>

      {/* 2. Action Bar */}
      <div className="flex items-center justify-between px-1 relative">
        <button
          onClick={() => setActiveTab('categories')}
          className="border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50/20 hover:bg-blue-50/80 rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          <span className="text-sm leading-none font-bold">+</span>
          <span>{settings.language === 'en' ? 'New Category' : 'নতুন ক্যাটাগরি'}</span>
        </button>

        <div className="flex items-center gap-4 text-slate-400 dark:text-slate-500">
          <button
            onClick={() => setShowFilterModal(true)}
            className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            title="ফিল্টার"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            title="ক্যাটাগরি"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <polygon points="12 2 16 9 8 9 12 2" />
              <circle cx="6" cy="18" r="4" />
              <rect x="14" y="14" width="8" height="8" rx="1" />
            </svg>
          </button>

          {/* Three Dots Menu `⋮` */}
          <button
            onClick={() => setShowMenu((m) => !m)}
            className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            title={settings.language === 'en' ? 'Menu' : 'মেনু'}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-1 top-10 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 w-60 text-xs font-semibold text-slate-800 dark:text-slate-100 animate-in fade-in">
            {/* 1. Filter Options */}
            <button
              onClick={() => {
                setShowMenu(false);
                setShowFilterModal(true);
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
            >
              <span>{settings.language === 'en' ? 'Filter Options' : 'ফিল্টার করুন'}</span>
              <Filter className="w-4 h-4 text-slate-400" />
            </button>

            {/* 2. Categories */}
            <button
              onClick={() => {
                setShowMenu(false);
                setActiveTab('categories');
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
            >
              <span>{settings.language === 'en' ? 'Categories' : 'ক্যাটাগরি'}</span>
              <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </button>

            {/* 3. Graph View */}
            <button
              onClick={() => {
                setShowMenu(false);
                setActiveTab('graph_view');
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
            >
              <span>{settings.language === 'en' ? 'Analytics & Graphs' : 'গ্রাফ ভিউ'}</span>
              <PieChart className="w-4 h-4 text-slate-400" />
            </button>

            {/* 4. Quick Entry */}
            <button
              onClick={() => {
                setShowMenu(false);
                setActiveTab('quick_entry');
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
            >
              <span>{settings.language === 'en' ? 'Quick Entry' : 'কুইক এন্ট্রি'}</span>
              <Zap className="w-4 h-4 text-slate-400" />
            </button>

            {/* 5. Recurring */}
            <button
              onClick={() => {
                setShowMenu(false);
                setActiveTab('recurring');
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
            >
              <span>{settings.language === 'en' ? 'Recurring Transactions' : 'রিপিট'}</span>
              <Repeat className="w-4 h-4 text-slate-400" />
            </button>

            {/* 6. Show Search Bar */}
            <div
              onClick={() => setShowSearchBar((s) => !s)}
              className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
            >
              <span>{settings.language === 'en' ? 'Show Search Bar' : 'সার্চবার শো করুন'}</span>
              <input
                type="checkbox"
                checked={showSearchBar}
                onChange={() => {}}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* 7. Monthly Percentage Bar */}
            <div
              onClick={() => setShowPercentageBar((p) => !p)}
              className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
            >
              <span>{settings.language === 'en' ? 'Monthly Percentage Bar' : 'মাসিক পার্সেন্টেজ বার'}</span>
              <input
                type="checkbox"
                checked={showPercentageBar}
                onChange={() => {}}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* 8. Calendar Heatmap */}
            <button
              onClick={() => {
                setShowMenu(false);
                setActiveTab('calendar_heatmap');
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-slate-800 dark:text-slate-100"
            >
              <span>{settings.language === 'en' ? 'Calendar Heatmap' : 'ক্যালেন্ডার হিটম্যাপ'}</span>
              <Calendar className="w-4 h-4 text-slate-400" />
            </button>

            {/* 9. Voice Entry */}
            <button
              onClick={() => {
                setShowMenu(false);
                setIsVoiceModalOpen(true);
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-blue-600 dark:text-blue-400"
            >
              <span>{settings.language === 'en' ? 'Voice Entry' : 'মুখে বলে এন্ট্রি (ভয়েস)'}</span>
              <Mic className="w-4 h-4" />
            </button>

            {/* 10. Mess & Shared Expenses */}
            <button
              onClick={() => {
                setShowMenu(false);
                setActiveTab('mess');
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-orange-600 dark:text-orange-400"
            >
              <span>{settings.language === 'en' ? 'Mess & Meal Splitter' : 'মেস ও মিল হিসাব'}</span>
              <Utensils className="w-4 h-4" />
            </button>

            {/* 11. Cloud Backup & Sync */}
            <button
              onClick={() => {
                setShowMenu(false);
                setIsFirebaseModalOpen(true);
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-emerald-600 dark:text-emerald-400"
            >
              <span>{settings.language === 'en' ? 'Cloud Backup & Sync' : 'অনলাইন ক্লাউড ব্যাকআপ'}</span>
              <Cloud className="w-4 h-4" />
            </button>

            {/* 12. Statement & Reports */}
            <button
              onClick={() => {
                setShowMenu(false);
                setActiveTab('reports');
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-blue-600 dark:text-blue-400 font-bold border-t border-slate-100 dark:border-slate-800"
            >
              <span>{settings.language === 'en' ? 'Statement & Reports' : 'স্টেটমেন্ট ও রিপোর্ট'}</span>
              <FileText className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Search Input Bar */}
      {showSearchBar && (
        <div className="relative px-1 animate-in fade-in">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={settings.language === 'en' ? 'Search transactions...' : 'লেনদেন অনুসন্ধান করুন...'}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>
      )}

      {/* Quick Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-1">
        {[
          { id: 'all', labelBn: 'সকল', labelEn: 'All' },
          { id: 'expense', labelBn: 'ব্যয় 💸', labelEn: 'Expense' },
          { id: 'income', labelBn: 'আয় 💰', labelEn: 'Income' },
          { id: 'receipt', labelBn: 'রসিদযুক্ত 🧾', labelEn: 'Receipt' },
          { id: 'high', labelBn: 'বড় খরচ (৳ ৫০০+)', labelEn: '৳ 500+' },
        ].map((chip) => {
          const isSelected = filterChip === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setFilterChip(chip.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {settings.language === 'en' ? chip.labelEn : chip.labelBn}
            </button>
          );
        })}

        {filterChip !== 'all' && (
          <button
            onClick={() => setFilterChip('all')}
            className="text-[10px] font-bold text-rose-500 hover:underline shrink-0 ml-1 px-1.5 py-1"
          >
            {settings.language === 'en' ? 'Reset' : 'রিসেট'}
          </button>
        )}
      </div>

      {/* 3. Info & Refresh Banner */}
      {activeMetric === 'balance' && (
        <div className="bg-[#edf3fe] dark:bg-blue-950/40 rounded-2xl p-3 flex items-center justify-between animate-in fade-in">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight max-w-[65%] font-medium">
            {settings.language === 'en'
              ? 'Click to recalculate balance if previous month entries were edited'
              : 'গত মাসের কোনো এন্ট্রি বদলালে ব্যালেন্স আপডেট করতে ক্লিক করুন'}
          </p>
          <button
            onClick={handleRefresh}
            className="bg-[#dce9fd] dark:bg-blue-900/60 text-[#1875f0] dark:text-blue-300 rounded-full px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 hover:bg-blue-200 transition-all active:scale-95"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{settings.language === 'en' ? 'Refresh' : 'রিফ্রেশ করুন'}</span>
          </button>
        </div>
      )}

      {/* 4. Empty State / Transactions List matching video 00:00-00:06 */}
      {displayedTransactions.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="text-slate-300 dark:text-slate-600 mb-3">
            <svg
              className="w-16 h-16"
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 6h24v32l-3-2-3 2-3-2-3 2-3-2-3 2-3-2-3 2V6z" />
              <line x1="18" y1="16" x2="30" y2="16" />
              <line x1="18" y1="22" x2="26" y2="22" />
            </svg>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium max-w-xs">
            {getEmptyStateMessage()}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(() => {
            const groups: { [date: string]: typeof displayedTransactions } = {};
            displayedTransactions.forEach((tx) => {
              if (!groups[tx.date]) {
                groups[tx.date] = [];
              }
              groups[tx.date].push(tx);
            });

            return Object.entries(groups).map(([dateKey, txList]) => {
              const groupTotal = txList.reduce(
                (sum, t) => sum + (t.type === 'expense' ? t.amount : 0),
                0
              );

              return (
                <div key={dateKey} className="space-y-2">
                  {/* Date header bar: ১৫ অক্টোবর, ২০২৬ | মোট : ৳ ৫০০ */}
                  <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 px-1 font-medium">
                    <span>
                      {settings.language === 'en'
                        ? new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : formatBengaliDate(dateKey, settings.useBanglaNumerals)}
                    </span>
                    <span>
                      {settings.language === 'en' ? 'Total' : 'মোট'} : ৳{' '}
                      {settings.useBanglaNumerals && settings.language === 'bn'
                        ? toBanglaNumber(groupTotal)
                        : groupTotal}
                    </span>
                  </div>

                  {txList.map((tx) => {
                    const isExpense = tx.type === 'expense';
                    const isIncome = tx.type === 'income';

                    return (
                      <div
                        key={tx.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-blue-200 dark:hover:border-slate-700 transition-all relative"
                      >
                        <div
                          onClick={() => {
                            setEditingTransaction(tx);
                            setActiveTab('add_transaction');
                          }}
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-xs flex-shrink-0"
                            style={{
                              backgroundColor:
                                tx.categoryColor || (isExpense ? '#ef4444' : '#10b981'),
                            }}
                          >
                            {renderCategoryIcon(tx.categoryIcon, 'w-5 h-5', '#ffffff')}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                              {tx.categoryName}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-400">
                                {tx.time || '11:09 AM'}
                              </span>
                              {tx.accountName && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                                  {tx.accountName}
                                </span>
                              )}
                              {tx.receiptImage && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedReceiptTx(tx);
                                  }}
                                  className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center gap-0.5 font-bold hover:bg-blue-100 transition-colors"
                                  title="রসিদ দেখুন"
                                >
                                  <FileText className="w-2.5 h-2.5" />
                                  <span>রসিদ</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`text-sm font-bold ${
                              isIncome
                                ? 'text-emerald-500'
                                : isExpense
                                ? 'text-rose-500'
                                : 'text-blue-500'
                            }`}
                          >
                            {settings.useBanglaNumerals && settings.language === 'bn'
                              ? toBanglaNumber(tx.amount)
                              : tx.amount}
                          </span>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTxMenuId(activeTxMenuId === tx.id ? null : tx.id);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
                              title={settings.language === 'en' ? 'More options' : 'বিকল্প মেনু'}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Popup menu: [ 📄 Cash Memo ] [ 📋 Duplicate ] [ ✏️ Edit ] [ 🗑️ Delete ] */}
                            {activeTxMenuId === tx.id && (
                              <div className="absolute right-0 top-7 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 w-36 text-xs font-semibold animate-in fade-in">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTxMenuId(null);
                                    setSelectedMemoTx(tx);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-blue-600 dark:text-blue-400"
                                >
                                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                                  <span>{settings.language === 'en' ? 'Cash Memo' : 'ক্যাশ মেমো'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTxMenuId(null);
                                    handleDuplicateTransaction(tx);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-emerald-600 dark:text-emerald-400"
                                >
                                  <Copy className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>{settings.language === 'en' ? 'Duplicate' : 'পুনরাবৃত্তি'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTxMenuId(null);
                                    setEditingTransaction(tx);
                                    setActiveTab('add_transaction');
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{settings.language === 'en' ? 'Edit' : 'এডিট'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTxMenuId(null);
                                    deleteTransaction(tx.id);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-rose-600 dark:text-rose-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  <span>{settings.language === 'en' ? 'Delete' : 'ডিলিট'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Speed Dial Floating Action Button */}
      <AnimatePresence>
        {isSpeedDialOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSpeedDialOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px] transition-opacity"
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-none">
        {/* Speed Dial Menu Items */}
        <AnimatePresence>
          {isSpeedDialOpen && (
            <div className="flex flex-col items-end gap-2.5 mb-1 pointer-events-auto">
              {/* 1. Quick Expense */}
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.8 }}
                transition={{ duration: 0.15, delay: 0.08 }}
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={() => {
                  setIsSpeedDialOpen(false);
                  setEditingTransaction(null);
                  setActiveTab('add_transaction');
                }}
              >
                <span className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg border border-slate-100 dark:border-slate-700">
                  {settings.language === 'en' ? 'Add Expense' : 'নতুন ব্যয় 💸'}
                </span>
                <button
                  type="button"
                  className="w-11 h-11 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-95 text-white shadow-lg flex items-center justify-center transition-all"
                >
                  <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </motion.div>

              {/* 2. Quick Income */}
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.8 }}
                transition={{ duration: 0.15, delay: 0.06 }}
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={() => {
                  setIsSpeedDialOpen(false);
                  setEditingTransaction(null);
                  setActiveTab('add_transaction');
                }}
              >
                <span className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg border border-slate-100 dark:border-slate-700">
                  {settings.language === 'en' ? 'Add Income' : 'নতুন আয় 💰'}
                </span>
                <button
                  type="button"
                  className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white shadow-lg flex items-center justify-center transition-all"
                >
                  <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </motion.div>

              {/* 3. Transfer */}
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.8 }}
                transition={{ duration: 0.15, delay: 0.04 }}
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={() => {
                  setIsSpeedDialOpen(false);
                  setIsTransferModalOpen(true);
                }}
              >
                <span className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg border border-slate-100 dark:border-slate-700">
                  {settings.language === 'en' ? 'Transfer' : 'ওয়ালেট ট্রান্সফার 🔄'}
                </span>
                <button
                  type="button"
                  className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-lg flex items-center justify-center transition-all"
                >
                  <ArrowRightLeft className="w-5 h-5 stroke-[2.2]" />
                </button>
              </motion.div>

              {/* 4. Voice Entry */}
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.8 }}
                transition={{ duration: 0.15, delay: 0.02 }}
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={() => {
                  setIsSpeedDialOpen(false);
                  setIsVoiceModalOpen(true);
                }}
              >
                <span className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg border border-slate-100 dark:border-slate-700">
                  {settings.language === 'en' ? 'Voice Entry' : 'ভয়েস এন্ট্রি 🎙️'}
                </span>
                <button
                  type="button"
                  className="w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-lg flex items-center justify-center transition-all"
                >
                  <Mic className="w-5 h-5 stroke-[2.2]" />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Floating Trigger Button */}
        <button
          onClick={() => setIsSpeedDialOpen((prev) => !prev)}
          className={`pointer-events-auto w-14 h-14 rounded-full text-white shadow-xl shadow-blue-500/30 flex items-center justify-center transition-all duration-200 active:scale-95 focus:outline-none ${
            isSpeedDialOpen ? 'bg-rose-600 hover:bg-rose-700 rotate-45 shadow-rose-500/30' : 'bg-[#1877f2] hover:bg-blue-600'
          }`}
          title={isSpeedDialOpen ? 'বন্ধ করুন' : 'নতুন লেনদেন বা কাজ'}
          aria-label="Speed Dial Menu"
        >
          <Plus className="w-7 h-7 stroke-[2.5] transition-transform duration-200" />
        </button>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl space-y-3 border border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white text-center pb-1">
              {settings.language === 'en' ? 'Filter Options' : 'ফিল্টার নির্বাচন করুন'}
            </h4>
            <div className="space-y-2 text-xs font-medium">
              <button
                onClick={() => {
                  setShowFilterModal(false);
                  setShowDatePickerModal(true);
                }}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-center transition-colors"
              >
                {settings.language === 'en' ? 'By Specific Date' : 'তারিখ অনুযায়ী'}
              </button>
              <button
                onClick={() => {
                  setShowFilterModal(false);
                  setPeriod('month');
                }}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-center transition-colors"
              >
                {settings.language === 'en' ? 'By Month' : 'মাস অনুযায়ী'}
              </button>
              <button
                onClick={() => {
                  setShowFilterModal(false);
                  setPeriod('total');
                }}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-center transition-colors"
              >
                {settings.language === 'en' ? 'All Time (Total)' : 'সর্বমোট হিসাব'}
              </button>
              <button
                onClick={() => {
                  setShowFilterModal(false);
                  setActiveTab('categories');
                }}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-center transition-colors"
              >
                {settings.language === 'en' ? 'By Category' : 'ক্যাটাগরি অনুযায়ী'}
              </button>
            </div>
            <div className="pt-1 flex justify-center">
              <button
                onClick={() => setShowFilterModal(false)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              >
                {settings.language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Picker Modal */}
      {showDatePickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-[10px] text-slate-400">
                {settings.language === 'en' ? 'Select Date' : 'তারিখ বেছে নিন'}
              </span>
              <h4 className="text-base font-bold text-slate-800 dark:text-white">
                {settings.language === 'en'
                  ? `Day ${selectedDayNumber}, ${currentMonthName}`
                  : `${currentMonthName} এর ${settings.useBanglaNumerals ? toBanglaNumber(selectedDayNumber) : selectedDayNumber} তারিখ`}
              </h4>
            </div>

            <div className="text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
              {currentMonthName} {settings.useBanglaNumerals && settings.language === 'bn' ? toBanglaNumber(selectedYear) : selectedYear}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
              {(settings.language === 'en'
                ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
                : ['র', 'সো', 'ম', 'বু', 'বৃ', 'শু', 'শ']
              ).map((d) => (
                <span key={d} className="text-slate-400 font-bold">{d}</span>
              ))}
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDayNumber(d)}
                  className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center transition-colors ${
                    selectedDayNumber === d
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {settings.useBanglaNumerals && settings.language === 'bn' ? toBanglaNumber(d) : d}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-blue-600 dark:text-blue-400">
              <button onClick={() => setShowDatePickerModal(false)}>
                {settings.language === 'en' ? 'Cancel' : 'বাতিল করুন'}
              </button>
              <button
                onClick={() => {
                  setShowDatePickerModal(false);
                  setPeriod('today');
                }}
              >
                {settings.language === 'en' ? 'OK' : 'ঠিক আছে'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital Cash Memo Modal */}
      <CashMemoModal
        transaction={selectedMemoTx}
        onClose={() => setSelectedMemoTx(null)}
        currencySymbol={settings.currencySymbol}
        useBanglaNumerals={settings.useBanglaNumerals}
      />

      {/* Receipt Voucher Image Viewer Modal */}
      <ReceiptViewModal
        transaction={selectedReceiptTx}
        isOpen={!!selectedReceiptTx}
        onClose={() => setSelectedReceiptTx(null)}
      />

      {/* Wallet Transfer Modal */}
      <WalletTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />
    </div>
  );
};
