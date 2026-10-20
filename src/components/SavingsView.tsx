import React, { useState } from 'react';
import {
  Plus,
  Calendar,
  Tag,
  Target,
  Trash2,
  Search,
  PiggyBank,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  X,
  Coins,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, toBanglaNumber, getTodayString } from '../utils/formatters';
import { SavingsGoal } from '../types';

export const SavingsView: React.FC = () => {
  const { savings, addSavings, updateSavings, depositToSavings, deleteSavings, settings } = useApp();
  const isEn = settings.language === 'en';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialSaved, setInitialSaved] = useState('');
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString(isEn ? 'en-GB' : 'bn-BD', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  );

  // Deposit modal state
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  const [filterType, setFilterType] = useState<'all' | 'active' | 'completed'>('all');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addSavings({
      name: name.trim(),
      targetAmount: parseFloat(targetAmount) || 0,
      date,
    });

    const initAmt = parseFloat(initialSaved);
    if (!isNaN(initAmt) && initAmt > 0) {
      setTimeout(() => {
        // Will be updated via state
      }, 50);
    }

    setIsModalOpen(false);
    setName('');
    setTargetAmount('');
    setInitialSaved('');
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositGoal) return;
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;

    depositToSavings(depositGoal.id, amt);
    setDepositGoal(null);
    setDepositAmount('');
  };

  const totalTarget = savings.reduce((sum, s) => sum + s.targetAmount, 0);
  const totalSaved = savings.reduce((sum, s) => sum + (s.currentAmount || 0), 0);
  const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  const filteredSavings = savings.filter((s) => {
    if (searchQuery.trim() && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    const isCompleted = (s.currentAmount || 0) >= s.targetAmount && s.targetAmount > 0;
    if (filterType === 'active' && isCompleted) return false;
    if (filterType === 'completed' && !isCompleted) return false;
    return true;
  });

  return (
    <div className="space-y-4 pb-24 pt-1">
      {/* 1. Main Summary Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        {/* Segmented Pill Selector: All | Active | Completed */}
        <div className="bg-[#f0f3f8] dark:bg-slate-800/80 rounded-xl p-1 flex items-center text-xs font-semibold">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
              filterType === 'all'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isEn ? 'All Goals' : 'সকল লক্ষ্য'}
          </button>
          <button
            onClick={() => setFilterType('active')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
              filterType === 'active'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isEn ? 'In Progress' : 'চলমান'}
          </button>
          <button
            onClick={() => setFilterType('completed')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
              filterType === 'completed'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isEn ? 'Achieved' : 'অর্জিত'}
          </button>
        </div>

        {/* 3 Metric Columns: Total Target | Saved | Progress */}
        <div className="grid grid-cols-3 gap-2 items-center">
          {/* Total Target */}
          <div className="text-center">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block mb-0.5">
              {isEn ? 'Total Target' : 'মোট লক্ষ্য'}
            </span>
            <span className="text-base font-bold text-blue-600 dark:text-blue-400 block truncate">
              {totalTarget > 0 ? (
                formatCurrency(totalTarget, settings.useBanglaNumerals && !isEn)
              ) : (
                settings.useBanglaNumerals && !isEn ? '০ ৳' : '৳ 0'
              )}
            </span>
          </div>

          {/* Total Saved */}
          <div className="text-center">
            <span className="text-xs font-semibold text-emerald-500 block mb-0.5">
              {isEn ? 'Saved So Far' : 'জমা হয়েছে'}
            </span>
            <span className="text-base font-bold text-emerald-500 block truncate">
              {totalSaved > 0 ? (
                formatCurrency(totalSaved, settings.useBanglaNumerals && !isEn)
              ) : (
                settings.useBanglaNumerals && !isEn ? '০ ৳' : '৳ 0'
              )}
            </span>
          </div>

          {/* Progress */}
          <div className="bg-[#e4efff] dark:bg-blue-950/60 rounded-xl py-2 px-3 text-center">
            <span className="text-xs font-semibold text-[#1a73e8] dark:text-blue-400 block mb-0.5">
              {isEn ? 'Progress' : 'অগ্রগতি'}
            </span>
            <span className="text-base font-bold text-[#1a73e8] dark:text-blue-400 block truncate">
              {settings.useBanglaNumerals && !isEn ? toBanglaNumber(overallProgress) : overallProgress}%
            </span>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="pt-1">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mb-1">
            <span>{isEn ? 'Savings Target Achievement' : 'সঞ্চয় লক্ষ্য পূরণ হার'}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {settings.useBanglaNumerals && !isEn ? toBanglaNumber(overallProgress) : overallProgress}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
              style={{ width: `${Math.min(100, overallProgress)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Action Bar */}
      <div className="flex items-center justify-between px-1 relative">
        <button
          onClick={() => setIsModalOpen(true)}
          className="border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50/20 hover:bg-blue-50/80 rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          <span className="text-sm leading-none font-bold">+</span>
          <span>{isEn ? 'Add Goal' : 'নতুন সঞ্চয় লক্ষ্য'}</span>
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
            placeholder={isEn ? 'Search savings goal...' : 'সঞ্চয়ের খাত খুঁজুন...'}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            autoFocus
          />
        </div>
      )}

      {/* Empty State */}
      {filteredSavings.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="text-amber-500/80 mb-3">
            <PiggyBank className="w-16 h-16 stroke-[1.5]" />
          </div>
          <p className="text-xs font-bold text-slate-800 dark:text-white">
            {isEn ? 'No savings goals added yet' : 'কোন সঞ্চয়ের খাত নেই'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
            {isEn
              ? 'Click "+ Add Goal" to track emergency fund, Hajj, bike, or personal savings.'
              : 'জরুরি ফান্ড, হজ, বাইক বা নতুন লক্ষ্যের জন্য সঞ্চয় হিসাব তৈরি করতে উপরের বাটনে চাপুন।'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSavings.map((s) => {
            const current = s.currentAmount || 0;
            const progress = s.targetAmount > 0 ? Math.min(100, Math.round((current / s.targetAmount) * 100)) : 0;
            const remaining = Math.max(0, s.targetAmount - current);
            const isCompleted = current >= s.targetAmount && s.targetAmount > 0;

            return (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs space-y-3 hover:border-emerald-200 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isCompleted
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                        : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600'
                    }`}>
                      <PiggyBank className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                        <span>{s.name}</span>
                        {isCompleted && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                            {isEn ? 'Achieved' : 'অর্জিত ✓'}
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {isEn ? 'Added' : 'তারিখ'}: {s.date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDepositGoal(s);
                        setDepositAmount('');
                      }}
                      className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>{isEn ? '+ Deposit' : '+ টাকা জমা'}</span>
                    </button>
                    <button
                      onClick={() => deleteSavings(s.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors rounded-lg"
                      title={isEn ? 'Delete' : 'মুছুন'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Numbers */}
                <div className="grid grid-cols-2 text-xs pt-1 border-t border-slate-50 dark:border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{isEn ? 'Current Saved' : 'বর্তমান জমা'}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatCurrency(current, settings.useBanglaNumerals && !isEn)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">{isEn ? 'Target Amount' : 'লক্ষ্য'}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {formatCurrency(s.targetAmount, settings.useBanglaNumerals && !isEn)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                    <span>
                      {isCompleted
                        ? (isEn ? 'Goal reached!' : 'আলহামদুলিল্লাহ! লক্ষ্য পূরণ হয়েছে!')
                        : (isEn ? `Remaining: ৳${remaining}` : `বাকি: ${formatCurrency(remaining, settings.useBanglaNumerals && !isEn)}`)}
                    </span>
                    <span className="font-bold text-emerald-600">
                      {settings.useBanglaNumerals && !isEn ? toBanglaNumber(progress) : progress}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
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
        title={isEn ? 'Add Savings Goal' : 'নতুন সঞ্চয়ের খাত যোগ করুন'}
        aria-label="Add savings goal"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      {/* Quick Deposit Modal */}
      {depositGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white">
                    {isEn ? 'Deposit into Goal' : 'টাকা জমা করুন'}
                  </h3>
                  <p className="text-[10px] text-slate-400">{depositGoal.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDepositGoal(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  {isEn ? 'Deposit Amount (৳)' : 'জমার পরিমাণ (৳)'}
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder={isEn ? 'e.g. 1000' : 'যেমন: ১০০০'}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-800 dark:text-white focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDepositGoal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  {isEn ? 'Cancel' : 'বাতিল'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  {isEn ? 'Confirm Deposit' : 'জমা নিশ্চিত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Savings Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                {isEn ? 'Add New Savings Goal' : 'নতুন সঞ্চয়ের খাত'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              {/* Goal Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  {isEn ? 'Goal Name' : 'সঞ্চয়ের খাতের নাম'}
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                  <Tag className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isEn ? 'e.g. Hajj, Emergency Fund, Motorcycle' : 'যেমন: হজ ফান্ড, জরুরি সঞ্চয়, মোটরসাইকেল'}
                    className="w-full bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Target Amount */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  {isEn ? 'Target Amount (৳)' : 'মোট লক্ষ্যমাত্রা (৳)'}
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                  <Target className="w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder={isEn ? 'e.g. 50000' : 'যেমন: ৫০,০০০'}
                    className="w-full bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none"
                    required
                  />
                </div>
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
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  {isEn ? 'Add Goal' : 'লক্ষ্য তৈরি করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
