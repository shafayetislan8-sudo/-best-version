import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  PiggyBank,
  ChevronDown,
  Search,
  X,
  Trash2,
  MoreVertical,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  formatCurrency,
  toBanglaNumber,
  BANGLA_MONTHS,
} from '../utils/formatters';
import { BudgetItem } from '../types';

export const BudgetView: React.FC = () => {
  const {
    budgets,
    addBudget,
    deleteBudget,
    categories,
    transactions,
    monthlyExpense,
    selectedMonth,
    selectedYear,
    settings,
  } = useApp();

  const isEn = settings.language === 'en';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [budgetType, setBudgetType] = useState<'percentage' | 'fixed'>('fixed');
  const [amountValue, setAmountValue] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [isCatSheetOpen, setIsCatSheetOpen] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [period, setPeriod] = useState<'month' | 'year' | 'total'>('month');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const currentMonthName = isEn
    ? new Date(selectedYear, selectedMonth - 1).toLocaleString('en', { month: 'short' })
    : BANGLA_MONTHS[selectedMonth - 1] || 'অক্টোবর';

  // Calculate actual category expenses for this month
  const categoryExpenses = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((tx) => {
        const [y, m] = tx.date.split('-').map(Number);
        return y === selectedYear && m === selectedMonth && tx.type === 'expense';
      })
      .forEach((tx) => {
        map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amount;
      });
    return map;
  }, [transactions, selectedYear, selectedMonth]);

  // Overall total budget calculation
  const totalBudgetAmount = useMemo(() => {
    if (budgets.length === 0 && settings.monthlyBudget > 0) {
      return settings.monthlyBudget;
    }
    return budgets.reduce((sum, b) => {
      return sum + (b.type === 'fixed' ? b.value : (monthlyExpense * b.value) / 100);
    }, 0);
  }, [budgets, settings.monthlyBudget, monthlyExpense]);

  const remainingBudget = Math.max(0, totalBudgetAmount - monthlyExpense);
  const isOverBudget = totalBudgetAmount > 0 && monthlyExpense > totalBudgetAmount;

  const budgetUsage =
    totalBudgetAmount > 0
      ? Math.round((monthlyExpense / totalBudgetAmount) * 100)
      : 0;

  // Days left in current month calculation for daily allowance
  const today = new Date();
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const currentDay = today.getDate();
  const daysRemaining = Math.max(1, daysInMonth - currentDay);
  const recommendedDailyAllowance = Math.max(0, Math.floor(remainingBudget / daysRemaining));

  const handleAddBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountValue);
    if (isNaN(val) || val <= 0) return;

    const cat = categories.find((c) => c.id === selectedCatId) || {
      id: 'all',
      name: isEn ? 'All Categories' : 'সকল ক্যাটাগরি',
    };

    addBudget({
      type: budgetType,
      value: val,
      categoryId: cat.id,
      categoryName: cat.name,
      month: selectedMonth,
      year: selectedYear,
    });

    setIsModalOpen(false);
    setAmountValue('');
    setSelectedCatId('');
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(catSearch.toLowerCase())
  );

  const filteredBudgets = budgets.filter((b) => {
    if (searchQuery.trim() && !b.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-24 pt-1">
      {/* 1. Main Summary Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        {/* Segmented Pill Selector: Month | Yearly | Total */}
        <div className="bg-[#f0f3f8] dark:bg-slate-800/80 rounded-xl p-1 flex items-center text-xs font-semibold">
          <button
            onClick={() => setPeriod('month')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
              period === 'month'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {currentMonthName}
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
              period === 'year'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isEn ? 'Yearly' : 'বাৎসরিক'}
          </button>
          <button
            onClick={() => setPeriod('total')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
              period === 'total'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isEn ? 'Total' : 'মোট'}
          </button>
        </div>

        {/* 3 Metric Columns: Total Budget | Spent | Remaining */}
        <div className="grid grid-cols-3 gap-2 items-center">
          {/* Total Budget */}
          <div className="text-center">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block mb-0.5">
              {isEn ? 'Total Budget' : 'মোট বাজেট'}
            </span>
            <span className="text-base font-bold text-blue-600 dark:text-blue-400 block truncate">
              {totalBudgetAmount > 0 ? (
                formatCurrency(totalBudgetAmount, settings.useBanglaNumerals && !isEn)
              ) : (
                settings.useBanglaNumerals && !isEn ? '০ ৳' : '৳ 0'
              )}
            </span>
          </div>

          {/* Spent */}
          <div className="text-center">
            <span className="text-xs font-semibold text-rose-500 block mb-0.5">
              {isEn ? 'Spent' : 'খরচ হয়েছে'}
            </span>
            <span className="text-base font-bold text-rose-500 block truncate">
              {monthlyExpense > 0 ? (
                formatCurrency(monthlyExpense, settings.useBanglaNumerals && !isEn)
              ) : (
                settings.useBanglaNumerals && !isEn ? '০ ৳' : '৳ 0'
              )}
            </span>
          </div>

          {/* Remaining */}
          <div className={`rounded-xl py-2 px-3 text-center transition-colors ${
            isOverBudget
              ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800'
              : 'bg-[#e4efff] dark:bg-blue-950/60'
          }`}>
            <span className={`text-xs font-semibold block mb-0.5 ${
              isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-[#1a73e8] dark:text-blue-400'
            }`}>
              {isOverBudget ? (isEn ? 'Over Budget' : 'বাজেট অতিক্রম') : (isEn ? 'Remaining' : 'অবশিষ্ট')}
            </span>
            <span className={`text-base font-bold block truncate ${
              isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-[#1a73e8] dark:text-blue-400'
            }`}>
              {isOverBudget
                ? `-${formatCurrency(monthlyExpense - totalBudgetAmount, settings.useBanglaNumerals && !isEn)}`
                : formatCurrency(remainingBudget, settings.useBanglaNumerals && !isEn)}
            </span>
          </div>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="pt-1">
          <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-1">
            <span className="flex items-center gap-1">
              {budgetUsage > 90 ? (
                <AlertTriangle className="w-3 h-3 text-rose-500" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              )}
              {isEn ? 'Budget Utilization' : 'বাজেট ব্যবহার হার'}
            </span>
            <span className={`font-bold ${
              budgetUsage > 100
                ? 'text-rose-600 dark:text-rose-400'
                : budgetUsage > 80
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-blue-600 dark:text-blue-400'
            }`}>
              {settings.useBanglaNumerals && !isEn ? toBanglaNumber(budgetUsage) : budgetUsage}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                budgetUsage > 100
                  ? 'bg-rose-500'
                  : budgetUsage > 80
                  ? 'bg-amber-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, budgetUsage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Overspend Alert Warning Banner */}
      {totalBudgetAmount > 0 && budgetUsage >= 80 && (
        <div className={`p-3.5 rounded-2xl border flex items-start gap-2.5 animate-in fade-in ${
          budgetUsage > 100
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
        }`}>
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <div className="space-y-0.5 text-xs">
            <h4 className="font-bold">
              {budgetUsage > 100
                ? (isEn ? '🚨 Critical Budget Exceeded!' : '🚨 সতর্কতা: আপনার বাজেট অতিক্রম করেছে!')
                : (isEn ? '⚠️ Approaching Budget Limit' : '⚠️ সতর্কতা: বাজেটের ৮০% এর বেশি শেষ হয়ে গেছে!')}
            </h4>
            <p className="text-[11px] opacity-90 leading-relaxed">
              {budgetUsage > 100
                ? (isEn
                    ? `You have spent ${formatCurrency(monthlyExpense - totalBudgetAmount, false)} over your planned budget.`
                    : `আপনি মোট বাজেটের চেয়ে ${formatCurrency(monthlyExpense - totalBudgetAmount, true)} বেশি খরচ করে ফেলেছেন। আগামী দিনগুলোতে অপচয় নিয়ন্ত্রণ করুন।`)
                : (isEn
                    ? `Only ${formatCurrency(remainingBudget, false)} remaining for the rest of this month.`
                    : `এই মাসের বাকি দিনগুলোর জন্য কেবল ${formatCurrency(remainingBudget, true)} অবশিষ্ট আছে।`)}
            </p>
          </div>
        </div>
      )}

      {/* Daily Spending Limit Recommendation Card */}
      {totalBudgetAmount > 0 && remainingBudget > 0 && (
        <div className="p-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-slate-800/80 dark:to-slate-800/40 rounded-2xl border border-blue-100 dark:border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {isEn ? 'Smart Daily Allowance' : 'দৈনিক সর্বোচ্চ খরচ সীমা'}
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-200 font-semibold">
                {isEn ? 'Remaining Days:' : 'মাসের বাকি:'}{' '}
                <span className="font-bold">{settings.useBanglaNumerals && !isEn ? toBanglaNumber(daysRemaining) : daysRemaining}</span>{' '}
                {isEn ? 'days' : 'দিন'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
              {formatCurrency(recommendedDailyAllowance, settings.useBanglaNumerals && !isEn)}
            </span>
            <span className="text-[9px] text-slate-400 block">{isEn ? 'per day' : 'প্রতি দিন'}</span>
          </div>
        </div>
      )}

      {/* 2. Action Bar */}
      <div className="flex items-center justify-between px-1 relative">
        <button
          onClick={() => setIsModalOpen(true)}
          className="border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50/20 hover:bg-blue-50/80 rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          <span className="text-sm leading-none font-bold">+</span>
          <span>{isEn ? 'Add Category Budget' : 'ক্যাটাগরি বাজেট যোগ'}</span>
        </button>

        <div className="flex items-center gap-4 text-slate-400 dark:text-slate-500">
          <button
            onClick={() => setShowSearchBar((s) => !s)}
            className={`hover:text-slate-600 dark:hover:text-slate-300 transition-colors ${
              showSearchBar ? 'text-blue-600 dark:text-blue-400' : ''
            }`}
            title={isEn ? 'Search' : 'সার্চ'}
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      {showSearchBar && (
        <div className="relative px-1 animate-in fade-in">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isEn ? 'Filter by category...' : 'ক্যাটাগরি অনুযায়ী খুঁজুন...'}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            autoFocus
          />
        </div>
      )}

      {/* 2. Content / Category Breakdown List */}
      {filteredBudgets.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="text-slate-300 dark:text-slate-600 mb-3">
            <PiggyBank className="w-14 h-14 stroke-[1.5]" />
          </div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {isEn ? 'No category budgets set' : 'কোন ক্যাটাগরি বাজেট নেই'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
            {isEn
              ? 'Click "+ Add Category Budget" to set limits for Groceries, Fuel, Bills etc.'
              : 'বাজার, যাতায়াত, বিল ইত্যাদির জন্য আলাদা সীমা নির্ধারণ করতে উপরের বাটনে চাপুন।'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredBudgets.map((b) => {
            const actualSpent = categoryExpenses[b.categoryId] || 0;
            const budgetCap = b.type === 'fixed' ? b.value : (monthlyExpense * b.value) / 100;
            const pct = budgetCap > 0 ? Math.round((actualSpent / budgetCap) * 100) : 0;
            const isCatOver = actualSpent > budgetCap;

            return (
              <div
                key={b.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 shadow-xs space-y-2 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <span>{b.categoryName}</span>
                      {isCatOver && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold">
                          {isEn ? 'Over' : 'অতিরিক্ত'}
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      {isEn ? 'Spent' : 'খরচ'}:{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {formatCurrency(actualSpent, settings.useBanglaNumerals && !isEn)}
                      </span>{' '}
                      / {isEn ? 'Budget' : 'বাজেট'}: {formatCurrency(budgetCap, settings.useBanglaNumerals && !isEn)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${
                      isCatOver
                        ? 'text-rose-600 dark:text-rose-400'
                        : pct > 80
                        ? 'text-amber-500'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {settings.useBanglaNumerals && !isEn ? toBanglaNumber(pct) : pct}%
                    </span>
                    <button
                      onClick={() => deleteBudget(b.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors rounded-lg"
                      title={isEn ? 'Delete' : 'মুছুন'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Micro progress bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isCatOver ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#1877f2] hover:bg-blue-600 active:scale-95 text-white shadow-xl shadow-blue-500/30 flex items-center justify-center transition-all focus:outline-none"
        title={isEn ? 'Add Budget' : 'নতুন বাজেট যোগ করুন'}
        aria-label="Add budget"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      {/* Add Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                {isEn ? 'Set Category Budget' : 'নতুন ক্যাটাগরি বাজেট'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBudgetSubmit} className="space-y-3.5">
              {/* Category Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  {isEn ? 'Select Category' : 'ক্যাটাগরি নির্বাচন'}
                </label>
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="">{isEn ? '-- Select Category --' : '-- ক্যাটাগরি বেছে নিন --'}</option>
                  {categories
                    .filter((c) => c.type === 'expense')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Budget Limit Amount */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  {isEn ? 'Monthly Budget Limit (৳)' : 'মাসিক সর্বোচ্চ বাজেট সীমা (৳)'}
                </label>
                <input
                  type="number"
                  value={amountValue}
                  onChange={(e) => setAmountValue(e.target.value)}
                  placeholder={isEn ? 'e.g. 5000' : 'যেমন: ৫০০০'}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800"
                >
                  {isEn ? 'Cancel' : 'বাতিল'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  {isEn ? 'Save Budget' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
