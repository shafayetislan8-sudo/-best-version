import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Calendar,
  PiggyBank,
  Printer,
  Download,
  FileSpreadsheet,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  formatCurrency,
  toBanglaNumber,
  BANGLA_MONTHS,
  getTodayString,
  formatBengaliDate,
} from '../utils/formatters';
import { renderCategoryIcon } from '../utils/iconMap';

export const ReportsView: React.FC = () => {
  const { transactions, settings, selectedYear } = useApp();
  const isEn = settings.language === 'en';
  const [timeframe, setTimeframe] = useState<'this_month' | 'last_month' | 'this_year' | 'all'>('this_month');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  // Filter transactions based on timeframe
  const periodTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const [year, month] = tx.date.split('-').map(Number);
      if (timeframe === 'this_month') {
        return year === curYear && month === curMonth;
      }
      if (timeframe === 'last_month') {
        const lastM = curMonth === 1 ? 12 : curMonth - 1;
        const lastY = curMonth === 1 ? curYear - 1 : curYear;
        return year === lastY && month === lastM;
      }
      if (timeframe === 'this_year') {
        return year === curYear;
      }
      return true;
    });
  }, [transactions, timeframe, curYear, curMonth]);

  // Overall totals for selected period
  const totalIncome = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const totalExpense = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const netSavings = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

  // Category breakdown for expenses
  const categorySpending = useMemo(() => {
    const map: Record<
      string,
      { name: string; icon?: string; color?: string; total: number }
    > = {};

    periodTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        if (!map[t.categoryId]) {
          map[t.categoryId] = {
            name: t.categoryName,
            icon: t.categoryIcon,
            color: t.categoryColor || '#ef4444',
            total: 0,
          };
        }
        map[t.categoryId].total += t.amount;
      });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [periodTransactions]);

  // Monthly Trend for current year (Jan - Dec)
  const monthlyTrends = useMemo(() => {
    const data: { month: number; name: string; income: number; expense: number }[] = [];
    const enShortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let m = 1; m <= 12; m++) {
      let inc = 0;
      let exp = 0;
      transactions.forEach((tx) => {
        const [year, month] = tx.date.split('-').map(Number);
        if (year === curYear && month === m) {
          if (tx.type === 'income') inc += tx.amount;
          if (tx.type === 'expense') exp += tx.amount;
        }
      });
      data.push({
        month: m,
        name: isEn ? enShortMonths[m - 1] : BANGLA_MONTHS[m - 1] || `${m}`,
        income: inc,
        expense: exp,
      });
    }
    return data;
  }, [transactions, curYear, isEn]);

  const maxMonthValue = Math.max(
    ...monthlyTrends.map((d) => Math.max(d.income, d.expense)),
    1000
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    if (periodTransactions.length === 0) return;

    const headers = isEn
      ? ['Date', 'Time', 'Type', 'Category', 'Account', 'Amount', 'Note']
      : ['তারিখ', 'সময়', 'ধরন', 'খাত/ক্যাটাগরি', 'অ্যাকাউন্ট', 'পরিমাণ (৳)', 'বিবরণ/নোট'];

    const rows = periodTransactions.map((tx) => {
      const typeLabel =
        tx.type === 'income'
          ? isEn ? 'Income' : 'আয়'
          : tx.type === 'expense'
          ? isEn ? 'Expense' : 'ব্যয়'
          : isEn ? 'Transfer' : 'স্থানান্তর';

      return [
        `"${tx.date}"`,
        `"${tx.time || ''}"`,
        `"${typeLabel}"`,
        `"${tx.categoryName.replace(/"/g, '""')}"`,
        `"${(tx.accountName || '').replace(/"/g, '""')}"`,
        `"${tx.amount}"`,
        `"${(tx.note || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    // Add summary row at bottom
    rows.push('');
    rows.push(
      isEn
        ? `"","","SUMMARY","Total Income","","${totalIncome}",""`
        : `"","","সারসংক্ষেপ","মোট আয়","","${totalIncome}",""`
    );
    rows.push(
      isEn
        ? `"","","SUMMARY","Total Expense","","${totalExpense}",""`
        : `"","","সারসংক্ষেপ","মোট ব্যয়","","${totalExpense}",""`
    );
    rows.push(
      isEn
        ? `"","","SUMMARY","Net Savings","","${netSavings}",""`
        : `"","","সারসংক্ষেপ","নিট সঞ্চয়","","${netSavings}",""`
    );

    // UTF-8 BOM prefix for Excel Bengali support
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ay_byay_statement_${timeframe}_${getTodayString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  return (
    <div className="space-y-4 pb-24 pt-1">
      {/* Timeframe Switcher & Export Actions */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl p-1.5 border border-slate-100 dark:border-slate-800 shadow-xs">
        <div className="grid grid-cols-4 gap-1 flex-1">
          {[
            { id: 'this_month', label: isEn ? 'This Month' : 'চলতি মাস' },
            { id: 'last_month', label: isEn ? 'Last Month' : 'গত মাস' },
            { id: 'this_year', label: isEn ? 'This Year' : 'এই বছর' },
            { id: 'all', label: isEn ? 'All Time' : 'সার্বিক' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTimeframe(item.id as any)}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                timeframe === item.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Action Buttons: Excel / CSV & Print / PDF */}
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={handleDownloadCSV}
            className="p-2 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
            title={isEn ? 'Download Excel / CSV Statement' : 'এক্সেল / CSV ডাউনলোড'}
          >
            {downloadSuccess ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handlePrint}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isEn ? 'Print / Export PDF' : 'প্রিন্ট / PDF ডাউনলোড'}
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{isEn ? 'CSV Statement Downloaded Successfully!' : 'এক্সেল / CSV স্টেটমেন্ট সফলভাবে ডাউনলোড হয়েছে!'}</span>
        </div>
      )}

      {/* Main KPI Summary */}
      <div className="grid grid-cols-2 gap-3">
        {/* Income & Expense */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{isEn ? 'Total Income' : 'মোট আয়'}</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 truncate">
            {formatCurrency(totalIncome, settings.useBanglaNumerals && !isEn)}
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">{isEn ? 'Total Expense' : 'মোট ব্যয়'}:</span>
            <span className="font-bold text-rose-500">
              {formatCurrency(totalExpense, settings.useBanglaNumerals && !isEn)}
            </span>
          </div>
        </div>

        {/* Net Savings & Savings Rate */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{isEn ? 'Net Savings' : 'নিট সঞ্চয়'}</span>
            <PiggyBank className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <p
            className={`text-lg font-black truncate ${
              netSavings >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600'
            }`}
          >
            {formatCurrency(netSavings, settings.useBanglaNumerals && !isEn)}
          </p>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 mt-2 overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, savingsRate)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex justify-between">
            <span>{isEn ? 'Savings Rate' : 'সঞ্চয়ের হার'}</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {settings.useBanglaNumerals && !isEn ? toBanglaNumber(savingsRate) : savingsRate}%
            </span>
          </p>
        </div>
      </div>

      {/* Category Spending Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-blue-600" />
            {isEn ? 'Category-wise Expense Breakdown' : 'ক্যাটাগরি ভিত্তিক ব্যয়ের বিশ্লেষণ'}
          </h3>
          <span className="text-[11px] text-slate-400 font-semibold">
            {isEn ? 'Total' : 'সর্বমোট'}: {formatCurrency(totalExpense, settings.useBanglaNumerals && !isEn)}
          </span>
        </div>

        {categorySpending.length === 0 ? (
          <p className="text-xs text-center py-6 text-slate-400">
            {isEn ? 'No expense data found for this period' : 'এই সময়কালের জন্য কোনো ব্যয়ের তথ্য নেই'}
          </p>
        ) : (
          <div className="space-y-3 pt-1">
            {categorySpending.map((cat) => {
              const percentage =
                totalExpense > 0 ? Math.round((cat.total / totalExpense) * 100) : 0;
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white"
                        style={{ backgroundColor: cat.color }}
                      >
                        {renderCategoryIcon(cat.icon, 'w-3.5 h-3.5', '#ffffff')}
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {cat.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(cat.total, settings.useBanglaNumerals && !isEn)}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-1.5">
                        ({settings.useBanglaNumerals && !isEn ? toBanglaNumber(percentage) : percentage}%)
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: cat.color,
                        width: `${Math.min(100, percentage)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Trends (Yearly Graph) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            {isEn ? 'Monthly Income & Expense Trend' : 'মাসিক আয় ও ব্যয় প্রবণতা'} ({settings.useBanglaNumerals && !isEn ? toBanglaNumber(curYear) : curYear})
          </h3>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> {isEn ? 'Income' : 'আয়'}
            </span>
            <span className="flex items-center gap-1 text-rose-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> {isEn ? 'Expense' : 'ব্যয়'}
            </span>
          </div>
        </div>

        {/* Clean SVG/HTML Bar Chart */}
        <div className="pt-4 flex items-end justify-between gap-1 h-36 border-b border-slate-100 dark:border-slate-800 pb-2">
          {monthlyTrends.map((item) => {
            const incomeHeight = Math.max(4, Math.round((item.income / maxMonthValue) * 100));
            const expenseHeight = Math.max(4, Math.round((item.expense / maxMonthValue) * 100));
            const hasData = item.income > 0 || item.expense > 0;

            return (
              <div
                key={item.month}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                {/* Tooltip on hover */}
                {hasData && (
                  <div className="hidden group-hover:block absolute -top-12 z-20 bg-slate-900 text-white text-[10px] p-1.5 rounded-lg shadow-lg whitespace-nowrap">
                    <p className="text-emerald-400">
                      {isEn ? 'Inc' : 'আয়'}: {formatCurrency(item.income, settings.useBanglaNumerals && !isEn)}
                    </p>
                    <p className="text-rose-400">
                      {isEn ? 'Exp' : 'ব্যয়'}: {formatCurrency(item.expense, settings.useBanglaNumerals && !isEn)}
                    </p>
                  </div>
                )}

                <div className="flex items-end gap-0.5 w-full justify-center">
                  {/* Income Bar */}
                  <div
                    className="w-2 sm:w-3 bg-emerald-500 rounded-t-sm transition-all duration-300"
                    style={{ height: `${incomeHeight}%` }}
                  />
                  {/* Expense Bar */}
                  <div
                    className="w-2 sm:w-3 bg-rose-500 rounded-t-sm transition-all duration-300"
                    style={{ height: `${expenseHeight}%` }}
                  />
                </div>

                <span className="text-[10px] text-slate-400 mt-2 block truncate">
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Period Transactions Statement Table (Print & Review) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            {isEn ? 'Detailed Statement Ledger' : 'পূর্ণাঙ্গ লেজার ও স্টেটমেন্ট'}
          </h3>
          <span className="text-[10px] text-slate-400">
            {periodTransactions.length} {isEn ? 'records' : 'টি রেকর্ড'}
          </span>
        </div>

        {periodTransactions.length === 0 ? (
          <p className="text-xs text-center py-6 text-slate-400">
            {isEn ? 'No transactions in this period' : 'এই সময়কালে কোনো লেনদেনের তথ্য নেই'}
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
            {periodTransactions.slice(0, 30).map((tx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {tx.categoryName}
                    </span>
                    <span className="text-[10px] text-slate-400">({tx.accountName})</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {isEn ? tx.date : formatBengaliDate(tx.date)} {tx.time && `• ${tx.time}`} {tx.note && `• ${tx.note}`}
                  </p>
                </div>

                <span
                  className={`font-black text-xs ${
                    tx.type === 'income'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : tx.type === 'expense'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '⇄'}{' '}
                  {formatCurrency(tx.amount, settings.useBanglaNumerals && !isEn)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
