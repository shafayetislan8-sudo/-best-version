import React, { useState } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  Zap,
  Check,
  ArrowRight,
  Sparkles,
  Clipboard,
  RefreshCw,
  CreditCard,
  Wallet,
  Building,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTodayString, getCurrentTimeString, formatCurrency } from '../utils/formatters';

export const SmartSmsParserScreen: React.FC = () => {
  const { setActiveTab, addTransaction, categories, accounts, settings } = useApp();
  const isEn = settings.language === 'en';

  const [smsText, setSmsText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<{
    amount: number;
    type: 'income' | 'expense';
    accountId: string;
    accountName: string;
    categoryId: string;
    categoryName: string;
    note: string;
    rawSender: string;
    trxId?: string;
  } | null>(null);

  const [success, setSuccess] = useState(false);

  // Sample SMS templates common in Bangladesh
  const samples = [
    {
      label: isEn ? 'bKash Cash Out' : 'বিকাশ ক্যাশ আউট',
      text: 'Cash Out Tk 1,500.00 to 01712345678 successful. Fee Tk 27.75. Balance Tk 3,450.00. TrxID 9K8J2LM3 at 20/10/2026 11:30',
    },
    {
      label: isEn ? 'bKash Received' : 'বিকাশ টাকা গ্রহণ',
      text: 'You have received Tk 2,500.00 from 01898765432. Fee Tk 0.00. Balance Tk 5,950.00. TrxID 7N2V9P1X at 20/10/2026 10:15',
    },
    {
      label: isEn ? 'Nagad Merchant Payment' : 'নগদ মার্চেন্ট পেমেন্ট',
      text: 'Merchant Pay of Tk 850.00 to Shwapno (01911223344) is successful. Fee Tk 0.00. Balance Tk 3,210.00. TxnId: 88AFG1',
    },
    {
      label: isEn ? 'Bank Card POS' : 'ব্যাংক কার্ড পেমেন্ট',
      text: 'Your A/C ...4582 is debited by BDT 3,200.00 for POS transaction at Agora Superstore on 20-OCT-2026. Avail Bal BDT 48,500.00.',
    },
    {
      label: isEn ? 'Bank Salary Deposit' : 'ব্যাংক স্যালারি ক্রেডিট',
      text: 'Your A/C ...1290 is credited with BDT 45,000.00 on 20-OCT-2026 by Salary. Avail Bal BDT 52,300.00.',
    },
    {
      label: isEn ? 'bKash Mobile Recharge' : 'বিকাশ রিচার্জ',
      text: 'Recharge Tk 120.00 to 01700112233 successful. Balance Tk 1,120.00. TrxID 9H7B3Q',
    },
  ];

  const handlePasteFromClipboard = async () => {
    setPasteError(null);
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          handleParse(text);
        } else {
          setPasteError(isEn ? 'Clipboard is empty' : 'ক্লিপবোর্ডে কোনো লেখা পাওয়া যায়নি');
        }
      } else {
        setPasteError(isEn ? 'Clipboard access not supported. Please paste manually.' : 'ক্লিপবোর্ড অ্যাক্সেস সম্ভব হয়নি, অনুগ্রহ করে হাত দিয়ে পেস্ট করুন।');
      }
    } catch {
      setPasteError(isEn ? 'Please grant clipboard permission or paste manually.' : 'ক্লিপবোর্ড থেকে পড়তে সরাসরি নিচের বক্সে পেস্ট করুন।');
    }
  };

  const handleParse = (textToParse: string) => {
    setSmsText(textToParse);
    if (!textToParse.trim()) {
      setParsedData(null);
      return;
    }

    const t = textToParse.toLowerCase();

    // 1. Determine Type
    let txType: 'income' | 'expense' = 'expense';
    if (
      t.includes('received') ||
      t.includes('credited') ||
      t.includes('cash in') ||
      t.includes('deposit') ||
      t.includes('জমা') ||
      t.includes('গ্রহণ') ||
      t.includes('পেলেন')
    ) {
      txType = 'income';
    } else if (
      t.includes('cash out') ||
      t.includes('debited') ||
      t.includes('payment') ||
      t.includes('merchant pay') ||
      t.includes('send money') ||
      t.includes('recharge') ||
      t.includes('fee') ||
      t.includes('খরচ') ||
      t.includes('তোলা')
    ) {
      txType = 'expense';
    }

    // 2. Extract Amount
    let amount = 0;
    const bdtMatch = textToParse.match(/(?:tk\.?|bdt|টাকা)\s*([0-9,]+(?:\.[0-9]+)?)/i);
    if (bdtMatch && bdtMatch[1]) {
      amount = parseFloat(bdtMatch[1].replace(/,/g, ''));
    } else {
      const genericMatch = textToParse.match(/([0-9,]+(?:\.[0-9]+)?)/);
      if (genericMatch) {
        amount = parseFloat(genericMatch[1].replace(/,/g, ''));
      }
    }

    // 3. Determine Channel & Account
    let detectedSender = 'MFS / SMS';
    let matchedAcc = accounts[0];

    if (t.includes('bkash') || t.includes('বিকাশ')) {
      detectedSender = 'bKash';
      matchedAcc = accounts.find((a) => a.name.toLowerCase().includes('bkash') || a.name.toLowerCase().includes('বিকাশ')) || matchedAcc;
    } else if (t.includes('nagad') || t.includes('নগদ')) {
      detectedSender = 'Nagad';
      matchedAcc = accounts.find((a) => a.name.toLowerCase().includes('nagad') || a.name.toLowerCase().includes('নগদ')) || matchedAcc;
    } else if (t.includes('rocket') || t.includes('রকেট') || t.includes('dbbl')) {
      detectedSender = 'Rocket';
      matchedAcc = accounts.find((a) => a.name.toLowerCase().includes('rocket') || a.name.toLowerCase().includes('রকেট')) || matchedAcc;
    } else if (t.includes('bank') || t.includes('a/c') || t.includes('pos') || t.includes('card') || t.includes('ব্যাংক')) {
      detectedSender = 'Bank Account';
      matchedAcc = accounts.find((a) => a.type === 'bank' || a.name.toLowerCase().includes('bank') || a.name.toLowerCase().includes('ব্যাংক')) || matchedAcc;
    }

    // 4. Determine Category
    let matchedCat = categories.find((c) => c.type === txType) || categories[0];

    if (txType === 'income') {
      if (t.includes('salary') || t.includes('বেতন')) {
        matchedCat = categories.find((c) => c.name.includes('বেতন') || c.nameEn?.toLowerCase().includes('salary')) || matchedCat;
      } else {
        matchedCat = categories.find((c) => c.type === 'income' && (c.name.includes('অন্যান্য') || c.nameEn?.toLowerCase().includes('other'))) || matchedCat;
      }
    } else {
      if (t.includes('agora') || t.includes('shwapno') || t.includes('superstore') || t.includes('bazaar') || t.includes('বাজার') || t.includes('মুদি')) {
        matchedCat = categories.find((c) => c.name.includes('বাজার') || c.nameEn?.toLowerCase().includes('grocer')) || matchedCat;
      } else if (t.includes('recharge') || t.includes('রিচার্জ') || t.includes('mobile')) {
        matchedCat = categories.find((c) => c.name.includes('মোবাইল') || c.name.includes('বিল') || c.nameEn?.toLowerCase().includes('bill')) || matchedCat;
      } else if (t.includes('cash out') || t.includes('send money') || t.includes('fee')) {
        matchedCat = categories.find((c) => c.name.includes('অন্যান্য') || c.name.includes('ক্যাশ')) || matchedCat;
      }
    }

    // 5. Extract TrxID
    const trxMatch = textToParse.match(/(?:trxid|txnid|ref)\s*[:#]?\s*([a-z0-9]+)/i);
    const trxId = trxMatch ? trxMatch[1].toUpperCase() : undefined;

    const note = trxId
      ? `${detectedSender} SMS (TrxID: ${trxId})`
      : `${detectedSender} SMS Transaction`;

    setParsedData({
      amount: amount || 0,
      type: txType,
      accountId: matchedAcc ? matchedAcc.id : accounts[0]?.id || 'acc_cash',
      accountName: matchedAcc ? matchedAcc.name : 'Cash',
      categoryId: matchedCat ? matchedCat.id : categories[0]?.id || 'cat_general',
      categoryName: matchedCat ? matchedCat.name : 'General',
      note,
      rawSender: detectedSender,
      trxId,
    });
  };

  const handleSaveTransaction = () => {
    if (!parsedData || parsedData.amount <= 0) return;

    addTransaction({
      type: parsedData.type,
      amount: parsedData.amount,
      categoryId: parsedData.categoryId,
      categoryName: parsedData.categoryName,
      accountId: parsedData.accountId,
      accountName: parsedData.accountName,
      date: getTodayString(),
      time: getCurrentTimeString(),
      note: parsedData.note,
    });

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setActiveTab('dashboard');
    }, 1200);
  };

  return (
    <div className="space-y-4 pb-24 pt-1">
      {/* Top Header */}
      <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('profile_menu')}
            className="p-1.5 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isEn ? 'Back' : 'পেছনে যান'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {isEn ? 'Smart SMS & Bank Auto-Parser' : 'স্মার্ট এসএমএস ও ব্যাংক ট্র্যাকার'}
            </h2>
          </div>
        </div>

        <button
          onClick={handlePasteFromClipboard}
          className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <Clipboard className="w-3.5 h-3.5" />
          <span>{isEn ? 'Paste SMS' : 'পেস্ট করুন'}</span>
        </button>
      </div>

      {/* Description Card */}
      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/60 rounded-2xl border border-blue-100 dark:border-slate-700 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {isEn
            ? 'Copy any bKash, Nagad, Rocket, or Bank SMS and tap "Paste SMS". The app auto-detects Amount, Type, TrxID, and Account.'
            : 'বিকাশ, নগদ, রকেট বা ব্যাংকের ট্রানজ্যাকশন মেসেজ কপি করে "পেস্ট করুন" চাপুন। অ্যাপ নিমেষেই টাকার পরিমাণ, খরচ নাকি আয় এবং মাধ্যম শনাক্ত করে দেবে।'}
        </p>
      </div>

      {pasteError && (
        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
          {pasteError}
        </div>
      )}

      {/* Text Area */}
      <div className="space-y-2">
        <textarea
          rows={4}
          value={smsText}
          onChange={(e) => handleParse(e.target.value)}
          placeholder={isEn ? 'Paste transaction SMS text here...' : 'এখানে এসএমএস পেস্ট করুন (যেমন: Cash Out Tk 1,500.00 সফল হয়েছে)...'}
          className="w-full p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs resize-none placeholder:text-slate-400 leading-relaxed"
        />

        {/* Sample SMS Quick Selector */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {isEn ? 'Quick test with realistic sample SMS:' : 'টেস্ট করতে নিচের স্যাম্পল চাপুন:'}
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {samples.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => handleParse(s.text)}
                className="text-left text-[11px] font-medium p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 transition-colors truncate"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Parsed Result Card with Editing Capabilities */}
      {parsedData && parsedData.amount > 0 && (
        <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {isEn ? 'Recognized Transaction' : 'শনাক্ত হওয়া লেনদেনের বিবরণ'}
              </span>
            </div>
            {/* Type selector toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setParsedData({ ...parsedData, type: 'expense' })}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  parsedData.type === 'expense'
                    ? 'bg-rose-500 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {isEn ? 'Expense' : 'ব্যয় (-)'}
              </button>
              <button
                type="button"
                onClick={() => setParsedData({ ...parsedData, type: 'income' })}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  parsedData.type === 'income'
                    ? 'bg-emerald-500 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {isEn ? 'Income' : 'আয় (+)'}
              </button>
            </div>
          </div>

          {/* Amount Display */}
          <div className="flex items-baseline justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isEn ? 'Amount' : 'টাকার পরিমাণ'}
            </span>
            <span
              className={`text-2xl font-black ${
                parsedData.type === 'income'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {parsedData.type === 'income' ? '+' : '-'}
              {formatCurrency(parsedData.amount, settings.useBanglaNumerals && !isEn)}
            </span>
          </div>

          {/* Adjustable Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Account Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                {isEn ? 'Account' : 'মাধ্যম / অ্যাকাউন্ট'}
              </label>
              <select
                value={parsedData.accountId}
                onChange={(e) => {
                  const acc = accounts.find((a) => a.id === e.target.value);
                  setParsedData({
                    ...parsedData,
                    accountId: e.target.value,
                    accountName: acc ? acc.name : parsedData.accountName,
                  });
                }}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                {isEn ? 'Category' : 'খাত / ক্যাটাগরি'}
              </label>
              <select
                value={parsedData.categoryId}
                onChange={(e) => {
                  const cat = categories.find((c) => c.id === e.target.value);
                  setParsedData({
                    ...parsedData,
                    categoryId: e.target.value,
                    categoryName: cat ? cat.name : parsedData.categoryName,
                  });
                }}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {categories
                  .filter((c) => c.type === parsedData.type)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Note Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">
              {isEn ? 'Note / Reference' : 'নোট / বিবরণ'}
            </label>
            <input
              type="text"
              value={parsedData.note}
              onChange={(e) => setParsedData({ ...parsedData, note: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveTransaction}
            disabled={success}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            {success ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>{isEn ? 'Saved to Transactions!' : 'সফলভাবে যুক্ত হয়েছে! ড্যাশবোর্ডে যাচ্ছি...'}</span>
              </>
            ) : (
              <>
                <span>{isEn ? 'Add to Transactions' : 'হিসেবে যুক্ত করুন'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
