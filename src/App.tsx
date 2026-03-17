import React, { useState, useEffect, useMemo } from 'react';
import { auth, db, signInWithGoogle, logout, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, addDoc, updateDoc, Timestamp, getDocFromCache } from 'firebase/firestore';
import { Transaction, UserProfile, Account } from './types';
import TransactionForm from './components/TransactionForm';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import TransactionList from './components/TransactionList';
import ProfileSettings from './components/ProfileSettings';
import SecurityLogs from './components/SecurityLogs';
import Wishlist from './components/Wishlist';
import Debts from './components/Debts';
import Settings from './components/Settings';
import { LayoutDashboard, Calendar, List, Plus, LogOut, Wallet, ChevronDown, User as UserIcon, Heart, Settings as SettingsIcon, Eye, EyeOff, Menu, X, QrCode, HandCoins, Building2, Edit2, Check, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type View = 'dashboard' | 'calendar' | 'list' | 'wishlist' | 'debts' | 'settings';

const BANK_LOGOS: Record<string, string> = {
  'SBI': 'https://www.sbi.co.in/o/sbi-theme/images/favicon.ico',
  'HDFC': 'https://www.hdfcbank.com/content/api/contentstream-id/723fb80a-2dde-42a3-9793-7ae1be57c87f/6966627d-7806-4767-932d-209930740922?',
  'ICICI': 'https://www.icicibank.com/content/dam/icicibank/india/assets/images/favicon.ico',
  'Axis': 'https://www.axisbank.com/assets/images/favicon.ico',
  'Kotak': 'https://www.kotak.com/content/dam/Kotak/favicon.ico',
  'Others': ''
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState<{ show: boolean, account?: Account }>({ show: false });

  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('Others');
  const [upiId, setUpiId] = useState('');
  const [isMain, setIsMain] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch profile
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
            const profileData = profileDoc.data() as UserProfile;
            setProfile(profileData);
            if (profileData.securityPin) setIsLocked(true);
          } else {
            setProfile(null);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
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
      const accs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() })) as Account[];
      
      // Filter out any residual cash accounts
      const filteredAccs = accs.filter(acc => acc.type !== 'cash');
      
      // Select main account or first account if none selected
      if (!selectedAccountId && filteredAccs.length > 0) {
        const mainAcc = filteredAccs.find(a => a.isMain) || filteredAccs[0];
        setSelectedAccountId(mainAcc.id);
      }

      setAccounts(filteredAccs);
      if (filteredAccs.length > 0 && !selectedAccountId) {
        const mainAcc = filteredAccs.find(a => a.isMain) || filteredAccs[0];
        setSelectedAccountId(mainAcc.id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'accounts');
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) {
      setAllTransactions([]);
      return;
    }

    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setAllTransactions(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return unsubscribe;
  }, [user]);

  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    accounts.forEach(acc => {
      balances[acc.id] = 0;
    });

    allTransactions.forEach(t => {
      if (balances[t.accountId] !== undefined) {
        if (t.type === 'income') {
          balances[t.accountId] += t.amount;
        } else if (t.type === 'expense') {
          balances[t.accountId] -= t.amount;
        }
      }
    });
    return balances;
  }, [accounts, allTransactions]);

  const transactions = useMemo(() => {
    if (selectedAccountId === 'all') return allTransactions;
    return allTransactions.filter(t => t.accountId === selectedAccountId);
  }, [allTransactions, selectedAccountId]);

  const selectedAccount = useMemo(() => {
    if (selectedAccountId === 'all') {
      const totalBalance = Object.values(accountBalances).reduce((a, b) => a + b, 0);
      return { id: 'all', name: 'All Accounts', balance: totalBalance, isMain: false, uid: '' } as Account;
    }
    return accounts.find(acc => acc.id === selectedAccountId);
  }, [accounts, selectedAccountId, accountBalances]);

  const totalAccountBalance = accounts.reduce((acc, a) => acc + (accountBalances[a.id] || 0), 0);

  const [showQrModal, setShowQrModal] = useState<{ show: boolean, upiId: string, name: string }>({ show: false, upiId: '', name: '' });

  const handleAccountAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setAccountLoading(true);
    try {
      const accountData = {
        name: accountName,
        bankName,
        upiId: upiId || null,
        isMain,
        logo: '', // Always empty, use Wallet icon
        uid: user.uid,
        updatedAt: Timestamp.now()
      };

      if (showAccountModal.account) {
        // Update existing
        try {
          await updateDoc(doc(db, 'accounts', showAccountModal.account.id), accountData);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `accounts/${showAccountModal.account.id}`);
        }
      } else {
        // Create new
        try {
          await addDoc(collection(db, 'accounts'), {
            ...accountData,
            balance: 0,
            type: 'bank',
            createdAt: Timestamp.now()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'accounts');
        }
      }

      // If this is set as main, unset others
      if (isMain) {
        const otherMainAccounts = accounts.filter(a => a.isMain && a.id !== showAccountModal.account?.id);
        for (const acc of otherMainAccounts) {
          try {
            await updateDoc(doc(db, 'accounts', acc.id), { isMain: false });
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `accounts/${acc.id}`);
          }
        }
      }

      setShowAccountModal({ show: false });
      setAccountName('');
      setBankName('Others');
      setUpiId('');
      setIsMain(false);
    } catch (error) {
      console.error('Error saving account:', error);
    } finally {
      setAccountLoading(false);
    }
  };

  const openAccountModal = (account?: Account) => {
    if (account) {
      setAccountName(account.name);
      setBankName(account.bankName || 'Others');
      setUpiId(account.upiId || '');
      setIsMain(account.isMain || false);
    } else {
      setAccountName('');
      setBankName('Others');
      setUpiId('');
      setIsMain(false);
    }
    setShowAccountModal({ show: true, account });
    setShowAccountMenu(false);
  };

  useEffect(() => {
    const handleViewChange = (e: any) => {
      setCurrentView(e.detail);
    };
    window.addEventListener('changeView', handleViewChange);
    return () => window.removeEventListener('changeView', handleViewChange);
  }, []);

  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      setLoginError(error.message || 'Login failed. Please check your Firebase configuration.');
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
          
          {loginError && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-medium">
              {loginError}
              <div className="mt-2 text-[10px] uppercase tracking-widest opacity-70">
                Tip: Ensure your preview URL is allowlisted in Firebase Console.
              </div>
            </div>
          )}

          <button
            onClick={handleLogin}
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
    return <ProfileSettings user={user} onComplete={() => window.location.reload()} />;
  }

  if (isLocked && profile.securityPin) {
    return (
      <SecurityLogs 
        correctPin={profile.securityPin} 
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
          <div className="flex flex-col">
            <span className="text-lg font-black text-brand-dark tracking-tight leading-none">My Damages</span>
            <button 
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex items-center gap-1 text-[10px] font-bold text-brand-primary uppercase tracking-widest mt-1"
            >
              {selectedAccount?.name}
              <ChevronDown className={`w-2 h-2 transition-transform ${showAccountMenu ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-brand-bg rounded-xl transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6 text-brand-dark" /> : <Menu className="w-6 h-6 text-brand-dark" />}
          </button>
        </div>

        {/* Mobile Account Menu */}
        <AnimatePresence>
          {showAccountMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-4 right-4 mt-2 bg-white rounded-2xl shadow-2xl border border-black/5 p-2 z-[60] lg:hidden"
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
            </motion.div>
          )}
        </AnimatePresence>
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
                  <button
                    onClick={() => {
                      setSelectedAccountId('all');
                      setShowAccountMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all mb-1 ${
                      selectedAccountId === 'all' ? 'bg-brand-primary text-white' : 'hover:bg-brand-bg text-brand-dark'
                    }`}
                  >
                    <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-brand-primary" />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-bold block">All Accounts</span>
                      <span className="text-[8px] uppercase tracking-widest opacity-60">Combined View</span>
                    </div>
                  </button>
                  {accounts.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between w-full group/item">
                      <button
                        onClick={() => {
                          setSelectedAccountId(acc.id);
                          setShowAccountMenu(false);
                        }}
                        className={`flex-1 flex items-center gap-3 p-3 rounded-xl transition-all ${
                          selectedAccountId === acc.id ? 'bg-brand-primary text-white' : 'hover:bg-brand-bg text-brand-dark'
                        }`}
                      >
                        <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                          <Wallet className="w-4 h-4 text-brand-primary" />
                        </div>
                        <div className="text-left">
                          <span className="text-sm font-bold block">{acc.name}</span>
                          {acc.isMain && <span className="text-[8px] uppercase tracking-widest opacity-60">Main Account</span>}
                        </div>
                      </button>
                      <button
                        onClick={() => openAccountModal(acc)}
                        className="p-2 opacity-0 group-hover/item:opacity-100 hover:bg-brand-bg rounded-lg transition-all"
                      >
                        <Edit2 className="w-3 h-3 text-brand-dark/40" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => openAccountModal()}
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
          
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all mt-auto"
          >
            <LogOut className="w-6 h-6" />
            <span className="font-bold">Sign Out</span>
          </button>
        </nav>

        <div className="p-6 border-t border-black/5">
          {/* Separate Balance Display */}
          <div className="mb-6 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-brand-dark/40">
              <div className="flex items-center gap-2">
                <span>Total Balance</span>
                <button onClick={() => setShowBalance(!showBalance)} className="p-1 hover:bg-brand-bg rounded-md transition-colors">
                  {showBalance ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
              <span className="text-brand-dark">{showBalance ? `₹${totalAccountBalance.toLocaleString()}` : '••••••'}</span>
            </div>
          </div>

          <button
            onClick={() => {
              const upi = selectedAccount?.upiId || profile?.upiId;
              if (upi) {
                setShowQrModal({ 
                  show: true, 
                  upiId: upi, 
                  name: selectedAccount?.upiId ? selectedAccount.name : profile?.displayName || 'User' 
                });
              } else {
                setCurrentView('settings');
              }
              setIsMobileMenuOpen(false);
            }}
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
            {(profile.upiId || selectedAccount?.upiId) && (
              <div className="p-2 bg-brand-primary/10 rounded-lg">
                <QrCode className="w-4 h-4 text-brand-primary" />
              </div>
            )}
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
              {currentView === 'debts' && 'People Owe Me'}
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
            {currentView === 'dashboard' && <Dashboard transactions={transactions} showBalance={showBalance} setShowBalance={setShowBalance} />}
            {currentView === 'calendar' && <CalendarView transactions={transactions} accounts={accounts} />}
            {currentView === 'list' && <TransactionList transactions={transactions} />}
            {currentView === 'wishlist' && <Wishlist />}
            {currentView === 'debts' && <Debts />}
            {currentView === 'settings' && <Settings />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-brand-dark/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg"
            >
              <TransactionForm 
                accounts={accounts} 
                selectedAccountId={selectedAccountId === 'all' ? (accounts.find(a => a.isMain)?.id || accounts[0]?.id || '') : selectedAccountId} 
                onClose={() => setShowAddModal(false)} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* Account Modal */}
      <AnimatePresence>
        {showAccountModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAccountModal({ show: false })}
              className="absolute inset-0 bg-brand-dark/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl border border-black/5"
            >
              <h3 className="text-2xl font-black text-brand-dark mb-6 tracking-tight">
                {showAccountModal.account ? 'Edit Account' : 'New Account'}
              </h3>
              <form onSubmit={handleAccountAction} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Account Name</label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. Savings Account"
                    className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Bank Name</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                  >
                    {Object.keys(BANK_LOGOS).map(bank => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">UPI ID (Optional)</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                  />
                </div>
                <div className="flex items-center gap-3 p-4 bg-brand-bg/30 rounded-2xl">
                  <input
                    type="checkbox"
                    id="isMain"
                    checked={isMain}
                    onChange={(e) => setIsMain(e.target.checked)}
                    className="w-5 h-5 accent-brand-primary"
                  />
                  <label htmlFor="isMain" className="text-sm font-bold text-brand-dark">Set as Main Account</label>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAccountModal({ show: false })}
                    className="flex-1 py-4 px-6 rounded-2xl font-black text-brand-dark/60 hover:bg-brand-bg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={accountLoading}
                    className="flex-1 py-4 px-6 rounded-2xl font-black bg-brand-primary text-white hover:bg-brand-dark shadow-lg shadow-brand-primary/20 transition-all disabled:opacity-50"
                  >
                    {accountLoading ? 'Saving...' : 'Save Account'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQrModal.show && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQrModal({ ...showQrModal, show: false })}
              className="absolute inset-0 bg-brand-dark/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl border border-black/5 text-center"
            >
              <button 
                onClick={() => setShowQrModal({ ...showQrModal, show: false })}
                className="absolute top-6 right-6 p-2 hover:bg-brand-bg rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-brand-dark/40" />
              </button>
              
              <div className="mb-6">
                <div className="w-20 h-20 bg-brand-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-10 h-10 text-brand-primary" />
                </div>
                <h3 className="text-2xl font-black text-brand-dark tracking-tight">UPI QR Code</h3>
                <p className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">{showQrModal.name}</p>
              </div>

              <div className="bg-brand-bg/50 p-6 rounded-[2rem] border-2 border-dashed border-brand-accent/20 mb-6">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${showQrModal.upiId}&pn=${showQrModal.name}`)}`}
                  alt="UPI QR Code"
                  referrerPolicy="no-referrer"
                  className="w-full aspect-square rounded-xl shadow-inner"
                />
              </div>

              <div className="bg-brand-bg p-4 rounded-2xl mb-6">
                <p className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-widest mb-1 text-left">UPI ID</p>
                <p className="text-sm font-black text-brand-dark text-left break-all">{showQrModal.upiId}</p>
              </div>

              <button
                onClick={() => setShowQrModal({ ...showQrModal, show: false })}
                className="w-full py-4 bg-brand-primary text-white rounded-2xl font-black hover:bg-brand-dark transition-all shadow-lg shadow-brand-primary/20"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
