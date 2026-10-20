import React, { useState, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Search,
  MoreVertical,
  Plus,
  ArrowLeft,
  Calendar,
  Phone,
  MapPin,
  Image as ImageIcon,
  RotateCw,
  FileText,
  Trash2,
  Check,
  X,
  MessageCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, toBanglaNumber, getTodayString } from '../utils/formatters';
import { PersonRecord } from '../types';

export const PersonsView: React.FC = () => {
  const {
    persons,
    addPerson,
    updatePerson,
    deletePerson,
    totalReceivable,
    totalPayable,
    totalPersonsCount,
    settings,
    setActiveTab,
  } = useApp();

  const isEn = settings.language === 'en';
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'receive' | 'give'>('all');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonRecord | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [reminderPerson, setReminderPerson] = useState<PersonRecord | null>(null);
  const [reminderTone, setReminderTone] = useState<'polite' | 'standard' | 'urgent'>('polite');
  const [customReminderMsg, setCustomReminderMsg] = useState<string>('');
  const [copiedReminder, setCopiedReminder] = useState(false);

  // Photo upload states
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleDownloadReport = () => {
    setShowMenu(false);
    if (persons.length === 0) {
      setToastMessage(isEn ? 'No records to download' : 'ডাউনলোড করার মতো কোনো তথ্য নেই');
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }
    const headers = isEn
      ? ['Name,Phone,Address,Type,Amount,Date']
      : ['নাম,ফোন,ঠিকানা,ধরন,পরিমাণ,তারিখ'];
    const rows = persons.map(
      (p) =>
        `"${p.name}","${p.phoneNumber || ''}","${p.address || ''}","${
          p.type === 'receive'
            ? isEn
              ? 'Receivable'
              : 'পাবো'
            : isEn
            ? 'Payable'
            : 'দিবো'
        }","${p.amount}","${p.date}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `debts_ledger_${getTodayString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMessage(isEn ? 'Report downloaded as CSV' : 'রিপোর্ট CSV আকারে ডাউনলোড হয়েছে');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Form states for person
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(() => new Date().toLocaleDateString(isEn ? 'en-GB' : 'bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }));
  const [type, setType] = useState<'receive' | 'give'>('receive');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error(isEn ? 'Please select a valid image file' : 'অনুগ্রহ করে একটি সঠিক ছবির ফাইল নির্বাচন করুন'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 320;
            let w = img.width;
            let h = img.height;
            if (w > h && w > maxDim) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else if (h > maxDim) {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Canvas context unavailable'));
              return;
            }
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve(dataUrl);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('Image decode error'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    setPhotoError(null);
    try {
      const dataUrl = await compressImage(file);
      setPhotoUrl(dataUrl);
      setToastMessage(isEn ? 'Photo selected successfully' : 'ছবি নির্বাচন করা হয়েছে');
      setTimeout(() => setToastMessage(null), 2000);
    } catch (err: any) {
      console.error('Photo upload failed:', err);
      setPhotoError(
        isEn
          ? 'Failed to process photo. Please try a different image.'
          : 'ছবি প্রসেস করা সম্ভব হয়নি। অনুগ্রহ করে অন্য ছবি দিয়ে চেষ্টা করুন।'
      );
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const openAddModal = () => {
    setEditingPerson(null);
    setName('');
    setPhoneNumber('');
    setAddress('');
    setDate(new Date().toLocaleDateString(isEn ? 'en-GB' : 'bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }));
    setType('receive');
    setAmount('');
    setNotes('');
    setPhotoUrl('');
    setPhotoError(null);
    setIsAddPersonOpen(true);
  };

  const openEditModal = (p: PersonRecord) => {
    setEditingPerson(p);
    setName(p.name);
    setPhoneNumber(p.phoneNumber || '');
    setAddress(p.address || '');
    setDate(p.date);
    setType(p.type);
    setAmount(String(p.amount));
    setNotes(p.notes || '');
    setPhotoUrl(p.photoUrl || '');
    setPhotoError(null);
    setIsAddPersonOpen(true);
  };

  const filteredPersons = useMemo(() => {
    let list = persons;
    if (filterType === 'receive') {
      list = list.filter((p) => p.type === 'receive');
    } else if (filterType === 'give') {
      list = list.filter((p) => p.type === 'give');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || (p.phoneNumber && p.phoneNumber.includes(q))
      );
    }
    return list;
  }, [persons, filterType, searchQuery]);

  const handleSavePerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const numAmount = parseFloat(amount) || 0;

    if (editingPerson) {
      updatePerson(editingPerson.id, {
        name: name.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        address: address.trim() || undefined,
        date,
        type,
        amount: numAmount,
        notes: notes.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
      });
      setToastMessage(isEn ? 'Person updated successfully' : 'ব্যক্তির তথ্য আপডেট করা হয়েছে');
    } else {
      addPerson({
        name: name.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        address: address.trim() || undefined,
        date,
        type,
        amount: numAmount,
        notes: notes.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
      });
      setToastMessage(isEn ? 'Person added successfully' : 'নতুন ব্যক্তি যোগ করা হয়েছে');
    }

    setIsAddPersonOpen(false);
    setEditingPerson(null);
    setName('');
    setPhoneNumber('');
    setAddress('');
    setAmount('');
    setNotes('');
    setPhotoUrl('');
    setPhotoError(null);
    setTimeout(() => setToastMessage(null), 2500);
  };

  if (isAddPersonOpen) {
    return (
      <div className="space-y-4 pb-20 pt-1">
        {/* Top Header */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsAddPersonOpen(false);
                setEditingPerson(null);
              }}
              className="p-1 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {editingPerson
                ? (isEn ? 'Edit Person' : 'ব্যক্তির তথ্য সম্পাদনা')
                : (isEn ? 'Add Person / Debt Record' : 'নতুন ব্যক্তি')}
            </h2>
          </div>

          <button
            onClick={handleSavePerson}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            {isEn ? 'Save' : 'সেইভ'}
          </button>
        </div>

        {/* Circular Avatar Photo Upload (Requirement 2) */}
        <div className="flex flex-col items-center justify-center py-3">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shadow-xs group"
            title={isEn ? 'Upload Photo (Camera or Gallery)' : 'ছবি আপলোড করুন (ক্যামেরা বা গ্যালারি)'}
          >
            {photoUrl ? (
              <>
                <img
                  src={photoUrl}
                  alt="Profile Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                  {isEn ? 'Change' : 'পরিবর্তন'}
                </div>
              </>
            ) : (
              <>
                <ImageIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {isUploadingPhoto ? (isEn ? 'Processing...' : 'লোড হচ্ছে...') : isEn ? '+ Photo' : '+ ছবি'}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {photoUrl
                ? (isEn ? 'Change Photo' : 'ছবি পরিবর্তন করুন')
                : (isEn ? 'Select from Gallery/Camera' : 'গ্যালারি বা ক্যামেরা থেকে ছবি নিন')}
            </button>
            {photoUrl && (
              <button
                type="button"
                onClick={() => setPhotoUrl('')}
                className="text-[11px] font-bold text-rose-500 hover:underline ml-2"
              >
                {isEn ? 'Remove' : 'মুছে ফেলুন'}
              </button>
            )}
          </div>

          {photoError && (
            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1 text-center max-w-xs">
              {photoError}
            </p>
          )}
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSavePerson} className="space-y-3 px-1">
          {/* Name */}
          <div className="relative flex items-center">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isEn ? 'Person name' : 'নাম লিখুন'}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              required
            />
          </div>

          {/* Phone */}
          <div className="relative flex items-center">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={isEn ? 'Phone number (optional)' : 'ফোন নম্বর (ঐচ্ছিক)'}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>

          {/* Address */}
          <div className="relative flex items-center">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={isEn ? 'Address / Location (optional)' : 'ঠিকানা (ঐচ্ছিক)'}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>

          {/* Type Toggle: Receive | Give */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setType('receive')}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                type === 'receive'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-400 ring-1 ring-emerald-400'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {isEn ? '↓ Receivable (I will get)' : '↓ পাবো (টাকা)'}
            </button>
            <button
              type="button"
              onClick={() => setType('give')}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                type === 'give'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-400 ring-1 ring-rose-400'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {isEn ? '↑ Payable (I will give)' : '↑ দিবো (টাকা)'}
            </button>
          </div>

          {/* Amount */}
          <div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={isEn ? 'Amount (৳ / BDT)' : 'টাকার পরিমাণ (৳)'}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              required
            />
          </div>

          {/* Notes / Details */}
          <div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isEn ? 'Notes / Details (optional)' : 'নোট বা অতিরিক্ত বিবরণ (ঐচ্ছিক)'}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>

          {/* Date Picker Button */}
          <button
            type="button"
            onClick={() => setShowCalendarModal(true)}
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 flex items-center gap-2 shadow-xs"
          >
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>
              {isEn ? 'Date' : 'তারিখ'}: {date}
            </span>
          </button>

          {/* Save Button */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
            >
              {isEn ? 'Save Person' : 'সেইভ'}
            </button>
          </div>
        </form>

        {/* Toast Warning */}
        {toastMessage && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in z-50">
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">!</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Calendar Picker Modal */}
        {showCalendarModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-100 dark:border-slate-800 max-w-xs w-full space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-[10px] text-slate-400">
                  {isEn ? 'Select date' : 'তারিখ বেছে নিন'}
                </span>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                  {new Date().toLocaleDateString(isEn ? 'en-US' : 'bn-BD', { month: 'short', year: 'numeric' })}
                </h4>
              </div>
              <div className="text-center py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {new Date().toLocaleDateString(isEn ? 'en-US' : 'bn-BD', { month: 'long', year: 'numeric' })}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setShowCalendarModal(false)}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  {isEn ? 'Cancel' : 'বাতিল করুন'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCalendarModal(false)}
                  className="px-3 py-1.5 text-blue-600 dark:text-blue-400"
                >
                  {isEn ? 'OK' : 'ঠিক আছে'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 pt-1">
      {/* 1. Main Summary Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs">
        {/* Segmented Pill Selector: All | Receivable | Payable */}
        <div className="bg-[#f0f3f8] dark:bg-slate-800/80 rounded-xl p-1 flex items-center text-xs font-semibold">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
              filterType === 'all'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isEn ? 'All' : 'সকল'}
          </button>
          <button
            onClick={() => setFilterType('receive')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
              filterType === 'receive'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isEn ? 'Receivable' : 'পাবো'}
          </button>
          <button
            onClick={() => setFilterType('give')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
              filterType === 'give'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isEn ? 'Payable' : 'দিবো'}
          </button>
        </div>

        {/* 3 Metric Columns: ↓ Receivable | ↑ Payable | Total */}
        <div className="grid grid-cols-3 gap-2 mt-4 items-center">
          {/* Receivable */}
          <div
            onClick={() => setFilterType(filterType === 'receive' ? 'all' : 'receive')}
            className={`text-center cursor-pointer p-1.5 rounded-xl transition-all ${
              filterType === 'receive'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-400'
                : ''
            }`}
          >
            <span className="text-xs font-semibold text-emerald-500 block mb-0.5">
              {isEn ? 'Receivable' : 'পাবো'}
            </span>
            <span className="text-base font-bold text-emerald-500 block truncate">
              {totalReceivable > 0 ? (
                formatCurrency(totalReceivable, settings.useBanglaNumerals && !isEn)
              ) : (
                settings.useBanglaNumerals && !isEn ? '০' : '0'
              )}
            </span>
          </div>

          {/* Payable */}
          <div
            onClick={() => setFilterType(filterType === 'give' ? 'all' : 'give')}
            className={`text-center cursor-pointer p-1.5 rounded-xl transition-all ${
              filterType === 'give'
                ? 'bg-rose-50 dark:bg-rose-950/40 ring-1 ring-rose-400'
                : ''
            }`}
          >
            <span className="text-xs font-semibold text-rose-500 block mb-0.5">
              {isEn ? 'Payable' : 'দিবো'}
            </span>
            <span className="text-base font-bold text-rose-500 block truncate">
              {totalPayable > 0 ? (
                formatCurrency(totalPayable, settings.useBanglaNumerals && !isEn)
              ) : (
                settings.useBanglaNumerals && !isEn ? '০' : '0'
              )}
            </span>
          </div>

          {/* Total Persons */}
          <div
            onClick={() => setFilterType('all')}
            className={`rounded-xl py-2 px-3 text-center cursor-pointer transition-all ${
              filterType === 'all'
                ? 'bg-[#e4efff] dark:bg-blue-950/60 ring-1 ring-blue-400'
                : 'bg-slate-50 dark:bg-slate-800/60'
            }`}
          >
            <span className="text-xs font-semibold text-[#1a73e8] dark:text-blue-400 block mb-0.5">
              {isEn ? 'Total' : 'মোট'}
            </span>
            <span className="text-base font-bold text-[#1a73e8] dark:text-blue-400 block truncate">
              {settings.useBanglaNumerals && !isEn ? toBanglaNumber(totalPersonsCount) : totalPersonsCount}{' '}
              {isEn ? 'Persons' : 'জন'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Action Bar */}
      <div className="flex items-center justify-between px-1 relative">
        <button
          onClick={openAddModal}
          className="border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50/20 hover:bg-blue-50/80 rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          <span className="text-sm leading-none font-bold">+</span>
          <span>{isEn ? 'Add Person' : 'নতুন ব্যক্তি'}</span>
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

          <button
            onClick={() => setShowMenu((m) => !m)}
            className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            title={isEn ? 'Menu' : 'মেনু'}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-1 top-10 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 w-52 text-xs font-semibold animate-in fade-in">
            <button
              onClick={handleDownloadReport}
              className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-slate-700 dark:text-slate-200"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>{isEn ? 'Download CSV Report' : 'রিপোর্ট ডাউনলোড (CSV)'}</span>
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                setActiveTab('reports');
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-blue-600 dark:text-blue-400"
            >
              <FileText className="w-4 h-4" />
              <span>{isEn ? 'Full Statement' : 'পূর্ণাঙ্গ স্টেটমেন্ট'}</span>
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                setActiveTab('trash');
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-rose-600 dark:text-rose-400"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isEn ? 'Trash Bin' : 'ট্র্যাশ'}</span>
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
            placeholder={isEn ? 'Search person by name or phone...' : 'নাম বা ফোন নম্বর দিয়ে খুঁজুন...'}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            autoFocus
          />
        </div>
      )}

      {/* 3. Empty State */}
      {filteredPersons.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="relative text-slate-300 dark:text-slate-600 mb-3">
            <svg
              className="w-20 h-20"
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 8L4 16v24h40V16L36 8H12z" />
              <path d="M4 16h40" />
              <path d="M20 22h8" />
            </svg>
            <RotateCw className="w-4 h-4 absolute bottom-0 right-2 text-slate-400" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {isEn ? 'No person records found' : 'কোন ব্যক্তি নেই'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPersons.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-blue-200 dark:hover:border-slate-700 transition-colors"
            >
              <div
                onClick={() => openEditModal(p)}
                className="flex items-center gap-3 flex-1 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs">
                  {p.photoUrl ? (
                    <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    p.name.charAt(0)
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <span>{p.name}</span>
                    {p.notes && (
                      <span className="text-[9px] text-slate-400 font-normal truncate max-w-[120px]">
                        ({p.notes})
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {p.phoneNumber || p.address || p.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold mr-1 ${
                    p.type === 'receive' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {p.type === 'receive' ? '↓' : '↑'}{' '}
                  {formatCurrency(p.amount, settings.useBanglaNumerals && !isEn)}
                </span>

                {/* Quick WhatsApp Link Button */}
                {p.phoneNumber && (
                  <a
                    href={`https://wa.me/${(() => {
                      const clean = p.phoneNumber.replace(/[^0-9]/g, '');
                      if (clean.startsWith('880')) return clean;
                      if (clean.startsWith('0')) return '88' + clean;
                      return clean;
                    })()}?text=${encodeURIComponent(
                      p.type === 'receive'
                        ? `আসসালামু আলাইকুম ${p.name}, আশা করি ভালো আছেন। হিসাব অনুযায়ী আপনার কাছে ${formatCurrency(
                            p.amount,
                            settings.useBanglaNumerals
                          )} বাকি রয়েছে। সুবিধাজনক সময়ে পরিশোধ করলে খুব উপকৃত হব। ধন্যবাদ - ${
                            settings.userName || 'আয় ব্যয়'
                          }`
                        : `আসসালামু আলাইকুম ${p.name}, হিসাব অনুযায়ী আপনার পাওনা ${formatCurrency(
                            p.amount,
                            settings.useBanglaNumerals
                          )} খুব শীঘ্রই পরিশোধ করার চেষ্টা করছি। ধন্যবাদ - ${
                            settings.userName || 'আয় ব্যয়'
                          }`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors"
                    title={isEn ? 'Direct WhatsApp' : 'সরাসরি হোয়াটসঅ্যাপ'}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                {/* Reminder button */}
                <button
                  onClick={() => {
                    setReminderPerson(p);
                    setReminderTone('polite');
                    setCustomReminderMsg('');
                    setCopiedReminder(false);
                  }}
                  className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                  title={isEn ? 'Customize & Send Reminder' : 'তাগাদা বার্তা সাজিয়ে পাঠান'}
                >
                  <MessageCircle className="w-4 h-4" />
                </button>

                <button
                  onClick={() => deletePerson(p.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                  title={isEn ? 'Delete Record' : 'মুছে ফেলুন'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Reminder SMS / WhatsApp Modal */}
      {reminderPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white">
                    {isEn ? 'Payment Reminder Message' : 'বাকির তাগাদা বার্তা'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {reminderPerson.name} {reminderPerson.phoneNumber ? `(${reminderPerson.phoneNumber})` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReminderPerson(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tone Selector Pills */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isEn ? 'Select Message Tone' : 'বার্তার ধরণ / টোন:'}
              </span>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setReminderTone('polite');
                    setCustomReminderMsg('');
                  }}
                  className={`py-1.5 rounded-lg text-center transition-all ${
                    reminderTone === 'polite'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {isEn ? '🌸 Polite' : '🌸 বিনম্র'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReminderTone('standard');
                    setCustomReminderMsg('');
                  }}
                  className={`py-1.5 rounded-lg text-center transition-all ${
                    reminderTone === 'standard'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {isEn ? '⚡ Standard' : '⚡ সাধারণ'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReminderTone('urgent');
                    setCustomReminderMsg('');
                  }}
                  className={`py-1.5 rounded-lg text-center transition-all ${
                    reminderTone === 'urgent'
                      ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {isEn ? '🚨 Urgent' : '🚨 জরুরি'}
                </button>
              </div>
            </div>

            {/* Generated / Editable Reminder Text */}
            {(() => {
              const defaultMsg = (() => {
                const amountFormatted = formatCurrency(reminderPerson.amount, settings.useBanglaNumerals && !isEn);
                const userTitle = settings.userName || (isEn ? 'Ay-Byay' : 'আয় ব্যয়');
                if (isEn) {
                  if (reminderPerson.type === 'give') {
                    return `Dear ${reminderPerson.name}, regarding our transaction of ${amountFormatted}, I will settle this payment very soon. Thank you - ${userTitle}`;
                  }
                  if (reminderTone === 'urgent') {
                    return `Dear ${reminderPerson.name}, this is an urgent reminder that ${amountFormatted} is due. Please settle this immediately as I have an urgent financial requirement. Thank you - ${userTitle}`;
                  }
                  if (reminderTone === 'standard') {
                    return `Dear ${reminderPerson.name}, friendly reminder that ${amountFormatted} is due for payment. Please settle when possible. Thank you - ${userTitle}`;
                  }
                  return `Dear ${reminderPerson.name}, hope you are doing well. Just a gentle reminder that ${amountFormatted} is currently due. Please settle at your convenience. Thank you - ${userTitle}`;
                } else {
                  if (reminderPerson.type === 'give') {
                    return `আসসালামু আলাইকুম ${reminderPerson.name}, হিসাব অনুযায়ী আপনার পাওনা ${amountFormatted} আমি খুব শীঘ্রই পরিশোধ করার চেষ্টা করছি। ধন্যবাদ - ${userTitle}`;
                  }
                  if (reminderTone === 'urgent') {
                    return `আসসালামু আলাইকুম ${reminderPerson.name}, হিসাব অনুযায়ী বাকি ${amountFormatted} আমার এই মুহূর্তে বিশেষ প্রয়োজনে অতি জরুরি। দয়া করে আজই পরিশোধের ব্যবস্থা করবেন। ধন্যবাদ - ${userTitle}`;
                  }
                  if (reminderTone === 'standard') {
                    return `আসসালামু আলাইকুম ${reminderPerson.name}, মনে করিয়ে দেওয়ার জন্য বার্তা: হিসাব অনুযায়ী আপনার কাছে ${amountFormatted} বাকি রয়েছে। সুযোগ পেলে পরিশোধ করে দেওয়ার অনুরোধ রইল। ধন্যবাদ - ${userTitle}`;
                  }
                  return `আসসালামু আলাইকুম ${reminderPerson.name}, আশা করি ভালো আছেন। হিসাব অনুযায়ী আপনার কাছে ${amountFormatted} বাকি রয়েছে। সুবিধাজনক সময়ে পরিশোধ করলে খুব উপকৃত হব। ধন্যবাদ - ${userTitle}`;
                }
              })();

              const activeMessage = customReminderMsg || defaultMsg;

              const cleanPhone = reminderPerson.phoneNumber
                ? reminderPerson.phoneNumber.replace(/[^0-9]/g, '')
                : '';
              const waPhone = cleanPhone
                ? cleanPhone.startsWith('880')
                  ? cleanPhone
                  : cleanPhone.startsWith('0')
                  ? '88' + cleanPhone
                  : cleanPhone
                : '';
              const waUrl = waPhone
                ? `https://wa.me/${waPhone}?text=${encodeURIComponent(activeMessage)}`
                : `https://wa.me/?text=${encodeURIComponent(activeMessage)}`;
              const smsUrl = cleanPhone
                ? `sms:${cleanPhone}?body=${encodeURIComponent(activeMessage)}`
                : `sms:?body=${encodeURIComponent(activeMessage)}`;

              return (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400">
                      {isEn ? 'Message preview (you can edit):' : 'বার্তা প্রিভিউ (চাইলে সম্পাদন করতে পারেন):'}
                    </label>
                    <textarea
                      rows={4}
                      value={activeMessage}
                      onChange={(e) => setCustomReminderMsg(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Actions Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(activeMessage);
                        setCopiedReminder(true);
                        setTimeout(() => setCopiedReminder(false), 2000);
                      }}
                      className="py-2.5 px-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1 transition-colors"
                    >
                      {copiedReminder ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500 text-[11px]">{isEn ? 'Copied' : 'কপি হয়েছে'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-[11px]">{isEn ? 'Copy' : 'কপি'}</span>
                        </>
                      )}
                    </button>

                    {/* Direct SMS Button */}
                    <a
                      href={smsUrl}
                      className="py-2.5 px-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-100 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{isEn ? 'SMS' : 'সরাসরি SMS'}</span>
                    </a>

                    {/* WhatsApp Button */}
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="text-[11px]">WhatsApp</span>
                    </a>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsAddPersonOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#1877f2] hover:bg-blue-600 active:scale-95 text-white shadow-xl shadow-blue-500/30 flex items-center justify-center transition-all focus:outline-none"
        title={isEn ? 'Add Person' : 'নতুন ব্যক্তি যোগ করুন'}
        aria-label="Add person"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>
    </div>
  );
};
