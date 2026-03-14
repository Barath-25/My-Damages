import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc, addDoc, deleteDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { UserProfile, MonthlyBudget, Debt } from '../types';
import SpendingHistory from './SpendingHistory';
import { User, Shield, Wallet, Save, CheckCircle, AlertCircle, History, Eye, EyeOff, Plus, Trash2, Check, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Settings() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [budget, setBudget] = useState<number>(0);
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [pin, setPin] = useState('');
  const [useBiometrics, setUseBiometrics] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'hidden'>('profile');
  
  // Debt states
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [newDebt, setNewDebt] = useState({ personName: '', amount: '', description: '' });
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [vaultPin, setVaultPin] = useState('');

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;

      // Fetch Profile
      const profileDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (profileDoc.exists()) {
        const data = profileDoc.data() as UserProfile;
        setProfile(data);
        setDisplayName(data.displayName);
        setPhotoURL(data.photoURL || '');
        setPin(data.securityPin || '');
        setUseBiometrics(data.useBiometrics || false);
      }

      // Fetch Budget
      const budgetQuery = query(
        collection(db, 'budgets'),
        where('uid', '==', auth.currentUser.uid),
        where('month', '==', currentMonth)
      );
      const budgetSnapshot = await getDocs(budgetQuery);
      if (!budgetSnapshot.empty) {
        setBudget(budgetSnapshot.docs[0].data().amount);
      }
    };

    fetchData();
  }, [currentMonth]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName,
        photoURL,
        securityPin: pin || null,
        useBiometrics
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      const budgetId = `${auth.currentUser.uid}_${currentMonth}`;
      await setDoc(doc(db, 'budgets', budgetId), {
        month: currentMonth,
        amount: budget,
        uid: auth.currentUser.uid
      });
      setMessage({ type: 'success', text: 'Monthly budget updated!' });
    } catch (error) {
      console.error('Error updating budget:', error);
      setMessage({ type: 'error', text: 'Failed to update budget.' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  useEffect(() => {
    if (!auth.currentUser || activeTab !== 'hidden') return;

    const q = query(
      collection(db, 'debts'),
      where('uid', '==', auth.currentUser.uid),
      where('isPaid', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Debt[];
      setDebts(docs);
    });

    return unsubscribe;
  }, [activeTab]);

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'debts'), {
        personName: newDebt.personName,
        amount: parseFloat(newDebt.amount),
        description: newDebt.description,
        isPaid: false,
        uid: auth.currentUser.uid,
        createdAt: Timestamp.now()
      });
      setNewDebt({ personName: '', amount: '', description: '' });
      setShowAddDebt(false);
      setMessage({ type: 'success', text: 'Debt added successfully!' });
    } catch (error) {
      console.error('Error adding debt:', error);
      setMessage({ type: 'error', text: 'Failed to add debt.' });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleMarkAsPaid = async (debtId: string) => {
    try {
      await updateDoc(doc(db, 'debts', debtId), { isPaid: true });
      setMessage({ type: 'success', text: 'Marked as paid!' });
    } catch (error) {
      console.error('Error updating debt:', error);
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteDebt = async (debtId: string) => {
    try {
      await deleteDoc(doc(db, 'debts', debtId));
      setMessage({ type: 'success', text: 'Debt deleted.' });
    } catch (error) {
      console.error('Error deleting debt:', error);
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleUnlockVault = () => {
    if (vaultPin === profile?.securityPin) {
      setIsVaultUnlocked(true);
      setVaultPin('');
    } else {
      setMessage({ type: 'error', text: 'Incorrect PIN' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-black text-brand-dark tracking-tight">Settings</h2>
        <p className="text-brand-dark/50 font-medium">Manage your profile, security, and budget</p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-brand-bg rounded-2xl w-full max-w-md">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'profile' ? 'bg-white shadow-sm text-brand-dark' : 'text-brand-dark/40 hover:text-brand-dark'
          }`}
        >
          <User className="w-4 h-4" />
          Profile
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'history' ? 'bg-white shadow-sm text-brand-dark' : 'text-brand-dark/40 hover:text-brand-dark'
          }`}
        >
          <History className="w-4 h-4" />
          History
        </button>
        <button
          onClick={() => setActiveTab('hidden')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'hidden' ? 'bg-white shadow-sm text-brand-dark' : 'text-brand-dark/40 hover:text-brand-dark'
          }`}
        >
          <Lock className="w-4 h-4" />
          Hidden
        </button>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center gap-3 font-bold ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'profile' ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* Profile Settings */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-brand-bg rounded-2xl">
                  <User className="w-6 h-6 text-brand-primary" />
                </div>
                <h3 className="text-xl font-black text-brand-dark">Profile & Security</h3>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Photo URL</label>
                  <input
                    type="url"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Security PIN (4 digits)</label>
                  <input
                    type="password"
                    maxLength={4}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all text-center text-2xl tracking-[1em]"
                    placeholder="••••"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-brand-bg/20 rounded-2xl">
                  <div>
                    <p className="text-sm font-bold text-brand-dark">Use Biometrics</p>
                    <p className="text-[10px] text-brand-dark/40 uppercase tracking-widest">Fingerprint or Face ID</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseBiometrics(!useBiometrics)}
                    className={`w-12 h-6 rounded-full transition-all relative ${useBiometrics ? 'bg-brand-primary' : 'bg-zinc-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${useBiometrics ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-dark shadow-lg shadow-brand-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </form>
            </div>

            {/* Budget Settings */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-brand-bg rounded-2xl">
                  <Wallet className="w-6 h-6 text-brand-primary" />
                </div>
                <h3 className="text-xl font-black text-brand-dark">Monthly Budget</h3>
              </div>

              <form onSubmit={handleUpdateBudget} className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-brand-dark/60 mb-4">
                    Set an allowance for <span className="font-black text-brand-dark">{currentMonth}</span>. We'll track your spending against this.
                  </p>
                  <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Monthly Allowance ($)</label>
                  <input
                    type="number"
                    required
                    value={budget}
                    onChange={(e) => setBudget(parseFloat(e.target.value))}
                    className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all text-2xl font-black"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-brand-dark text-white rounded-2xl font-bold hover:bg-brand-primary shadow-lg shadow-brand-dark/20 transition-all flex items-center justify-center gap-2"
                >
                  <Wallet className="w-5 h-5" />
                  {loading ? 'Updating...' : 'Set Budget'}
                </button>
              </form>
            </div>
          </motion.div>
        ) : activeTab === 'history' ? (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <SpendingHistory />
          </motion.div>
        ) : (
          <motion.div
            key="hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-2xl mx-auto"
          >
            {!isVaultUnlocked ? (
              <div className="bg-white p-12 rounded-[3rem] border border-black/5 shadow-2xl text-center">
                <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
                  <Lock className="w-10 h-10 text-brand-primary" />
                </div>
                <h3 className="text-2xl font-black text-brand-dark mb-2">Private Vault</h3>
                <p className="text-brand-dark/50 mb-8">Enter your security PIN to access hidden records</p>
                <div className="max-w-xs mx-auto space-y-4">
                  <input
                    type="password"
                    maxLength={4}
                    value={vaultPin}
                    onChange={(e) => setVaultPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-4 bg-brand-bg border-2 border-brand-accent/10 rounded-2xl focus:border-brand-primary outline-none text-center text-3xl tracking-[0.5em] font-black"
                    placeholder="••••"
                  />
                  <button
                    onClick={handleUnlockVault}
                    className="w-full py-4 bg-brand-primary text-white rounded-2xl font-black hover:bg-brand-dark transition-all shadow-xl shadow-brand-primary/20"
                  >
                    Unlock Vault
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-brand-dark">People Owe Me</h3>
                    <p className="text-brand-dark/50 font-medium">Track money others need to return to you</p>
                  </div>
                  <button
                    onClick={() => setShowAddDebt(true)}
                    className="p-4 bg-brand-primary text-white rounded-2xl shadow-lg shadow-brand-primary/20 hover:bg-brand-dark transition-all"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid gap-4">
                  {debts.length === 0 ? (
                    <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-brand-accent/30 text-center">
                      <p className="text-brand-dark/40 font-bold italic">No pending debts found</p>
                    </div>
                  ) : (
                    debts.map(debt => (
                      <motion.div
                        key={debt.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-brand-bg rounded-2xl flex items-center justify-center">
                            <User className="w-6 h-6 text-brand-dark/40" />
                          </div>
                          <div>
                            <p className="font-black text-brand-dark">{debt.personName}</p>
                            <p className="text-xs font-medium text-brand-dark/40">{debt.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-xl font-black text-brand-primary">${debt.amount.toLocaleString()}</p>
                            <p className="text-[10px] font-bold text-brand-dark/30 uppercase tracking-widest">Pending</p>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleMarkAsPaid(debt.id)}
                              className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                              title="Mark as Paid"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteDebt(debt.id)}
                              className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                <div className="pt-8 border-t border-black/5">
                  <button
                    onClick={() => setIsVaultUnlocked(false)}
                    className="text-brand-dark/40 hover:text-brand-dark font-bold text-sm flex items-center gap-2 transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                    Lock Vault
                  </button>
                </div>
              </div>
            )}

            {/* Add Debt Modal */}
            <AnimatePresence>
              {showAddDebt && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowAddDebt(false)}
                    className="absolute inset-0 bg-brand-dark/40 backdrop-blur-md"
                  />
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative bg-white p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl border border-black/5"
                  >
                    <h3 className="text-2xl font-black text-brand-dark mb-6 tracking-tight">New Debt Record</h3>
                    <form onSubmit={handleAddDebt} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Person's Name</label>
                        <input
                          type="text"
                          required
                          value={newDebt.personName}
                          onChange={(e) => setNewDebt({ ...newDebt, personName: e.target.value })}
                          className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/20"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Amount ($)</label>
                        <input
                          type="number"
                          required
                          value={newDebt.amount}
                          onChange={(e) => setNewDebt({ ...newDebt, amount: e.target.value })}
                          className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/20"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Description</label>
                        <input
                          type="text"
                          value={newDebt.description}
                          onChange={(e) => setNewDebt({ ...newDebt, description: e.target.value })}
                          placeholder="e.g. Lunch, Movie tickets"
                          className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/20"
                        />
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowAddDebt(false)}
                          className="flex-1 py-4 font-bold text-brand-dark/60 hover:bg-brand-bg rounded-2xl transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-4 bg-brand-primary text-white font-black rounded-2xl shadow-xl shadow-brand-primary/20 hover:bg-brand-dark transition-all"
                        >
                          Add Record
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
