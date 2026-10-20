/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { TopIconNav } from './components/TopIconNav';
import { Dashboard } from './components/Dashboard';
import { PersonsView } from './components/PersonsView';
import { BudgetView } from './components/BudgetView';
import { SavingsView } from './components/SavingsView';
import { TasksView } from './components/TasksView';
import { ProfileMenuView } from './components/ProfileMenuView';
import { CategoriesScreen } from './components/CategoriesScreen';
import { TrashScreen } from './components/TrashScreen';
import { SettingsView } from './components/SettingsView';
import { AddTransactionScreen } from './components/AddTransactionScreen';
import { GraphViewScreen } from './components/GraphViewScreen';
import { QuickEntryScreen } from './components/QuickEntryScreen';
import { RecurringScreen } from './components/RecurringScreen';
import { NotificationsModal } from './components/NotificationsModal';
import { ProfileModal } from './components/ProfileModal';
import { FirebaseModal } from './components/FirebaseModal';

import { ReportsView } from './components/ReportsView';
import { NotesScreen } from './components/NotesScreen';
import { PinLockScreen } from './components/PinLockScreen';
import { MessSplitterScreen } from './components/MessSplitterScreen';
import { SmartSmsParserScreen } from './components/SmartSmsParserScreen';
import { CalendarHeatmapScreen } from './components/CalendarHeatmapScreen';
import { FinancialHealthScoreScreen } from './components/FinancialHealthScoreScreen';
import { BanglaVoiceModal } from './components/BanglaVoiceModal';

import { motion, AnimatePresence } from 'motion/react';

const MainContent: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <main className="flex-1 px-4 py-2 overflow-y-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="w-full"
        >
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'persons' && <PersonsView />}
          {activeTab === 'budget' && <BudgetView />}
          {activeTab === 'savings' && <SavingsView />}
          {activeTab === 'tasks' && <TasksView />}
          {activeTab === 'profile_menu' && <ProfileMenuView />}
          {activeTab === 'categories' && <CategoriesScreen />}
          {activeTab === 'trash' && <TrashScreen />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'graph_view' && <GraphViewScreen />}
          {activeTab === 'quick_entry' && <QuickEntryScreen />}
          {activeTab === 'recurring' && <RecurringScreen />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'notes' && <NotesScreen />}
          {activeTab === 'mess' && <MessSplitterScreen />}
          {activeTab === 'sms_parse' && <SmartSmsParserScreen />}
          {activeTab === 'calendar_heatmap' && <CalendarHeatmapScreen />}
          {activeTab === 'health_score' && <FinancialHealthScoreScreen />}
          {activeTab === 'add_transaction' && <AddTransactionScreen />}
        </motion.div>
      </AnimatePresence>
    </main>
  );
};

const AppShell: React.FC = () => {
  const { settings, isAppUnlocked, isVoiceModalOpen, setIsVoiceModalOpen } = useApp();

  if (settings.isPinEnabled && !isAppUnlocked) {
    return <PinLockScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex justify-center text-slate-800 dark:text-slate-100 antialiased selection:bg-blue-500 selection:text-white">
      {/* Exact Mobile App Viewport matching reference video */}
      <div className="w-full max-w-md bg-[#fafbff] dark:bg-slate-900 min-h-screen shadow-xl relative border-x border-slate-200/50 dark:border-slate-800 flex flex-col">
        {/* Top Header: ⚡ আয় ব্যয় + Bell (1) + Moon + Gear */}
        <Header />

        {/* Top Horizontal Icon Navigation Bar: [ ⇄ ] [ ⇅ ] [ 📈 ] [ ⊞ ] [ 📋 ] ( S ) */}
        <TopIconNav />

        {/* Screen Content View */}
        <MainContent />

        {/* Global Dialogs */}
        <NotificationsModal />
        <ProfileModal />
        <FirebaseModal />
        <BanglaVoiceModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
