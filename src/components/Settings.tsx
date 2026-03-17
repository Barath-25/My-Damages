import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc, addDoc, deleteDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { UserProfile, MonthlyBudget } from '../types';
import SpendingHistory from './SpendingHistory';
import { User, Shield, Wallet, Save, CheckCircle, AlertCircle, History, Eye, EyeOff, Plus, Trash2, Check, Lock, QrCode, X, HandCoins } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Settings() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [budget, setBudget] = useState<number>(0);
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [upiId, setUpiId] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');
  const [showQrModal, setShowQrModal] = useState(false);
  
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;

      // Fetch Profile
      try {
        const profileDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (profileDoc.exists()) {
          const data = profileDoc.data() as UserProfile;
          setProfile(data);
          setDisplayName(data.displayName);
          setPhotoURL(data.photoURL || '');
          setPin(data.securityPin || '');
          setUpiId(data.upiId || '');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser.uid}`);
      }

      // Fetch Budget
      try {
        const budgetQuery = query(
          collection(db, 'budgets'),
          where('uid', '==', auth.currentUser.uid),
          where('month', '==', currentMonth)
        );
        const budgetSnapshot = await getDocs(budgetQuery);
        if (!budgetSnapshot.empty) {
          setBudget(budgetSnapshot.docs[0].data().amount);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'budgets');
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
        upiId: upiId || null,
        securityPin: pin || null
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
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
    const budgetId = `${auth.currentUser.uid}_${currentMonth}`;
    try {
      await setDoc(doc(db, 'budgets', budgetId), {
        month: currentMonth,
        amount: budget,
        uid: auth.currentUser.uid
      });
      setMessage({ type: 'success', text: 'Monthly budget updated!' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `budgets/${budgetId}`);
      setMessage({ type: 'error', text: 'Failed to update budget.' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const qrUrl = upiId ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${upiId}&pn=${displayName}` : '';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQrModal(false)}
              className="absolute inset-0 bg-brand-dark/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-sm p-8 rounded-[2.5rem] border border-black/5 shadow-2xl text-center"
            >
              <button 
                onClick={() => setShowQrModal(false)}
                className="absolute top-6 right-6 p-2 hover:bg-brand-bg rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-brand-dark" />
              </button>
              
              <div className="mb-6">
                <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-8 h-8 text-brand-primary" />
                </div>
                <h3 className="text-xl font-black text-brand-dark">My UPI QR</h3>
                <p className="text-sm text-brand-dark/50 font-bold uppercase tracking-widest">{upiId}</p>
              </div>

              <div className="bg-brand-bg/30 p-4 rounded-3xl mb-6 aspect-square flex items-center justify-center border border-brand-accent/10">
                {qrUrl ? (
                  <img src={qrUrl} alt="UPI QR Code" className="w-full h-full rounded-2xl" />
                ) : (
                  <p className="text-brand-dark/40 font-bold">No UPI ID set</p>
                )}
              </div>

              <p className="text-xs text-brand-dark/40 font-medium px-4">
                Scan this QR code using any UPI app (GPay, PhonePe, Paytm) to make a payment.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div>
        <h2 className="text-3xl font-black text-brand-dark tracking-tight">Settings</h2>
        <p className="text-brand-dark/50 font-medium">Manage your profile, security, and budget</p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-brand-bg rounded-2xl w-full max-w-sm">
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
                  <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">UPI ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="yourname@upi"
                      className="flex-1 px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="p-3 bg-brand-bg hover:bg-brand-accent/10 rounded-xl transition-all border border-brand-accent/20 text-brand-primary"
                      title="View QR"
                    >
                      <QrCode className="w-6 h-6" />
                    </button>
                  </div>
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-dark shadow-lg shadow-brand-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>

                <div className="pt-6 border-t border-black/5">
                  <p className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-widest mb-3">Advanced Features</p>
                  <button
                    type="button"
                    onClick={() => {
                      // We need to access setCurrentView from App.tsx
                      // Since Settings is a child, we can pass it as a prop or use a custom event
                      window.dispatchEvent(new CustomEvent('changeView', { detail: 'debts' }));
                    }}
                    className="w-full py-4 bg-brand-bg text-brand-dark rounded-2xl font-bold hover:bg-brand-accent/10 transition-all flex items-center justify-center gap-2 border border-brand-accent/20"
                  >
                    <HandCoins className="w-5 h-5" />
                    People Owe Me
                  </button>
                </div>
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
                  <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Monthly Allowance (₹)</label>
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
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <SpendingHistory />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
