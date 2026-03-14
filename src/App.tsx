import React, { useState, useEffect } from 'react';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, addDoc, Timestamp } from 'firebase/firestore';
import { Transaction, UserProfile, Account } from './types';
import TransactionForm from './components/TransactionForm';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import TransactionList from './components/TransactionList';
import ProfileSetup from './components/ProfileSetup';
import SecurityLock from './components/SecurityLock';
import Wishlist from './components/Wishlist';
import Settings from './components/Settings';
import { LayoutDashboard, Calendar, List, Plus, LogOut, Wallet, ChevronDown, User as UserIcon, Heart, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type View = 'dashboard' | 'calendar' | 'list' | 'wishlist' | 'settings';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentView, setCurrentView] = useState<View>('calendar');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch profile
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          const profileData = profileDoc.data() as UserProfile;
          setProfile(profileData);
          if (profileData.securityPin) setIsLocked(true);
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
        setIsLocked(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'accounts'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const accs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Account[];
      
      // Ensure a Cash account exists
      const hasCashAccount = accs.some(acc => acc.name.toLowerCase() === 'cash');
      if (!hasCashAccount && accs.length > 0) {
        try {
          await addDoc(collection(db, 'accounts'), {
            name: 'Cash',
            balance: 0,
            uid: user.uid,
            createdAt: Timestamp.now()
          });
        } catch (error) {
          console.error('Error creating cash account:', error);
        }
      }

      setAccounts(accs);
      if (accs.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accs[0].id);
      }
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user || !selectedAccountId) {
      setTransactions([]);
      return;
    }

    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid),
      where('accountId', '==', selectedAccountId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(docs);
    });

    return unsubscribe;
  }, [user, selectedAccountId]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const cashAccount = accounts.find(a => a.name.toLowerCase() === 'cash');
  const otherAccounts = accounts.filter(a => a.name.toLowerCase() !== 'cash');
  const totalAccountBalance = otherAccounts.reduce((acc, a) => acc + (a.balance || 0), 0);
  const cashBalance = cashAccount?.balance || 0;

  const handleAddAccount = async () => {
    if (!user) return;
    const name = prompt('Enter account name:');
    if (!name) return;
    try {
      await addDoc(collection(db, 'accounts'), {
        name,
        balance: 0,
        uid: user.uid,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error adding account:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 rounded-[2rem] shadow-2xl border border-black/5 text-center"
        >
          <div className="w-20 h-20 bg-brand-primary rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-brand-primary/20">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-brand-dark mb-3 tracking-tight">My Damages</h1>
          <p className="text-zinc-500 mb-10 text-lg leading-relaxed">Master your wealth, visualize your spending, and budget like a pro.</p>
          <button
            onClick={signInWithGoogle}
            className="w-full py-5 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-dark transition-all flex items-center justify-center gap-4 shadow-xl shadow-brand-primary/20 active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" />
            Continue with Google
          </button>
        </motion.div>
      </div>
    );
  }

  if (!profile || !profile.setupComplete) {
    return <ProfileSetup user={user} onComplete={() => window.location.reload()} />;
  }

  if (isLocked && profile.securityPin) {
    return (
      <SecurityLock 
        correctPin={profile.securityPin} 
        useBiometrics={!!profile.useBiometrics} 
        onUnlock={() => setIsLocked(false)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-black/5 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black text-brand-dark tracking-tight">My Damages</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-brand-bg rounded-xl transition-colors"
        >
          <List className="w-6 h-6 text-brand-dark" />
        </button>
      </header>

      {/* Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-brand-dark/40 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-black/5 flex flex-col shadow-xl transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 hidden lg:flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-black text-brand-dark tracking-tight">My Damages</span>
        </div>

        {/* Account Switcher */}
        <div className="px-6 mb-8">
          <div className="relative">
            <button
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="w-full flex items-center justify-between p-4 bg-brand-bg/50 rounded-2xl border border-brand-accent/20 hover:border-brand-primary transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-brand-primary" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-brand-dark/50 uppercase tracking-widest">Active Account</p>
                  <p className="text-sm font-bold text-brand-dark truncate max-w-[120px]">
                    {selectedAccount?.name || 'Select Account'}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-brand-dark/50 transition-transform ${showAccountMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showAccountMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-black/5 p-2 z-50 overflow-hidden"
                >
                  {accounts.map(acc => (
                    <button
                      key={acc.id}
                      onClick={() => {
                        setSelectedAccountId(acc.id);
                        setShowAccountMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        selectedAccountId === acc.id ? 'bg-brand-primary text-white' : 'hover:bg-brand-bg text-brand-dark'
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                      <span className="text-sm font-bold">{acc.name}</span>
                    </button>
                  ))}
                  <button
                    onClick={handleAddAccount}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-brand-primary hover:bg-brand-primary/5 transition-all mt-1 border-t border-black/5 pt-3"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-bold">Add Account</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-3">
          <button
            onClick={() => { setCurrentView('calendar'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
              currentView === 'calendar' ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/20' : 'text-brand-dark/50 hover:bg-brand-bg hover:text-brand-dark'
            }`}
          >
            <Calendar className="w-6 h-6" />
            <span className="font-bold">Calendar</span>
          </button>
          <button
            onClick={() => { setCurrentView('dashboard'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
              currentView === 'dashboard' ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/20' : 'text-brand-dark/50 hover:bg-brand-bg hover:text-brand-dark'
            }`}
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="font-bold">Dashboard</span>
          </button>
          <button
            onClick={() => { setCurrentView('list'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
              currentView === 'list' ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/20' : 'text-brand-dark/50 hover:bg-brand-bg hover:text-brand-dark'
            }`}
          >
            <List className="w-6 h-6" />
            <span className="font-bold">Transactions</span>
          </button>
          <button
            onClick={() => { setCurrentView('wishlist'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
              currentView === 'wishlist' ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/20' : 'text-brand-dark/50 hover:bg-brand-bg hover:text-brand-dark'
            }`}
          >
            <Heart className="w-6 h-6" />
            <span className="font-bold">Wishlist</span>
          </button>
          <button
            onClick={() => { setCurrentView('settings'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
              currentView === 'settings' ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/20' : 'text-brand-dark/50 hover:bg-brand-bg hover:text-brand-dark'
            }`}
          >
            <SettingsIcon className="w-6 h-6" />
            <span className="font-bold">Settings</span>
          </button>
        </nav>

        <div className="p-6 border-t border-black/5">
          {/* Separate Balance Display */}
          <div className="mb-6 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-brand-dark/40">
              <span>Cash</span>
              <span className="text-brand-dark">${cashBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-brand-dark/40">
              <span>Accounts</span>
              <span className="text-brand-dark">${totalAccountBalance.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={() => { setCurrentView('settings'); setIsMobileMenuOpen(false); }}
            className="w-full flex items-center gap-4 p-4 bg-brand-bg/30 rounded-2xl mb-4 hover:bg-brand-bg/50 transition-all text-left"
          >
            {profile.photoURL ? (
              <img src={profile.photoURL} className="w-10 h-10 rounded-xl border border-brand-accent/20" alt={profile.displayName} />
            ) : (
              <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-brand-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-brand-dark truncate">{profile.displayName}</p>
              <p className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-widest">Active Profile</p>
            </div>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-4 px-5 py-4 text-rose-600 hover:bg-rose-50 rounded-2xl transition-all font-bold"
          >
            <LogOut className="w-6 h-6" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-12 pb-24 lg:pb-12">
        <header className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 mb-12">
          <div>
            <p className="text-brand-primary font-bold text-sm uppercase tracking-[0.2em] mb-2">
              {selectedAccount?.name || 'Overview'}
            </p>
            <h2 className="text-3xl lg:text-4xl font-black text-brand-dark tracking-tight">
              {currentView === 'dashboard' && 'Financial Overview'}
              {currentView === 'calendar' && 'Spending Calendar'}
              {currentView === 'list' && 'Transaction History'}
              {currentView === 'wishlist' && 'My Wishlist'}
              {currentView === 'settings' && 'App Settings'}
            </h2>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-dark transition-all shadow-xl shadow-brand-primary/20 active:scale-95"
          >
            <Plus className="w-6 h-6" />
            Add Transaction
          </button>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {currentView === 'dashboard' && <Dashboard transactions={transactions} />}
            {currentView === 'calendar' && <CalendarView transactions={transactions} />}
            {currentView === 'list' && <TransactionList transactions={transactions} />}
            {currentView === 'wishlist' && <Wishlist />}
            {currentView === 'settings' && <Settings />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-black/5 p-4 flex items-center justify-around z-40">
        <button onClick={() => setCurrentView('calendar')} className={`p-2 rounded-xl ${currentView === 'calendar' ? 'text-brand-primary bg-brand-primary/10' : 'text-brand-dark/40'}`}>
          <Calendar className="w-6 h-6" />
        </button>
        <button onClick={() => setCurrentView('dashboard')} className={`p-2 rounded-xl ${currentView === 'dashboard' ? 'text-brand-primary bg-brand-primary/10' : 'text-brand-dark/40'}`}>
          <LayoutDashboard className="w-6 h-6" />
        </button>
        <button onClick={() => setShowAddModal(true)} className="p-3 bg-brand-primary text-white rounded-2xl shadow-lg shadow-brand-primary/20 -mt-8">
          <Plus className="w-6 h-6" />
        </button>
        <button onClick={() => setCurrentView('list')} className={`p-2 rounded-xl ${currentView === 'list' ? 'text-brand-primary bg-brand-primary/10' : 'text-brand-dark/40'}`}>
          <List className="w-6 h-6" />
        </button>
        <button onClick={() => setCurrentView('settings')} className={`p-2 rounded-xl ${currentView === 'settings' ? 'text-brand-primary bg-brand-primary/10' : 'text-brand-dark/40'}`}>
          <SettingsIcon className="w-6 h-6" />
        </button>
      </nav>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-brand-dark/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-lg"
            >
              <TransactionForm 
                accounts={accounts} 
                selectedAccountId={selectedAccountId} 
                onClose={() => setShowAddModal(false)} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
