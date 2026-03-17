import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, Timestamp, orderBy } from 'firebase/firestore';
import { WishlistItem } from '../types';
import { Plus, Trash2, PiggyBank, Target, TrendingUp, PartyPopper, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

export default function Wishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState<WishlistItem | null>(null);
  const [showCongratsModal, setShowCongratsModal] = useState<WishlistItem | null>(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [saveAmount, setSaveAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const brandColors = ['#427A76', '#F9B487', '#174143', '#F5E5E1'];

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100, colors: brandColors };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'wishlist'),
      where('uid', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const wishlistData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WishlistItem[];
      
      // Sort client-side by createdAt desc
      wishlistData.sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() || 0;
        const dateB = b.createdAt?.toMillis?.() || 0;
        return dateB - dateA;
      });

      setItems(wishlistData);
      setError(null);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'wishlist');
      setError('Failed to load wishlist. Please try again.');
    });

    return () => unsubscribe();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const amount = parseFloat(targetAmount);
    if (isNaN(amount) || amount <= 0) {
      console.error('Invalid target amount');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'wishlist'), {
        name,
        targetAmount: amount,
        savedAmount: 0,
        uid: auth.currentUser.uid,
        createdAt: Timestamp.now()
      });
      setName('');
      setTargetAmount('');
      setShowAddModal(false);
      setError(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'wishlist');
      setError('Failed to add item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSaveModal) return;

    const amountToAdd = parseFloat(saveAmount);
    if (isNaN(amountToAdd) || amountToAdd <= 0) return;

    setLoading(true);
    try {
      const newSavedAmount = showSaveModal.savedAmount + amountToAdd;
      await updateDoc(doc(db, 'wishlist', showSaveModal.id), {
        savedAmount: newSavedAmount
      });

      // Check if goal reached
      if (newSavedAmount >= showSaveModal.targetAmount && showSaveModal.savedAmount < showSaveModal.targetAmount) {
        setShowCongratsModal({ ...showSaveModal, savedAmount: newSavedAmount });
        triggerConfetti();
      }

      setSaveAmount('');
      setShowSaveModal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `wishlist/${showSaveModal.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'wishlist', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `wishlist/${id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-brand-dark tracking-tight">Your Wishlist</h2>
          <p className="text-brand-dark/50 font-medium">Save up for the things you love</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand-primary/20"
        >
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {error && (
          <div className="col-span-full p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-bold">
            {error}
          </div>
        )}
        {items.map((item) => {
          const progress = Math.min((item.savedAmount / item.targetAmount) * 100, 100);
          return (
            <motion.div
              layout
              key={item.id}
              className="bg-white p-6 rounded-[2rem] border border-black/5 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-brand-bg rounded-2xl">
                  <Target className="w-6 h-6 text-brand-primary" />
                </div>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-xl font-black text-brand-dark mb-1">{item.name}</h3>
              <div className="flex justify-between text-xs font-bold text-brand-dark/40 uppercase tracking-widest mb-4">
                <span>Saved: ₹{item.savedAmount.toLocaleString()}</span>
                <span>Target: ₹{item.targetAmount.toLocaleString()}</span>
              </div>

              <div className="h-3 bg-brand-bg rounded-full overflow-hidden mb-6">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-brand-primary"
                />
              </div>

              <button
                onClick={() => setShowSaveModal(item)}
                className="w-full py-3 bg-brand-bg text-brand-dark font-bold rounded-xl hover:bg-brand-accent/20 transition-all flex items-center justify-center gap-2"
              >
                <PiggyBank className="w-5 h-5" />
                Add Savings
              </button>
            </motion.div>
          );
        })}
        {items.length === 0 && (
          <div className="col-span-full py-20 text-center bg-brand-bg/20 rounded-[2rem] border-2 border-dashed border-brand-accent/20">
            <PiggyBank className="w-12 h-12 text-brand-dark/20 mx-auto mb-4" />
            <p className="text-brand-dark/40 font-black italic">Your wishlist is empty. What's your next goal?</p>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
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
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl border border-black/5"
            >
              <h3 className="text-2xl font-black text-brand-dark mb-6 tracking-tight">New Wishlist Item</h3>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. New Laptop"
                    className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Target Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="₹0.00"
                    className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-4 px-6 rounded-2xl font-black text-brand-dark/60 hover:bg-brand-bg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 px-6 rounded-2xl font-black bg-brand-primary text-white hover:bg-brand-dark shadow-lg shadow-brand-primary/20 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Item'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Save Money Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveModal(null)}
              className="absolute inset-0 bg-brand-dark/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl border border-black/5"
            >
              <h3 className="text-2xl font-black text-brand-dark mb-2 tracking-tight">Add Savings</h3>
              <p className="text-brand-dark/50 font-medium mb-6">How much have you saved for {showSaveModal.name}?</p>
              <form onSubmit={handleSaveMoney} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={saveAmount}
                    onChange={(e) => setSaveAmount(e.target.value)}
                    placeholder="₹0.00"
                    className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowSaveModal(null)}
                    className="flex-1 py-4 px-6 rounded-2xl font-black text-brand-dark/60 hover:bg-brand-bg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 px-6 rounded-2xl font-black bg-brand-primary text-white hover:bg-brand-dark shadow-lg shadow-brand-primary/20 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Save Money'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Congrats Modal */}
      <AnimatePresence>
        {showCongratsModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCongratsModal(null)}
              className="absolute inset-0 bg-brand-dark/60 backdrop-blur-xl"
            />
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
              className="relative bg-white p-10 rounded-[3rem] max-w-md w-full shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-white/20 text-center overflow-hidden"
            >
              {/* Decorative background elements */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-primary/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-brand-accent/10 rounded-full blur-3xl" />

              <div className="relative">
                <div className="w-24 h-24 bg-brand-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 animate-bounce">
                  <PartyPopper className="w-12 h-12 text-brand-primary" />
                </div>

                <h2 className="text-4xl font-black text-brand-dark mb-4 tracking-tight leading-tight">
                  Goal Reached!
                </h2>
                
                <p className="text-brand-dark/60 font-medium text-lg mb-8 leading-relaxed">
                  Congratulations! You've successfully saved <span className="text-brand-primary font-black">₹{showCongratsModal.targetAmount.toLocaleString()}</span> for <span className="text-brand-dark font-black">{showCongratsModal.name}</span>.
                </p>

                <div className="bg-brand-bg/50 p-6 rounded-3xl mb-8 border border-brand-accent/10">
                  <div className="flex items-center justify-center gap-2 text-brand-primary mb-1">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-widest">Achievement Unlocked</span>
                  </div>
                  <p className="text-brand-dark font-bold">100% Saved</p>
                </div>

                <button
                  onClick={() => setShowCongratsModal(null)}
                  className="w-full py-5 bg-brand-primary text-white rounded-2xl font-black hover:bg-brand-dark shadow-xl shadow-brand-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  Awesome!
                </button>
              </div>

              <button 
                onClick={() => setShowCongratsModal(null)}
                className="absolute top-6 right-6 p-2 text-brand-dark/20 hover:text-brand-dark/40 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
